import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { getChosung, normalizeChosungQuery } from "@/lib/utils/chosung";
import { headers } from "next/headers";
import { checkOpenAIRateLimit } from "@/lib/utils/openai-rate-limit";

interface ProductScore {
  foodCode: string;
  foodName: string;
  manufacturer?: string;
  allergens: string[];
  hasAllergen: boolean;
  score: number;
  matchReason: string;
  dataSource: "db" | "openapi" | "ai" | "openfood";
  ingredients?: string[];
  detectedIngredients?: string[];
  weight?: string;
  rawMaterials?: string;
}
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error(`API 타임아웃 (${timeoutMs}ms): ${url}`);
    } else {
      console.error("API 오류:", error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const rawPhase = searchParams.get("phase");
    const phase = rawPhase === "1" || rawPhase === "full" ? rawPhase : "full";
    const serviceKey = process.env.FOOD_API_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        {
          success: false,
          error: "서버 설정 오류입니다. 관리자에게 문의해주세요.",
        },
        { status: 500 },
      );
    }
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

    // ✅ OpenAI 비용 통제 (phase=1은 DB만 조회하므로 스킵)
    if (phase !== "1") {
      const rateCheck = checkOpenAIRateLimit("food-search");
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
          { status: 429 },
        );
      }
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, items: [], totalCount: 0 });
    }

    const supabase = await createClient();
    const normalizedQuery = query.toLowerCase().trim();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ✅ IP 주소 및 User-Agent 가져오기
    const headersList = await headers();

    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";

    const userAgent = headersList.get("user-agent") || "unknown";

    if (process.env.NODE_ENV === "development") {
      console.log("[dev] IP:", ipAddress, "UA:", userAgent);
    }

    // ==========================================
    // Rate Limiting (phase=1 제외 - DB만 조회라 비용 없음)
    // ==========================================
    if (phase !== "1") {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 60 * 1000); // 1분 슬라이딩 윈도우

      let identifier: string;
      let minuteLimit: number;
      let dailyLimit: number;

      if (user) {
        // 로그인 사용자: 분당 30회, 하루 500회
        identifier = `user:${user.id}`;
        minuteLimit = 30;
        dailyLimit = 500;
      } else {
        // 비로그인: IP 기반, 분당 10회, 하루 50회
        identifier = `ip:${ipAddress}`;
        minuteLimit = 10;
        dailyLimit = 50;
      }

      // ── 1분 내 요청 수 체크 ──
      const { count: minuteCount } = await supabase
        .from("search_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("identifier", identifier)
        .gte("searched_at", windowStart.toISOString());

      if ((minuteCount || 0) >= minuteLimit) {
        return NextResponse.json(
          {
            success: false,
            error: user
              ? `검색이 너무 빠릅니다. 잠시 후 다시 시도해주세요. (분당 ${minuteLimit}회 제한)`
              : `검색이 너무 빠릅니다. 잠시 후 다시 시도해주세요. (분당 ${minuteLimit}회 제한)\n로그인하시면 더 많이 검색할 수 있어요.`,
            rateLimited: true,
          },
          {
            status: 429,
            headers: {
              "Retry-After": "60",
              "X-RateLimit-Limit": String(minuteLimit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(now.getTime() / 1000) + 60),
            },
          },
        );
      }

      // ── 하루 요청 수 체크 ──
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const { count: dailyCount } = await supabase
        .from("search_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("identifier", identifier)
        .gte("searched_at", todayStart.toISOString());

      if ((dailyCount || 0) >= dailyLimit) {
        return NextResponse.json(
          {
            success: false,
            error: user
              ? `오늘 검색 한도(${dailyLimit}회)를 초과했습니다. 내일 다시 이용해주세요.`
              : `오늘 무료 검색 한도(${dailyLimit}회)를 초과했습니다. 로그인하시면 더 많이 검색할 수 있어요.`,
            rateLimited: true,
          },
          { status: 429, headers: { "Retry-After": "86400" } },
        );
      }

      // ── 요청 기록 저장 (비동기, 응답 대기 안 함) ──
      supabase
        .from("search_rate_limits")
        .insert({ identifier, searched_at: now.toISOString() })
        .then(({ error }) => {
          if (error) console.error("❌ rate limit 기록 실패:", error);
        });
    }
    // 사용자 알레르기 정보
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
    if (phase === "1") {
      try {
        const isChosungQuery = /^[ㄱ-ㅎ\s]+$/.test(query);
        let dbItems: any[] = [];

        if (isChosungQuery) {
          const normalizedChosung = normalizeChosungQuery(query);
          const { data } = await supabase
            .from("food_search_cache")
            .select("*")
            .ilike("chosung", `%${normalizedChosung}%`)
            .limit(30);
          dbItems = data || [];
        } else {
          const { data } = await supabase
            .from("food_search_cache")
            .select("*")
            .or(
              `food_name.ilike.%${normalizedQuery}%,raw_materials.ilike.%${normalizedQuery}%`,
            )
            .limit(30);
          dbItems = data || [];
        }

        const items = dbItems.map((item: any) => {
          const hasAllergen = (item.allergens || []).some((a: string) =>
            userAllergens.some(
              (ua: string) => a.includes(ua) || ua.includes(a),
            ),
          );
          return {
            foodCode: item.food_code,
            foodName: item.food_name,
            manufacturer: item.manufacturer || "",
            allergens: item.allergens || [],
            hasAllergen,
            score: 200,
            matchReason: "제품명",
            dataSource: "db",
            rawMaterials: item.raw_materials || "",
            weight: item.weight || "",
          };
        });

        return NextResponse.json({
          success: true,
          items,
          totalCount: items.length,
          hasMore: true, // 외부 API 결과 더 있을 수 있음을 알림
        });
      } catch {
        return NextResponse.json({ success: true, items: [], hasMore: true });
      }
    }
    // ==========================================
    // 1단계: DB + OpenAPI + OpenFoodFacts 병렬 실행
    // ==========================================
    const [dbItems, openApiItems, openFoodItems] = await Promise.all([
      // ── Source 1: DB 캐시 ──
      (async () => {
        try {
          // 1. 일반 텍스트 검색
          const textQuery = supabase
            .from("food_search_cache")
            .select("*")
            .or(`food_name.ilike.%${query}%,raw_materials.ilike.%${query}%`)
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

          const searchData = await fetchWithTimeout(searchUrl.toString(), {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          });
          let productItems = [];
          if (searchData === null) {
          } else if (Array.isArray(searchData.body?.items)) {
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

                const allergyData = await fetchWithTimeout(
                  allergyUrl.toString(),
                );

                // if (allergyRes.status === 401 ...) 블록 삭제
                // const allergyData = await allergyRes.json() 삭제

                let allergyItems = [];
                if (allergyData === null) {
                  // 타임아웃 or 오류 시 빈 배열로 처리
                } else if (Array.isArray(allergyData.body?.items)) {
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
                  PRDLST_DCNTS: product.PRDLST_DCNTS,
                  QNT: product.QNT,
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
                  PRDLST_DCNTS: product.PRDLST_DCNTS,
                  QNT: product.QNT,
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
      (async () => {
        try {
          const encodedQuery = encodeURIComponent(query);

          const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodedQuery}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,ingredients_text,allergens_tags,code,brands`;

          console.log("🌍 Open Food Facts 검색:", query);
          console.log("🔗 URL:", offUrl);

          const offData = await fetchWithTimeout(offUrl, {
            cache: "no-store",
            headers: {
              "User-Agent": "pyeonharu-allergy-app",
            },
          });

          const products = offData?.products || [];

          console.log(`🌍 Open Food Facts: ${products.length}개 발견`);

          if (products.length === 0) return [];

          console.log(
            "🔍 첫 번째 제품 구조:",
            JSON.stringify(products[0], null, 2),
          );

          // AI로 번역 + 알레르기 추출 (최대 5개)
          const aiPromises = products
            .slice(0, 5)
            .map(async (product: any, index: number) => {
              if (!product.ingredients_text) {
                console.warn(
                  `⚠️ [${index}] ${product.product_name}: 원재료 정보 없음`,
                );
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
      dbItems.length + openApiItems.length + openFoodItems.length;

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
    );

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
      const lowerRaw = (item.raw_materials || "").toLowerCase();

      let matchReason = "제품명";
      let nameScore = 95;

      if (lowerName === lowerQuery) {
        nameScore = 100;
        matchReason = "제품명";
      } else if (lowerName.startsWith(lowerQuery)) {
        nameScore = 95;
        matchReason = "제품명";
      } else if (lowerName.includes(lowerQuery)) {
        nameScore = 90;
        matchReason = "제품명";
      } else if (lowerRaw.includes(lowerQuery)) {
        // ✅ raw_materials 매칭인 경우
        nameScore = 80;
        matchReason = "원재료";
      } else {
        // 초성 매칭
        nameScore = 85;
        matchReason = "초성";
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
        weight: item.PRDLST_DCNTS || item.QNT || "",
      });
    });

    allResults.push(...Array.from(openApiMap.values()));

    // ── 3순위: Open Food Facts (기본 점수 + 120) ──
    openFoodItems.forEach((item: any) => {
      const lowerName = (item.FOOD_NM || "").toLowerCase();
      const lowerQuery = normalizedQuery.toLowerCase();

      // ✅ 이름 매칭 없으면 제외
      if (!lowerName.includes(lowerQuery)) return;

      const hasAllergen = (item.ALLERGENS || []).some((a: string) =>
        userAllergens.some((ua) => a.includes(ua) || ua.includes(a)),
      );
      let offScore = 75;
      if (lowerName.startsWith(lowerQuery)) {
        offScore = 85;
      } else {
        offScore = 80;
      }

      allResults.push({
        foodCode: item.FOOD_CD,
        foodName: item.FOOD_NM,
        manufacturer: item.BSSH_NM || "",
        allergens: item.ALLERGENS || [],
        hasAllergen,
        score: offScore + 120,
        matchReason: "수입식품",
        dataSource: "openfood",
        rawMaterials: item.RAWMTRL_NM || "",
      });
    });

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
    // ✅ Open API 결과 → DB 캐시 저장 (NEW!)
    // ==========================================
    const openApiToCache = deduped.filter((r) => r.dataSource === "openapi");
    if (openApiToCache.length > 0) {
      console.log(
        `💾 Open API 결과 ${openApiToCache.length}개 DB 캐시 저장 시작...`,
      );

      supabase
        .from("food_search_cache")
        .upsert(
          openApiToCache.map((item) => ({
            food_code: item.foodCode,
            food_name: item.foodName,
            manufacturer: item.manufacturer || null,
            allergens: item.allergens || [],
            raw_materials: null, // 검색 시점엔 원재료 없음
            weight: item.weight || null,
            data_source: "openapi",
            chosung: getChosung(item.foodName),
            created_at: new Date().toISOString(),
          })),
          { onConflict: "food_code" },
        )
        .then(({ error }) => {
          if (error) {
            console.error("❌ Open API 결과 DB 캐시 저장 실패:", error);
          } else {
            console.log("✅ Open API 결과 DB 캐시 저장 완료");
          }
        });
    }

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
    // 검색 기록 저장
    // ==========================================

    // 데이터 소스별 개수 집계
    const dataSources = {
      db: deduped.filter((r) => r.dataSource === "db").length,
      openapi: deduped.filter((r) => r.dataSource === "openapi").length,
      openfood: deduped.filter((r) => r.dataSource === "openfood").length,
      ai: deduped.filter((r) => r.dataSource === "ai").length,
    };

    // 검색 로그 저장 (비동기, 응답 대기 안 함)
    supabase
      .from("food_search_logs")
      .insert({
        user_id: user?.id || null, // 비로그인 시 null
        search_query: normalizedQuery,
        result_count: deduped.length,
        data_sources: dataSources,
        searched_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .then(({ error }) => {
        if (error) {
          console.error("❌ 검색 로그 저장 실패:", error);
        }
      });
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
