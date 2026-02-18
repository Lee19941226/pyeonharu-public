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
  dataSource: "db" | "openapi" | "ai";
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
    // 1단계: DB + OpenAPI 병렬 실행
    // ==========================================
    const [dbItems, openApiItems] = await Promise.all([
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

      // ── Source 2: Open API (알레르기 정보) ──
      (async () => {
        try {
          const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
          url.searchParams.append("serviceKey", serviceKey);
          url.searchParams.append("pageNo", "1");
          url.searchParams.append("numOfRows", "100");
          url.searchParams.append("type", "json");
          url.searchParams.append("prdct_nm", query);

          const res = await fetch(url.toString());
          const data = await res.json();
          return data.body?.items || [];
        } catch {
          return [];
        }
      })(),
    ]);

    console.log(
      `📊 1차 검색 결과 - DB: ${dbItems.length}, OpenAPI: ${openApiItems.length}`,
    );

    // ==========================================
    // 2단계: 결과 부족 시 AI 호출 (5개 미만일 때만)
    // ==========================================
    let aiItems: any[] = [];
    const totalResults = dbItems.length + openApiItems.length;

    if (totalResults < 5) {
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
NOT "초코파이 A", "초코파이 B" (❌)

"우유" 검색 시:
- "서울우유" (⭕)
- "빙그레 바나나맛우유" (⭕)
- "매일유업 상하목장 유기농우유" (⭕)

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
        let aiItems = JSON.parse(clean);
        // ✅ 한국어가 아닌 제품명 필터링
        aiItems = aiItems.filter((item: any) => {
          if (!item.foodName) return false;

          // 아랍어, 히브리어, 중국어 간체/번체 등 비한글/비영어 문자 체크
          const nonKoreanPattern =
            /[\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3400-\u4DBF]/;

          if (nonKoreanPattern.test(item.foodName)) {
            console.warn("⚠️ 비한국어 제품명 제외:", item.foodName);
            return false;
          }

          // 이모지 체크
          const emojiPattern = /[\u{1F300}-\u{1F9FF}]/u;
          if (emojiPattern.test(item.foodName)) {
            console.warn("⚠️ 이모지 포함 제품명 제외:", item.foodName);
            return false;
          }

          return true;
        });
        console.log(`✅ AI 결과 : ${aiItems.length}개 추가`);
      } catch (e) {
        console.error("❌ AI 분석 실패:", e);
        aiItems = [];
      }
    } else {
      console.log("✅ 충분한 결과 있음 (AI 호출 스킵)");
    }

    console.log(
      `📊 최종 검색 결과 - DB: ${dbItems.length}, OpenAPI: ${openApiItems.length}, AI: ${aiItems.length}`,
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
      const nameScore = item.food_name.toLowerCase().startsWith(normalizedQuery)
        ? 95
        : 85;

      allResults.push({
        foodCode: item.food_code,
        foodName: item.food_name,
        manufacturer: item.manufacturer || "",
        allergens: item.allergens || [],
        hasAllergen,
        score: nameScore + 200,
        matchReason: "DB",
        dataSource: "db",
        rawMaterials: item.raw_materials || "",
        weight: item.weight || "",
      });
    });

    // ── 2순위: Open API (기본 점수 + 100) ──
    const openApiMap = new Map<string, ProductScore>();

    openApiItems.forEach((item: any) => {
      const foodCode = item.BRCD_NO;
      const foodName = item.PRDCT_NM;
      const allergen = item.ALG_CSG_MTR_NM;
      if (!foodCode || !foodName) return;

      const lowerName = foodName.toLowerCase();
      let score = 0;

      if (lowerName === normalizedQuery) score = 100;
      else if (lowerName.startsWith(normalizedQuery)) score = 90;
      else if (lowerName.includes(normalizedQuery)) score = 80;
      else if (allergen?.toLowerCase().includes(normalizedQuery)) score = 70;

      if (score < 70) return;

      if (!openApiMap.has(foodCode)) {
        openApiMap.set(foodCode, {
          foodCode,
          foodName,
          allergens: [],
          hasAllergen: false,
          score: score + 100, // OpenAPI 우선
          matchReason: "식약처",
          dataSource: "openapi",
        });
      }

      const product = openApiMap.get(foodCode)!;
      if (allergen && !product.allergens.includes(allergen)) {
        product.allergens.push(allergen);
        if (
          userAllergens.some(
            (ua) => allergen.includes(ua) || ua.includes(allergen),
          )
        ) {
          product.hasAllergen = true;
        }
      }
    });

    allResults.push(...Array.from(openApiMap.values()));

    // ── 3순위: AI 결과 (기본 점수 60) ──
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
          matchReason: `AI (${item.category || "식품"})`,
          dataSource: "ai",
          ingredients: item.ingredients || [],
        });
      });
    }

    // ==========================================
    // 중복 제거 (이름 유사도 기준)
    // ==========================================
    const deduped: ProductScore[] = [];
    const seenCodes = new Set<string>();

    // 점수 높은 순 정렬 (DB > OpenAPI > AI)
    allResults.sort((a, b) => b.score - a.score);
    console.log("🔍 중복 제거 시작 - 총", allResults.length, "개");
    allResults.forEach((item, index) => {
      // ✅ foodCode가 이미 있으면 스킵
      if (seenCodes.has(item.foodCode)) {
        console.log("⚠️ 중복 제거:", item.foodName, item.foodCode);
        return;
      }

      // ✅ 새로운 항목만 추가
      seenCodes.add(item.foodCode);
      deduped.push(item);
      console.log(
        `  ✅ [${index}] 추가: ${item.foodName} (${item.foodCode}) [${item.dataSource}]`,
      );
    });

    console.log(
      `✅ 중복 제거 완료: ${allResults.length}개 → ${deduped.length}개`,
    );

    // ==========================================
    // AI 결과 중 신규 → DB 캐시 저장 (비동기)
    // ==========================================
    const aiToCache = deduped.filter((r) => r.dataSource === "ai");
    if (aiToCache.length > 0) {
      console.log(`💾 AI 결과 ${aiToCache.length}개 DB 캐시 저장 시작...`);

      supabase
        .from("food_search_cache")
        .upsert(
          aiToCache.map((item) => {
            // ✅ AI 결과에서 원재료 정보 추출
            const rawMaterials =
              item.rawMaterials ||
              item.ingredients?.join(", ") ||
              item.detectedIngredients?.join(", ") ||
              "";

            console.log(`  - ${item.foodName}:`);
            console.log(
              `    raw_materials: "${rawMaterials.substring(0, 50)}..."`,
            );
            console.log(`    allergens: [${item.allergens.join(", ")}]`);

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
