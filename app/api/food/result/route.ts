import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

// ✅ 초성 추출 함수 추가
function getChosung(str: string): string {
  const CHO = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code > -1 && code < 11172) {
      result += CHO[Math.floor(code / 588)];
    }
  }
  return result;
}
async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error(`식약처 API 타임아웃 (${timeoutMs}ms): ${url}`);
    } else {
      console.error("식약처 API 오류:", error);
    }
    return null; // null로 반환해서 호출부에서 구분 가능
  } finally {
    clearTimeout(timeoutId);
  }
}
export async function GET(req: NextRequest) {
  let productName = "제품";
  let manufacturer = "";
  let weight = "";
  let allergyNames: any[] = [];
  let ingredients: string[] = [];
  let detectedAllergens: any[] = [];
  let nutritionItems: any[] = [];
  let allergyWarning = "";
  let crossContamination: string[] = [];
  let crossContaminationRisks: any[] = [];
  let nutritionDetails: any[] = [];
  let nutrition = {};
  let servingSize = "";
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || "";

    console.log("🔍 검색 바코드/코드:", code);

    const supabase = await createClient();

    // ==========================================
    // DB 캐시 우선 조회
    // ==========================================
    const { data: cachedData } = await supabase
      .from("food_search_cache")
      .select("*")
      .eq("food_code", code)
      .maybeSingle();

    // ✅ 사용자 알레르기 조회 (먼저 가져오기)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userAllergens: any[] = [];
    if (user) {
      const { data: allergyData } = await supabase
        .from("user_allergies")
        .select("*")
        .eq("user_id", user.id);
      if (allergyData) {
        userAllergens = allergyData;
      }
    }

    if (cachedData) {
      console.log("✅ DB 캐시에서 발견:", cachedData.food_name);

      // 변수에 값 할당 (재선언 ❌)
      productName = cachedData.food_name;
      manufacturer = cachedData.manufacturer || "정보없음";
      weight = cachedData.weight || "";
      allergyNames = (cachedData.allergens || []).filter(
        (a: string) => a && a.trim().length > 0,
      );

      // 원재료 파싱
      if (cachedData.raw_materials) {
        ingredients = cachedData.raw_materials
          .split(/[,\(\)]+/)
          .map((i: string) => i.trim())
          .filter((i: string) => i.length > 0);
      }
      // 영양정보 추가
      nutritionDetails = cachedData.nutrition_details || [];
      servingSize = cachedData.serving_size || "";

      console.log("📊 DB 캐시 영양정보:", nutritionDetails.length, "개");
      // ==========================================
      // 데이터 보완 로직 (원재료 또는 알레르기 없을 때)
      // ==========================================
      const needsEnrichment =
        !cachedData.raw_materials ||
        !cachedData.allergens ||
        cachedData.allergens.length === 0 ||
        !cachedData.nutrition_details ||
        cachedData.nutrition_details.length === 0;

      if (needsEnrichment && cachedData.data_source === "ai") {
        console.log("🔄 DB 데이터 불완전, AI로 보완 시작...");
        console.log(
          `  - 원재료: ${cachedData.raw_materials ? "있음" : "없음"}`,
        );
        console.log(`  - 알레르기: ${cachedData.allergens?.length || 0}개`);

        try {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const enrichResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: `"${productName}" (제조사: ${manufacturer || "알 수 없음"})의 정확한 제품 정보를 알려주세요.

**중요: 실제로 한국에서 판매되는 제품의 정보만 제공하세요.**

JSON 형식으로만 응답:
{
  "exists": true 또는 false (실제 존재하는 제품인지),
  "allergens": ["알레르기 유발물질"],
  "ingredients": ["주요 원재료 7~10개"],
  "confidence": 0.0~1.0 (정보 신뢰도)
}

**알레르기 22가지:** 계란, 우유, 밀, 메밀, 땅콩, 대두, 호두, 잣, 견과류, 갑각류, 새우, 게, 고등어, 오징어, 조개류, 생선, 복숭아, 토마토, 돼지고기, 쇠고기, 닭고기, 아황산류

실제 존재하지 않는 제품이면 exists: false로 반환하세요.`,
              },
            ],
            max_tokens: 500,
          });

          const aiText = enrichResponse.choices[0].message.content || "{}";
          const clean = aiText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const enrichData = JSON.parse(clean);

          // ✅ 실제 제품이고 신뢰도 높을 때만 업데이트
          if (enrichData.exists && enrichData.confidence >= 0.7) {
            console.log(
              "✅ AI 보완 데이터 획득 (신뢰도:",
              enrichData.confidence,
              ")",
            );

            // DB 업데이트
            const updateData: any = {};

            if (enrichData.ingredients && enrichData.ingredients.length > 0) {
              updateData.raw_materials = enrichData.ingredients.join(", ");
              ingredients = enrichData.ingredients;
            }

            if (enrichData.allergens && enrichData.allergens.length > 0) {
              const cleanAllergens = enrichData.allergens.filter(
                (a: string) => a && a.trim().length > 0,
              );

              if (cleanAllergens.length > 0) {
                updateData.allergens = cleanAllergens;
                allergyNames = cleanAllergens;
              }
            }

            // ✅ 업데이트 실행
            if (Object.keys(updateData).length > 0) {
              await supabase
                .from("food_search_cache")
                .update(updateData)
                .eq("food_code", cachedData.food_code);

              console.log("✅ DB 업데이트 완료:", {
                원재료: updateData.raw_materials ? "보완됨" : "기존 유지",
                알레르기: updateData.allergens
                  ? `${updateData.allergens.length}개 보완`
                  : "기존 유지",
              });
            }
          } else {
            console.log("⚠️ AI 보완 실패 - 신뢰도 낮거나 제품 미존재");
          }
        } catch (enrichError) {
          console.error("❌ AI 데이터 보완 실패:", enrichError);
          // 실패해도 기존 데이터로 계속 진행
        }
      }
      // ✅✅ 추가: AI 제품 보완 후 Open API 스킵
      if (cachedData.data_source === "ai") {
        console.log("🤖 AI 제품이므로 Open API 호출 스킵");

        // ✅ 사용자 알레르기와 매칭 (이 부분만 실행)
        detectedAllergens = allergyNames
          .map((allergen: string) => {
            const match = userAllergens.find(
              (ua) =>
                allergen.includes(ua.allergen_name) ||
                ua.allergen_name.includes(allergen),
            );

            if (match) {
              return {
                name: match.allergen_name,
                amount: allergen,
                severity: match.severity,
                code: match.allergen_code,
              };
            }
            return null;
          })
          .filter(Boolean);

        console.log("📊 AI 제품 정보:");
        console.log("  - 원재료:", ingredients.length, "개");
        console.log("  - 알레르기:", allergyNames.length, "개");
        console.log("  - 위험 알레르기:", detectedAllergens.length, "개");
      }
      // ✅✅ 추가: Open API 데이터 보완
      if (needsEnrichment && cachedData.data_source === "openapi") {
        console.log("🔄 Open API 데이터 불완전, 재호출 시작...");
        console.log(
          `  - 원재료: ${cachedData.raw_materials ? "있음" : "없음"}`,
        );
        console.log(`  - 알레르기: ${cachedData.allergens?.length || 0}개`);
        console.log(
          `  - 영양정보: ${cachedData.nutrition_details?.length || 0}개`,
        );

        try {
          const serviceKey = process.env.FOOD_API_KEY || "";
          const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

          // 병렬 API 호출
          const [rawMaterialResult, allergyResult, nutritionResult] =
            await Promise.allSettled([
              // 원재료
              (async () => {
                if (cachedData.raw_materials) return [];
                const url = new URL(`${baseUrl}/getFoodQrProdRawmtrl01`);
                url.searchParams.append("serviceKey", serviceKey);
                url.searchParams.append("pageNo", "1");
                url.searchParams.append("numOfRows", "100");
                url.searchParams.append("type", "json");
                url.searchParams.append("brcd_no", code);
                const data = await fetchWithTimeout(url.toString());
                return data.body?.items || [];
              })(),

              // 알레르기
              (async () => {
                if (cachedData.allergens && cachedData.allergens.length > 0)
                  return [];
                const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
                url.searchParams.append("serviceKey", serviceKey);
                url.searchParams.append("pageNo", "1");
                url.searchParams.append("numOfRows", "100");
                url.searchParams.append("type", "json");
                url.searchParams.append("brcd_no", code);
                const data = await fetchWithTimeout(url.toString());
                return data.body?.items || [];
              })(),

              // 영양정보
              (async () => {
                if (
                  cachedData.nutrition_details &&
                  cachedData.nutrition_details.length > 0
                )
                  return [];
                const url = new URL(`${baseUrl}/getFoodQrProdNsd01`);
                url.searchParams.append("serviceKey", serviceKey);
                url.searchParams.append("pageNo", "1");
                url.searchParams.append("numOfRows", "50");
                url.searchParams.append("type", "json");
                url.searchParams.append("brcd_no", code);
                const data = await fetchWithTimeout(url.toString());
                return data.body?.items || [];
              })(),
            ]);

          const rawMaterialItems =
            rawMaterialResult.status === "fulfilled"
              ? rawMaterialResult.value
              : [];
          const allergyItems =
            allergyResult.status === "fulfilled" ? allergyResult.value : [];
          const nutritionItemsNew =
            nutritionResult.status === "fulfilled" ? nutritionResult.value : [];

          const updateData: any = {};

          // 원재료 파싱
          if (!cachedData.raw_materials && rawMaterialItems.length > 0) {
            const rawText = rawMaterialItems[0].PRVW_CN || "";
            if (rawText) {
              updateData.raw_materials = rawText;

              // 현재 세션에도 반영
              function parseIngredients(text: string): string[] {
                const items: string[] = [];
                let current = "";
                let depth = 0;
                for (let i = 0; i < text.length; i++) {
                  const char = text[i];
                  if (char === "(" || char === "{" || char === "[") {
                    depth++;
                    current += char;
                  } else if (char === ")" || char === "}" || char === "]") {
                    depth--;
                    current += char;
                  } else if ((char === "," || char === "，") && depth === 0) {
                    const trimmed = current.trim();
                    if (trimmed) items.push(trimmed);
                    current = "";
                  } else {
                    current += char;
                  }
                }
                const trimmed = current.trim();
                if (trimmed) items.push(trimmed);
                return items;
              }

              ingredients = parseIngredients(rawText).slice(0, 30);
            }
          }

          // 알레르기
          if (
            (!cachedData.allergens || cachedData.allergens.length === 0) &&
            allergyItems.length > 0
          ) {
            const allergens = [
              ...new Set(
                allergyItems
                  .map((item: any) => item.ALG_CSG_MTR_NM)
                  .filter((name: string) => name && name.trim().length > 0),
              ),
            ];

            if (allergens.length > 0) {
              updateData.allergens = allergens;
              allergyNames = allergens;
            }
          }

          // 영양정보
          if (
            (!cachedData.nutrition_details ||
              cachedData.nutrition_details.length === 0) &&
            nutritionItemsNew.length > 0
          ) {
            const nutritionDetailsParsed = nutritionItemsNew
              .map((item: any) => {
                const name = item.NTRCN_NM || "";
                const content = item.CNTNT || "";
                const unit = item.UNIT || "";

                if (
                  name.includes("1회제공량") ||
                  name.includes("제공량") ||
                  name.includes("총내용량")
                ) {
                  return null;
                }

                return { name, content, unit };
              })
              .filter((item: any) => item && item.name && item.content);

            if (nutritionDetailsParsed.length > 0) {
              updateData.nutrition_details = nutritionDetailsParsed;
              nutritionDetails = nutritionDetailsParsed;
            }

            // 1회 제공량
            const servingSizeItem = nutritionItemsNew.find(
              (item: any) =>
                item.NTRCN_NM?.includes("1회제공량") ||
                item.NTRCN_NM?.includes("제공량"),
            );

            if (servingSizeItem) {
              const serving =
                `${servingSizeItem.CNTNT || ""}${servingSizeItem.UNIT || ""}`.trim();
              updateData.serving_size = serving;
              servingSize = serving;
            }
          }

          // DB 업데이트
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("food_search_cache")
              .update(updateData)
              .eq("food_code", code);

            console.log("✅ Open API 데이터 보완 완료:", {
              원재료: updateData.raw_materials ? "보완됨" : "기존 유지",
              알레르기: updateData.allergens
                ? `${updateData.allergens.length}개 보완`
                : "기존 유지",
              영양정보: updateData.nutrition_details
                ? `${updateData.nutrition_details.length}개 보완`
                : "기존 유지",
            });
          }
        } catch (enrichError) {
          console.error("❌ Open API 데이터 보완 실패:", enrichError);
        }
      }
      // ✅ 사용자 알레르기와 매칭
      detectedAllergens = allergyNames
        .map((allergen: string) => {
          const match = userAllergens.find(
            (ua) =>
              allergen.includes(ua.allergen_name) ||
              ua.allergen_name.includes(allergen),
          );

          if (match) {
            return {
              name: match.allergen_name,
              amount: allergen,
              severity: match.severity,
              code: match.allergen_code,
            };
          }
          return null;
        })
        .filter(Boolean);

      console.log("📊 DB 캐시 정보:");
      console.log("  - 원재료:", ingredients.length, "개");
      console.log("  - 알레르기:", allergyNames.length, "개");
      console.log("  - 위험 알레르기:", detectedAllergens.length, "개");
    }

    // ==========================================
    // DB 캐시가 없거나 불완전할 때 Open API 조회
    // ==========================================
    const isIncomplete =
      cachedData &&
      cachedData.data_source === "openapi" &&
      (!cachedData.raw_materials ||
        !cachedData.allergens ||
        cachedData.allergens.length === 0 ||
        !cachedData.nutrition_details ||
        cachedData.nutrition_details.length === 0);

    //  AI 제품은 Open API 호출 스킵
    if (!cachedData || isIncomplete) {
      if (isIncomplete) {
        console.log("🔄 DB 캐시 데이터 불완전, Open API로 보완");
      } else {
        console.log("❌ DB 캐시 없음, Open API 조회 진행");
      }

      const serviceKey = process.env.FOOD_API_KEY || "";
      const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";
      // ==========================================
      // Open API 병렬 호출 (Promise.allSettled)
      // ==========================================
      console.log("🚀 5개 API 병렬 호출 시작...");

      const [
        productResult,
        allergyResult,
        rawMaterialResult,
        nutritionResult,
        attentionResult,
      ] = await Promise.allSettled([
        // API 1: 품목제조정보
        (async () => {
          const url = new URL(`${baseUrl}/getFoodQrProdMnfInfo01`);
          url.searchParams.append("serviceKey", serviceKey);
          url.searchParams.append("pageNo", "1");
          url.searchParams.append("numOfRows", "1");
          url.searchParams.append("type", "json");
          url.searchParams.append("brcd_no", code);
          const data = await fetchWithTimeout(url.toString());
          return data.body?.items?.[0] || null;
        })(),

        // API 2: 알레르기정보
        (async () => {
          const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
          url.searchParams.append("serviceKey", serviceKey);
          url.searchParams.append("pageNo", "1");
          url.searchParams.append("numOfRows", "100");
          url.searchParams.append("type", "json");
          url.searchParams.append("brcd_no", code);
          const data = await fetchWithTimeout(url.toString());
          return data.body?.items || [];
        })(),

        // API 3: 원재료정보
        (async () => {
          const url = new URL(`${baseUrl}/getFoodQrProdRawmtrl01`);
          url.searchParams.append("serviceKey", serviceKey);
          url.searchParams.append("pageNo", "1");
          url.searchParams.append("numOfRows", "100");
          url.searchParams.append("type", "json");
          url.searchParams.append("brcd_no", code);
          const data = await fetchWithTimeout(url.toString());
          return data.body?.items || [];
        })(),

        // API 4: 영양표시정보
        (async () => {
          const url = new URL(`${baseUrl}/getFoodQrProdNsd01`);
          url.searchParams.append("serviceKey", serviceKey);
          url.searchParams.append("pageNo", "1");
          url.searchParams.append("numOfRows", "50");
          url.searchParams.append("type", "json");
          url.searchParams.append("brcd_no", code);
          const data = await fetchWithTimeout(url.toString());
          return data.body?.items || [];
        })(),

        // API 5: 주의사항정보
        (async () => {
          const url = new URL(`${baseUrl}/getFoodQrIndctAttnInfo01`);
          url.searchParams.append("serviceKey", serviceKey);
          url.searchParams.append("pageNo", "1");
          url.searchParams.append("numOfRows", "1");
          url.searchParams.append("type", "json");
          url.searchParams.append("brcd_no", code);
          const data = await fetchWithTimeout(url.toString());
          return data.body?.items?.[0] || null;
        })(),
      ]);

      console.log("✅ 병렬 호출 완료");

      // ==========================================
      // 결과 추출 (성공한 것만)
      // ==========================================
      const productInfo =
        productResult.status === "fulfilled" ? productResult.value : null;
      const allergyItems =
        allergyResult.status === "fulfilled" ? allergyResult.value : [];
      const rawMaterialItems =
        rawMaterialResult.status === "fulfilled" ? rawMaterialResult.value : [];
      nutritionItems =
        nutritionResult.status === "fulfilled" ? nutritionResult.value : [];
      const attentionInfo =
        attentionResult.status === "fulfilled" ? attentionResult.value : null;

      // 각 결과 로깅
      console.log("📊 API 결과:");
      console.log(`  - 품목제조정보: ${productInfo ? "✅" : "❌"}`);
      console.log(`  - 알레르기: ${allergyItems.length}개`);
      console.log(`  - 원재료: ${rawMaterialItems.length}개`);
      console.log(`  - 영양정보: ${nutritionItems.length}개`);
      console.log(`  - 주의사항: ${attentionInfo ? "✅" : "❌"}`);
      // ==========================================
      // 영양정보 추출 (수정)
      // ==========================================
      console.log("📊 영양정보 원본 개수:", nutritionItems.length);

      // 1회 제공량 정보
      const servingSizeItem = nutritionItems.find(
        (item: any) =>
          item.NTRCN_NM?.includes("1회제공량") ||
          item.NTRCN_NM?.includes("제공량") ||
          item.NTRCN_NM?.includes("총내용량"),
      );

      if (servingSizeItem) {
        servingSize =
          `${servingSizeItem.CNTNT || ""}${servingSizeItem.UNIT || ""}`.trim();
      }

      console.log("📊 1회 제공량:", servingSize);

      // 영양성분 목록 (필드명 수정)
      nutritionDetails = nutritionItems
        .map((item: any) => {
          const name = item.NTRCN_NM || "";
          const content = item.CNTNT || "";
          const unit = item.UNIT || "";

          // 1회제공량은 제외
          if (
            name.includes("1회제공량") ||
            name.includes("제공량") ||
            name.includes("총내용량")
          ) {
            return null;
          }

          return {
            name: name,
            content: content,
            unit: unit,
          };
        })
        .filter((item: any) => item && item.name && item.content);

      console.log("📊 파싱된 영양정보:", nutritionDetails.length, "개");
      if (nutritionDetails.length > 0) {
        console.log("   샘플:", nutritionDetails.slice(0, 3));
      }
      // ==========================================
      // 데이터 확인
      // ==========================================
      if (allergyItems.length === 0 && !productInfo) {
        return NextResponse.json(
          { success: false, error: "식품 정보를 찾을 수 없습니다" },
          { status: 404 },
        );
      }

      // ==========================================
      // 데이터 추출 및 가공
      // ==========================================

      productName =
        productInfo?.PRDCT_NM ||
        allergyItems[0]?.PRDCT_NM ||
        rawMaterialItems[0]?.PRDCT_NM ||
        "알 수 없음";

      manufacturer = productInfo?.MNFCTUR || "정보없음";
      weight = productInfo?.PRDLST_DCNTS || "정보없음";

      // 알레르기 성분 (중복 제거)
      allergyNames = [
        ...new Set(
          allergyItems
            .map((item: any) => item.ALG_CSG_MTR_NM)
            .filter(
              (name: string) =>
                typeof name === "string" && name.trim().length > 0,
            ),
        ),
      ];

      // ✅ 원재료 추출 (수정)
      let rawMaterialsText = "";

      // 1순위: 원재료 API (PRVW_CN 필드)
      if (rawMaterialItems.length > 0) {
        rawMaterialsText = rawMaterialItems[0].PRVW_CN || "";
      }

      // 2순위: 품목제조정보 API (백업)
      if (!rawMaterialsText && productInfo) {
        rawMaterialsText = productInfo.RAWMTRL_NM || "";
      }

      console.log("📦 원재료 원본 길이:", rawMaterialsText.length);

      // ✅ 정교한 원재료 파싱 함수
      function parseIngredients(text: string): string[] {
        const items: string[] = [];
        let current = "";
        let depth = 0;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];

          if (char === "(" || char === "{" || char === "[") {
            depth++;
            current += char;
          } else if (char === ")" || char === "}" || char === "]") {
            depth--;
            current += char;
          } else if ((char === "," || char === "，") && depth === 0) {
            // 괄호 밖의 쉼표만 분리
            const trimmed = current.trim();
            if (trimmed) {
              items.push(trimmed);
            }
            current = "";
          } else {
            current += char;
          }
        }

        // 마지막 항목
        const trimmed = current.trim();
        if (trimmed) {
          items.push(trimmed);
        }

        return items;
      }

      // 원재료 추출 부분 수정
      ingredients = rawMaterialsText
        ? parseIngredients(rawMaterialsText).slice(0, 30)
        : [];

      console.log("📝 파싱된 원재료:", ingredients.length, "개");
      if (ingredients.length > 0) {
        console.log("   샘플:", ingredients.slice(0, 3));
      }

      // 알레르기 주의사항
      allergyWarning = attentionInfo?.PRDLST_ATNT || "";

      // 영양정보 매핑
      const getNutritionValue = (name: string): number => {
        const item = nutritionItems.find((item: any) =>
          item.NTRCN_NM?.includes(name),
        );
        return item ? parseFloat(item.CNTNT || "0") || 0 : 0;
      };

      nutrition = {
        servingSize: servingSize || "",
        calories: getNutritionValue("열량"),
        sodium: getNutritionValue("나트륨"),
        carbs: getNutritionValue("탄수화물"),
        sugar: getNutritionValue("당류"),
        protein: getNutritionValue("단백질"),
        fat: getNutritionValue("지방"),
        transFat: getNutritionValue("트랜스지방"),
        saturatedFat: getNutritionValue("포화지방"),
        cholesterol: getNutritionValue("콜레스테롤"),
      };

      // 교차오염 정보
      if (allergyWarning) {
        const warningLower = allergyWarning.toLowerCase();
        if (
          warningLower.includes("제조시설") ||
          warningLower.includes("제조라인") ||
          warningLower.includes("같은 시설")
        ) {
          const allergenKeywords = [
            "우유",
            "계란",
            "밀",
            "대두",
            "땅콩",
            "견과류",
            "호두",
            "잣",
            "갑각류",
            "생선",
            "조개류",
            "새우",
            "게",
            "오징어",
            "고등어",
            "메밀",
            "복숭아",
            "토마토",
            "돼지고기",
            "쇠고기",
            "닭고기",
            "아황산류",
          ];
          crossContamination = allergenKeywords.filter((keyword) =>
            allergyWarning.includes(keyword),
          );
        }
      }

      // ==========================================
      // 사용자 알레르기 매칭
      // ==========================================

      let userAllergens: any[] = [];
      if (user) {
        const { data: allergyData } = await supabase
          .from("user_allergies")
          .select("*")
          .eq("user_id", user.id);

        if (allergyData) {
          userAllergens = allergyData;
        }
      }

      detectedAllergens = allergyNames
        .map((allergen: string) => {
          const match = userAllergens.find(
            (ua) =>
              allergen.includes(ua.allergen_name) ||
              ua.allergen_name.includes(allergen),
          );
          if (match) {
            return {
              name: match.allergen_name,
              amount: allergen,
              severity: match.severity,
            };
          }
          return null;
        })
        .filter(Boolean);

      crossContaminationRisks = crossContamination
        .map((allergen: string) => {
          const match = userAllergens.find(
            (ua) =>
              allergen.includes(ua.allergen_name) ||
              ua.allergen_name.includes(allergen),
          );
          if (match) {
            return {
              name: match.allergen_name,
              type: "교차오염",
              severity: match.severity,
            };
          }
          return null;
        })
        .filter(Boolean);
    }
    // ==========================================
    // 대체 식품 추천
    // ==========================================
    const alternatives: any[] = [];
    // ==========================================
    // Open API 데이터 → DB 캐시 저장
    // ==========================================
    if (!cachedData) {
      console.log("💾 Open API 데이터를 DB에 저장 시작...");

      try {
        const { error: saveError } = await supabase
          .from("food_search_cache")
          .upsert(
            {
              food_code: code,
              food_name: productName,
              manufacturer: manufacturer || null,
              allergens: allergyNames,
              raw_materials: ingredients.join(", ") || null,
              weight: weight || null,
              nutrition_details:
                nutritionDetails.length > 0 ? nutritionDetails : null,
              serving_size: servingSize || null,
              data_source: "openapi",
              chosung: getChosung(productName),
              created_at: new Date().toISOString(),
            },
            { onConflict: "food_code" },
          );

        if (saveError) {
          console.error("❌ DB 저장 실패:", saveError);
        } else {
          console.log("✅ Open API 데이터 DB 저장 완료");
          console.log("  - 제품명:", productName);
          console.log("  - 원재료:", ingredients.length, "개");
          console.log("  - 영양정보:", nutritionDetails.length, "개");
          console.log("  - 1회제공량:", servingSize);
        }
      } catch (saveError) {
        console.error("❌ DB 저장 중 오류:", saveError);
        // 저장 실패해도 사용자에게는 데이터 반환
      }
    }
    // ==========================================
    // 최종 결과
    // ==========================================
    const result = {
      foodCode: code,
      foodName: productName,
      manufacturer: manufacturer,
      weight: weight,
      allergens: allergyNames,
      allergyWarning: allergyWarning || undefined,
      crossContamination:
        crossContamination.length > 0 ? crossContamination : undefined,
      crossContaminationRisks: crossContaminationRisks,
      userAllergens: userAllergens.map((ua) => ua.allergen_name),
      detectedAllergens,
      ingredients: ingredients,
      nutrition: nutrition,
      nutritionDetails:
        nutritionDetails.length > 0 ? nutritionDetails : undefined,
      servingSize: servingSize || undefined,
      isSafe:
        detectedAllergens.length === 0 && crossContaminationRisks.length === 0,
      hasNutritionInfo: nutritionDetails.length > 0,
      dataSource: cachedData?.data_source || "openapi",
      alternatives: alternatives,
    };

    console.log("📋 최종 결과:");
    console.log(`  - 제품명: ${productName}`);
    console.log(`  - 데이터 소스: ${result.dataSource}`);
    console.log(`  - 알레르기: ${allergyNames.join(", ")}`);
    console.log(`  - 위험 알레르기: ${detectedAllergens.length}개`);
    console.log(`  - 원재료: ${ingredients.length}개`);
    console.log(`  - 대체품: ${alternatives.length}개`);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("💥 Result error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "결과 조회 실패",
      },
      { status: 500 },
    );
  }
}
