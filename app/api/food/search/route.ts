import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { getChosung, normalizeChosungQuery } from "@/lib/utils/chosung";

interface ProductScore {
  foodCode: string;
  foodName: string;
  manufacturer?: string;
  allergens: string[];
  hasAllergen: boolean;
  score: number;
  matchReason: string;
  dataSource: "db" | "openapi" | "ai" | "openfood"; // ✅ "nutrition" 제거, "openfood" 추가
  ingredients?: string[];
  detectedIngredients?: string[];
  weight?: string;
  rawMaterials?: string;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";
    // ❌ nutritionKey 삭제

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, items: [], totalCount: 0 });
    }

    const supabase = await createClient();
    const normalizedQuery = query.toLowerCase().trim();

    // 사용자 알레르기 정보
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let userAllergens: string[] = [];
    if (user) {
      const { data: allergyData } = await supabase
        .from("user_allergies")
        .select("allergen_name")
        .eq("user_id", user.id);
      if (allergyData) {
        userAllergens = allergyData.map((item) => item.allergen_name);
      }
    }

    // ==========================================
    // 1단계: DB + OpenAPI + OpenFoodFacts 병렬 실행
    // ==========================================
    const [dbItems, openApiItems, openFoodItems] = await Promise.all([
      // ✅ nutritionItems 제거

      // ── Source 1: DB 캐시 ──
      (async () => {
        try {
          // 1. 일반 텍스트 검색
          const textQuery = supabase
            .from("food_search_cache")
            .select("*")
            .or(`food_name.ilike.%${query}%,manufacturer.ilike.%${query}%`)
            .limit(30);

          // 2. 초성 검색 (쿼리에 한글 자음만 있으면)
          const isChosungQuery = /^[ㄱ-ㅎ\s]+$/.test(query);
          let chosungQuery;

          if (isChosungQuery) {
            const normalizedChosung = normalizeChosungQuery(query);
            chosungQuery = supabase
              .from("food_search_cache")
              .select("*")
              .ilike("chosung", `%${normalizedChosung}%`)
              .limit(30);
          }

          // 3. 병렬 실행 후 합치기
          const [textResults, chosungResults] = await Promise.all([
            textQuery.then(({ data }) => data || []),
            isChosungQuery && chosungQuery
              ? chosungQuery.then(({ data }) => data || [])
              : Promise.resolve([]),
          ]);

          // 4. 중복 제거 (food_code 기준)
          const seen = new Set<string>();
          const merged: any[] = [];

          [...textResults, ...chosungResults].forEach((item) => {
            if (!seen.has(item.food_code)) {
              seen.add(item.food_code);
              merged.push(item);
            }
          });

          return merged;
        } catch {
          return [];
        }
      })(),

      // ── Source 2: Open API (푸드QR) ──
      (async () => {
        try {
          const searchUrl = new URL(`${baseUrl}/getFoodQrProdMnfInfo01`);
          searchUrl.searchParams.append("serviceKey", serviceKey);
          searchUrl.searchParams.append("pageNo", "1");
          searchUrl.searchParams.append("numOfRows", "50");
          searchUrl.searchParams.append("type", "json");
          searchUrl.searchParams.append("prdct_nm", query);

          console.log("🔗 푸드QR API 호출:", searchUrl.toString());

          const searchRes = await fetch(searchUrl.toString(), {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          });
          const searchData = await searchRes.json();

          let productItems = [];
          if (Array.isArray(searchData.body?.items)) {
            productItems = searchData.body.items;
          } else if (searchData.body?.items?.item) {
            productItems = Array.isArray(searchData.body.items.item)
              ? searchData.body.items.item
              : [searchData.body.items.item];
          }

          console.log(`📡 푸드QR: ${productItems.length}개 발견`);

          if (productItems.length === 0) return [];

          // 바코드별 알레르기 정보 조회
          const allergyPromises = productItems
            .slice(0, 20)
            .map(async (product: any) => {
              try {
                const allergyUrl = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
                allergyUrl.searchParams.append("serviceKey", serviceKey);
                allergyUrl.searchParams.append("pageNo", "1");
                allergyUrl.searchParams.append("numOfRows", "10");
                allergyUrl.searchParams.append("type", "json");
                allergyUrl.searchParams.append("brcd_no", product.BRCD_NO);

                const allergyRes = await fetch(allergyUrl.toString());

                if (allergyRes.status === 401 || allergyRes.status === 403) {
                  return {
                    BRCD_NO: product.BRCD_NO,
                    PRDCT_NM: product.PRDCT_NM,
                    BUES_NM: product.BUES_NM,
                    ALLERGENS: [],
                  };
                }

                const allergyData = await allergyRes.json();

                let allergyItems = [];
                if (Array.isArray(allergyData.body?.items)) {
                  allergyItems = allergyData.body.items;
                } else if (allergyData.body?.items?.item) {
                  allergyItems = Array.isArray(allergyData.body.items.item)
                    ? allergyData.body.items.item
                    : [allergyData.body.items.item];
                }

                const allergens: string[] = [];
                allergyItems.forEach((item: any) => {
                  if (
                    item.ALG_CSG_MTR_NM &&
                    !allergens.includes(item.ALG_CSG_MTR_NM)
                  ) {
                    allergens.push(item.ALG_CSG_MTR_NM);
                  }
                });

                return {
                  BRCD_NO: product.BRCD_NO,
                  PRDCT_NM: product.PRDCT_NM,
                  BUES_NM: product.BUES_NM,
                  ALLERGENS: allergens,
                };
              } catch (err) {
                console.error(
                  `❌ 알레르기 조회 실패 (${product.BRCD_NO}):`,
                  err,
                );
                return {
                  BRCD_NO: product.BRCD_NO,
                  PRDCT_NM: product.PRDCT_NM,
                  BUES_NM: product.BUES_NM,
                  ALLERGENS: [],
                };
              }
            });

          const results = await Promise.all(allergyPromises);
          return results.filter((r) => r.PRDCT_NM);
        } catch (error) {
          console.error("❌ 푸드QR API 에러:", error);
          return [];
        }
      })(),

      // ── Source 3: Open Food Facts (수입/글로벌 제품) ──
      // ── Source 3: Open Food Facts (수입/글로벌 제품) ──
      (async () => {
        try {
          // ✅ 한글 인코딩 처리
          const encodedQuery = encodeURIComponent(query);

          const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodedQuery}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,ingredients_text,allergens_tags,code,brands`;

          console.log("🌍 Open Food Facts 검색:", query);
          console.log("🔗 URL:", offUrl);

          const res = await fetch(offUrl, {
            cache: "no-store",
            headers: {
              "User-Agent": "pyeonharu-allergy-app",
            },
          });

          if (!res.ok) {
            console.error("❌ Open Food Facts 에러:", res.status);
            return [];
          }

          const data = await res.json();
          const products = data.products || [];

          console.log(`🌍 Open Food Facts: ${products.length}개 발견`);

          if (products.length === 0) return [];

          // ✅ 디버깅: 제품 구조 확인
          console.log(
            "🔍 첫 번째 제품 구조:",
            JSON.stringify(products[0], null, 2),
          );

          // AI로 번역 + 알레르기 추출 (최대 5개)
          const aiPromises = products
            .slice(0, 5)
            .map(async (product: any, index: number) => {
              // ✅ ingredients_text 없으면 스킵하지 말고 로그만
              if (!product.ingredients_text) {
                console.warn(
                  `⚠️ [${index}] ${product.product_name}: 원재료 정보 없음`,
                );
                // ✅ 원재료 없어도 제품은 반환 (번역만)
                return {
                  FOOD_CD: product.code || `off-${Date.now()}-${Math.random()}`,
                  FOOD_NM: product.product_name || "제품명 없음",
                  BSSH_NM: product.brands || "",
                  RAWMTRL_NM: "",
                  ALLERGENS: [],
                  ORIGINAL_NAME: product.product_name,
                };
              }

              try {
                console.log(
                  `🤖 [${index}] AI 번역 시작: ${product.product_name}`,
                );

                const aiResponse = await openai.chat.completions.create({
                  model: "gpt-4o-mini",
                  messages: [
                    {
                      role: "user",
                      content: `다음 식품 정보를 한국어로 번역하고 알레르기 성분을 추출하세요:

**제품명 (영문):** ${product.product_name}
**브랜드:** ${product.brands || "정보없음"}
**원재료 (영문):** ${product.ingredients_text}

**작업:**
1. 제품명을 자연스러운 한국어로 번역
2. 원재료를 한국어로 번역 (쉼표로 구분)
3. 알레르기 유발물질 추출 (한국 식약처 22가지만)

**한국 식약처 알레르기 22가지:**
계란, 우유, 밀, 메밀, 땅콩, 대두, 호두, 잣, 견과류, 갑각류, 새우, 게, 고등어, 오징어, 조개류, 생선, 복숭아, 토마토, 돼지고기, 쇠고기, 닭고기, 아황산류

**JSON 형식으로만 반환:**
{
  "productNameKr": "한글 제품명",
  "ingredientsKr": "한글 원재료 (쉼표로 구분)",
  "allergens": ["알레르기1", "알레르기2"]
}

**예시:**
제품명: "Nutella Hazelnut Spread"
→ {"productNameKr": "누텔라 헤이즐넛 스프레드", "ingredientsKr": "설탕, 팜유, 헤이즐넛, 코코아, 탈지분유", "allergens": ["견과류", "우유"]}`,
                    },
                  ],
                  max_tokens: 500,
                });

                const aiText = aiResponse.choices[0].message.content || "{}";
                const clean = aiText.replace(/```json|```/g, "").trim();
                const parsed = JSON.parse(clean);

                const productNameKr =
                  parsed.productNameKr || product.product_name;
                const ingredientsKr =
                  parsed.ingredientsKr || product.ingredients_text;

                console.log(`✅ [${index}] 번역 완료: ${productNameKr}`);

                return {
                  FOOD_CD: product.code || `off-${Date.now()}-${Math.random()}`,
                  FOOD_NM: productNameKr,
                  BSSH_NM: product.brands || "",
                  RAWMTRL_NM: ingredientsKr,
                  ALLERGENS: parsed.allergens || [],
                  ORIGINAL_NAME: product.product_name,
                };
              } catch (err) {
                console.error(`❌ [${index}] AI 번역/분석 실패:`, err);
                // ✅ 실패 시 원문으로라도 반환
                return {
                  FOOD_CD: product.code || `off-${Date.now()}-${Math.random()}`,
                  FOOD_NM: product.product_name,
                  BSSH_NM: product.brands || "",
                  RAWMTRL_NM: product.ingredients_text || "",
                  ALLERGENS: [],
                };
              }
            });

          const results = await Promise.all(aiPromises);
          const validResults = results.filter(Boolean);

          console.log(
            `✅ Open Food Facts 번역/분석 완료: ${validResults.length}개`,
          );

          return validResults;
        } catch (error) {
          console.error("❌ Open Food Facts 전체 오류:", error);
          return [];
        }
      })(),
    ]);

    // ==========================================
    // 2단계: 결과 부족 시 AI 호출
    // ==========================================
    let aiItems: any[] = [];
    const totalResults =
      dbItems.length + openApiItems.length + openFoodItems.length; // ✅ nutritionItems 제거

    if (totalResults === 0) {
      console.log("🤖 결과 부족, AI 호출 시작...");
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `한국에서 실제로 판매되는 식품 중 "${query}"와 관련된 제품 15개를 찾아주세요.

**중요 규칙:**
1. 제품명은 반드시 한국어로만 작성하세요
2. 실제 존재하는 제품만 알려주세요 (임의로 만들지 마세요)
3. 외국어, 아랍어, 영어 등 한국어가 아닌 언어는 절대 사용하지 마세요
4. 제품명에 특수문자나 이모지를 넣지 마세요

**올바른 예시:**
✅ "오리온 초코파이"
✅ "롯데 칸쵸"
✅ "농심 새우깡"
✅ "빙그레 바나나맛우유"

**잘못된 예시:**
❌ "오리온 سودا" (아랍어 포함)
❌ "Orion Chips" (영어)
❌ "초코파이🍫" (이모지)

JSON 배열 형식으로만 반환:
[
  {
    "foodName": "실제 제품명 (한국어만)",
    "manufacturer": "제조사 (예: 오리온, 롯데제과)",
    "allergens": ["알레르기 유발물질"],
    "ingredients": ["주요 원재료 3~5개"],
    "category": "과자|음료|유제품|빵|면류|소스|식재료|기타",
    "weight": "용량 (예: 120g)" 
  }
]

**알레르기 유발물질 (한국 식약처 지정 22가지만 사용):**
계란, 우유, 밀, 메밀, 땅콩, 대두, 호두, 잣, 견과류, 갑각류, 새우, 게, 고등어, 오징어, 조개류, 생선, 복숭아, 토마토, 돼지고기, 쇠고기, 닭고기, 아황산류

**실제 제품 예시:**
"초코파이" 검색 시:
- "오리온 초코파이" (⭕)
- "롯데 몽쉘" (⭕)
- "크라운 초코하임" (⭕)

다시 한번 강조: 제품명은 100% 한국어로만 작성하세요!`,
            },
          ],
          max_tokens: 2000,
        });

        const aiText = aiResponse.choices[0].message.content || "[]";
        const clean = aiText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        aiItems = JSON.parse(clean);

        // 한국어가 아닌 제품명 필터링
        aiItems = aiItems.filter((item: any) => {
          if (!item.foodName) return false;

          const nonKoreanPattern =
            /[\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3400-\u4DBF]/;

          if (nonKoreanPattern.test(item.foodName)) {
            console.warn("⚠️ 비한국어 제품명 제외:", item.foodName);
            return false;
          }

          const emojiPattern = /[\u{1F300}-\u{1F9FF}]/u;
          if (emojiPattern.test(item.foodName)) {
            console.warn("⚠️ 이모지 포함 제품명 제외:", item.foodName);
            return false;
          }

          return true;
        });
        console.log(`✅ AI 결과: ${aiItems.length}개 추가`);
      } catch (e) {
        console.error("❌ AI 분석 실패:", e);
        aiItems = [];
      }
    } else {
      console.log("✅ 충분한 결과 있음 (AI 호출 스킵)");
    }

    console.log(
      `📊 최종 검색 결과 - DB: ${dbItems.length}, 푸드QR: ${openApiItems.length}, OpenFood: ${openFoodItems.length}, AI: ${aiItems.length}`,
    ); // ✅ 로그 수정

    // ==========================================
    // 통합 결과 생성 (우선순위 점수 포함)
    // ==========================================
    const allResults: ProductScore[] = [];

    // ── 1순위: DB 캐시 (기본 점수 + 200) ──
    dbItems.forEach((item: any) => {
      const hasAllergen = (item.allergens || []).some((a: string) =>
        userAllergens.some((ua) => a.includes(ua) || ua.includes(a)),
      );
      const lowerName = item.food_name.toLowerCase();
      const lowerQuery = normalizedQuery.toLowerCase();

      let matchReason = "제품명";
      let nameScore = 95;

      if (lowerName === lowerQuery) {
        nameScore = 100;
      } else if (lowerName.startsWith(lowerQuery)) {
        nameScore = 95;
      } else if (lowerName.includes(lowerQuery)) {
        nameScore = 90;
      } else {
        matchReason = "초성";
        nameScore = 85;
      }

      allResults.push({
        foodCode: item.food_code,
        foodName: item.food_name,
        manufacturer: item.manufacturer || "",
        allergens: item.allergens || [],
        hasAllergen,
        score: nameScore + 200,
        matchReason,
        dataSource: "db",
        rawMaterials: item.raw_materials || "",
        weight: item.weight || "",
      });
    });

    // ── 2순위: Open API (푸드QR - 기본 점수 + 100) ──
    const openApiMap = new Map<string, ProductScore>();

    openApiItems.forEach((item: any, index: number) => {
      const foodCode = item.BRCD_NO || `openapi-${index}`;
      const foodName = item.PRDCT_NM;
      const manufacturer = item.BUES_NM || "";
      const allergens = item.ALLERGENS || [];

      if (!foodName) return;

      const lowerName = foodName.toLowerCase();
      const lowerQuery = normalizedQuery.toLowerCase();

      const hasNameMatch = lowerName.includes(lowerQuery);
      const hasAllergyMatch = allergens.some((a: string) =>
        a.toLowerCase().includes(lowerQuery),
      );

      if (!hasNameMatch && !hasAllergyMatch) {
        return;
      }

      let score = 0;
      let matchReason = "제품명";
      if (hasNameMatch) {
        if (lowerName === lowerQuery) score = 100;
        else if (lowerName.startsWith(lowerQuery)) score = 90;
        else score = 80;
        matchReason = "제품명";
      } else {
        score = 70;
        matchReason = "성분표";
      }

      const hasUserAllergen = allergens.some((a: string) =>
        userAllergens.some((ua) => a.includes(ua) || ua.includes(a)),
      );

      openApiMap.set(foodCode, {
        foodCode,
        foodName,
        manufacturer,
        allergens,
        hasAllergen: hasUserAllergen,
        score: score + 100,
        matchReason,
        dataSource: "openapi",
      });
    });

    allResults.push(...Array.from(openApiMap.values()));

    // ── 3순위: Open Food Facts (기본 점수 + 120) ──
    openFoodItems.forEach((item: any) => {
      const hasAllergen = (item.ALLERGENS || []).some((a: string) =>
        userAllergens.some((ua) => a.includes(ua) || ua.includes(a)),
      );

      const lowerName = (item.FOOD_NM || "").toLowerCase();
      const lowerQuery = normalizedQuery.toLowerCase();

      let offScore = 75;
      if (lowerName.includes(lowerQuery)) {
        offScore = lowerName.startsWith(lowerQuery) ? 85 : 80;
      }

      allResults.push({
        foodCode: item.FOOD_CD,
        foodName: item.FOOD_NM,
        manufacturer: item.BSSH_NM || "",
        allergens: item.ALLERGENS || [],
        hasAllergen,
        score: offScore + 120,
        matchReason: "수입식품",
        dataSource: "openfood", // ✅ 변경
        rawMaterials: item.RAWMTRL_NM || "",
      });
    });

    // ❌ nutritionItems 통합 로직 삭제

    // ── 4순위: AI 결과 (기본 점수 60) ──
    if (Array.isArray(aiItems)) {
      aiItems.forEach((item: any, index: number) => {
        if (!item.foodName) return;

        const aiCode = `ai-${Buffer.from(item.foodName).toString("base64url").slice(0, 20)}-${index}`;
        const hasAllergen = (item.allergens || []).some((a: string) =>
          userAllergens.some((ua) => a.includes(ua) || ua.includes(a)),
        );

        allResults.push({
          foodCode: aiCode,
          foodName: item.foodName,
          manufacturer: item.manufacturer || "",
          allergens: item.allergens || [],
          hasAllergen,
          score: 60,
          matchReason: item.category || "AI 생성",
          dataSource: "ai",
          ingredients: item.ingredients || [],
        });
      });
    }

    // ==========================================
    // 중복 제거
    // ==========================================
    const deduped: ProductScore[] = [];
    const seenCodes = new Set<string>();

    allResults.sort((a, b) => b.score - a.score);

    allResults.forEach((item) => {
      if (!seenCodes.has(item.foodCode)) {
        seenCodes.add(item.foodCode);
        deduped.push(item);
      }
    });

    console.log(
      `✅ 중복 제거 완료: ${allResults.length}개 → ${deduped.length}개`,
    );

    // ==========================================
    // AI 결과 → DB 캐시 저장
    // ==========================================
    const aiToCache = deduped.filter((r) => r.dataSource === "ai");
    if (aiToCache.length > 0) {
      console.log(`💾 AI 결과 ${aiToCache.length}개 DB 캐시 저장 시작...`);

      supabase
        .from("food_search_cache")
        .upsert(
          aiToCache.map((item) => {
            const rawMaterials =
              item.rawMaterials ||
              item.ingredients?.join(", ") ||
              item.detectedIngredients?.join(", ") ||
              "";

            return {
              food_code: item.foodCode,
              food_name: item.foodName,
              manufacturer: item.manufacturer || null,
              allergens: item.allergens || [],
              raw_materials: rawMaterials || null,
              weight: item.weight || null,
              data_source: "ai",
              chosung: getChosung(item.foodName),
              created_at: new Date().toISOString(),
            };
          }),
          { onConflict: "food_code" },
        )
        .then(({ error }) => {
          if (error) {
            console.error("❌ AI 결과 DB 캐시 저장 실패:", error);
          } else {
            console.log("✅ AI 결과 DB 캐시 저장 완료");
          }
        });
    }
    // ==========================================
    // Open Food Facts 결과 → DB 캐시 저장
    // ==========================================
    const openFoodToCache = deduped.filter((r) => r.dataSource === "openfood");
    if (openFoodToCache.length > 0) {
      console.log(
        `💾 OpenFood 결과 ${openFoodToCache.length}개 DB 캐시 저장 시작...`,
      );

      supabase
        .from("food_search_cache")
        .upsert(
          openFoodToCache.map((item) => ({
            food_code: item.foodCode,
            food_name: item.foodName,
            manufacturer: item.manufacturer || null,
            allergens: item.allergens || [],
            raw_materials: item.rawMaterials || null,
            weight: null,
            data_source: "openfood",
            chosung: getChosung(item.foodName),
            created_at: new Date().toISOString(),
          })),
          { onConflict: "food_code" },
        )
        .then(({ error }) => {
          if (error) {
            console.error("❌ OpenFood 결과 DB 캐시 저장 실패:", error);
          } else {
            console.log("✅ OpenFood 결과 DB 캐시 저장 완료");
          }
        });
    }
    // ==========================================
    // 반환
    // ==========================================
    return NextResponse.json({
      success: true,
      items: deduped,
      totalCount: deduped.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "검색 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
