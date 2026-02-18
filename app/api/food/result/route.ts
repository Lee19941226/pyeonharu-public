import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function GET(req: NextRequest) {
  // ✅ 변수 선언 (맨 위로 이동)
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

      // ✅ 변수에 값 할당 (재선언 ❌)
      productName = cachedData.food_name;
      manufacturer = cachedData.manufacturer || "정보없음";
      weight = cachedData.weight || "";
      allergyNames = cachedData.allergens || [];

      // ✅ 원재료 파싱
      if (cachedData.raw_materials) {
        ingredients = cachedData.raw_materials
          .split(/[,\(\)]+/)
          .map((i: string) => i.trim())
          .filter((i: string) => i.length > 0);
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

    // ✅ DB 캐시 없을 때만 Open API 조회
    if (!cachedData) {
      console.log("❌ DB 캐시 없음, Open API 조회 진행");

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
          const response = await fetch(url.toString());
          const data = await response.json();
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
          const response = await fetch(url.toString());
          const data = await response.json();
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
          const response = await fetch(url.toString());
          const data = await response.json();
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
          const response = await fetch(url.toString());
          const data = await response.json();
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
          const response = await fetch(url.toString());
          const data = await response.json();
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
      // 영양정보 추출 (데이터 병합 섹션에 추가)
      // ==========================================
      // 1회 제공량 정보
      const servingSize =
        nutritionItems.length > 0
          ? `${nutritionItems[0].NTRTN_INDCT_TCT}${nutritionItems[0].NTRTN_INDCT_TCD}`
          : "";

      console.log("📊 1회 제공량:", servingSize);

      // 영양성분 목록
      nutritionDetails = nutritionItems
        .map((item: any) => {
          const name = item.NIRWMT_NM || "";
          const content = item.CTA || "";
          const unit = item.IGRD_UCD || "";
          const percentage = item.NTRTN_RT || "";

          return {
            name: name,
            content: content,
            unit: unit,
            percentage: percentage,
          };
        })
        .filter((item: any) => item.name && item.content);

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
          allergyItems.map((item: any) => item.ALG_CSG_MTR_NM).filter(Boolean),
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
        const ingredients: string[] = [];
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
              ingredients.push(trimmed);
            }
            current = "";
          } else {
            current += char;
          }
        }

        // 마지막 항목
        const trimmed = current.trim();
        if (trimmed) {
          ingredients.push(trimmed);
        }

        return ingredients;
      }

      // 원재료 추출 부분 수정
      const ingredients: string[] = rawMaterialsText
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

      const servingSizeItem = nutritionItems.find(
        (item: any) =>
          item.NTRCN_NM?.includes("1회제공량") ||
          item.NTRCN_NM?.includes("제공량"),
      );

      nutrition = {
        servingSize: servingSizeItem
          ? `${servingSizeItem.CNTNT}${servingSizeItem.UNIT || ""}`
          : "",
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
    let alternatives: any[] = [];

    // ✅ 위험한 제품일 때만 (사용자 알레르기 검출됨)
    if (detectedAllergens.length > 0) {
      console.log("🔍 대체 식품 추천 시작...");
      console.log("  - 현재 제품:", productName);
      console.log(
        "  - 위험 알레르기:",
        detectedAllergens.map((d) => d?.name).join(", "),
      );

      try {
        // 1. DB에서 안전한 유사 제품 찾기
        const { data: safeProducts } = await supabase
          .from("food_search_cache")
          .select("*")
          .neq("food_code", code)
          .limit(20);

        if (safeProducts && safeProducts.length > 0) {
          // ✅ 사용자 알레르기 없는 제품만
          const filtered = safeProducts.filter((product: any) => {
            const productAllergens = product.allergens || [];

            // 위험 알레르기와 겹치는지 확인
            const hasUserAllergen = productAllergens.some((pa: string) =>
              detectedAllergens.some(
                (da) => pa.includes(da?.name) || da?.name.includes(pa),
              ),
            );

            return !hasUserAllergen;
          });

          alternatives = filtered.slice(0, 3).map((product: any) => ({
            barcode: product.food_code,
            productName: product.food_name,
            manufacturer: product.manufacturer,
            category: "유사 제품",
            reason: "귀하의 알레르기 성분이 없습니다",
            dataSource: product.data_source,
          }));

          console.log(`✅ DB에서 안전한 대체품 ${alternatives.length}개 발견`);
        }

        // 2. DB 부족하면 AI로 추가 생성
        if (alternatives.length < 3) {
          console.log("🤖 AI 대체품 생성...");

          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const userAllergenNames = detectedAllergens
            .map((d) => d?.name)
            .join(", ");

          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: `"${productName}" 대신 먹을 수 있는 실제 제품 3가지를 추천해주세요.

**제외해야 할 알레르기:** ${userAllergenNames}

**조건:**
- 실제 판매되는 제품만 (임의 제품 금지)
- 위 알레르기 성분이 없어야 함
- 비슷한 용도/맛

JSON 형식:
[
  {
    "productName": "실제 제품명",
    "manufacturer": "제조사",
    "category": "카테고리",
    "reason": "추천 이유 (간단히)"
  }
]`,
              },
            ],
            max_tokens: 500,
          });

          const aiText = aiResponse.choices[0].message.content || "[]";
          const clean = aiText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const aiAlternatives = JSON.parse(clean);

          if (Array.isArray(aiAlternatives)) {
            alternatives = [
              ...alternatives,
              ...aiAlternatives
                .slice(0, 3 - alternatives.length)
                .map((alt: any) => ({
                  barcode: "",
                  productName: alt.productName,
                  manufacturer: alt.manufacturer,
                  category: alt.category,
                  reason: alt.reason,
                  dataSource: "ai",
                })),
            ];

            console.log(`✅ AI 대체품 ${aiAlternatives.length}개 추가`);
          }
        }
      } catch (error) {
        console.error("❌ 대체품 추천 실패:", error);
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
      nutritionDetails: nutritionDetails,
      isSafe:
        detectedAllergens.length === 0 && crossContaminationRisks.length === 0,
      hasNutritionInfo: nutritionItems.length > 0,
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
