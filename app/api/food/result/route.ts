import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || "";

    console.log("🔍 검색 바코드:", code);

    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

    // ==========================================
    // API 1: 품목제조정보 (getFoodQrProdMnfInfo01)
    // ==========================================
    let productInfo = null;
    try {
      const url = new URL(`${baseUrl}/getFoodQrProdMnfInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "1");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);

      console.log("📡 품목제조정보 API");

      const response = await fetch(url.toString());
      const data = await response.json();
      productInfo = data.body?.items?.[0] || null;

      console.log("✅ 품목제조정보:", productInfo ? "획득" : "없음");
      if (productInfo) {
        console.log("   제품명:", productInfo.PRDCT_NM);
        console.log("   제조사:", productInfo.MNFCTUR);
        console.log("   원재료:", productInfo.RAWMTRL_NM ? "있음" : "없음"); // ✅ 확인
      }
    } catch (error) {
      console.error("⚠️ 품목제조정보 실패");
    }

    // ==========================================
    // API 2: 알레르기정보 (getFoodQrAllrgyInfo01)
    // ==========================================
    let allergyItems = [];
    try {
      const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "100");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);

      console.log("📡 알레르기정보 API");

      const response = await fetch(url.toString());
      const data = await response.json();
      allergyItems = data.body?.items || [];

      console.log(`✅ 알레르기: ${allergyItems.length}개`);
    } catch (error) {
      console.error("⚠️ 알레르기정보 실패:", error);
    }

    // ==========================================
    // API 3: 원재료정보 (getFoodQrProdRawatrl01)
    // ==========================================
    let rawMaterialItems = [];
    try {
      const url = new URL(`${baseUrl}/getFoodQrProdRawmtrl01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "100");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);

      console.log("📡 원재료정보 API");

      const response = await fetch(url.toString());
      const data = await response.json();
      rawMaterialItems = data.body?.items || [];

      console.log(`✅ 원재료: ${rawMaterialItems.length}개`);

      if (rawMaterialItems.length > 0) {
        console.log(
          "📦 원재료 샘플:",
          rawMaterialItems[0].PRVW_CN?.substring(0, 100),
        );
      }
    } catch (error) {
      console.error("⚠️ 원재료정보 실패:", error);
    }

    // ==========================================
    // API 4: 영양표시정보 (getFoodQrProdNsd01)
    // ==========================================
    let nutritionItems = [];
    try {
      const url = new URL(`${baseUrl}/getFoodQrProdNsd01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "50");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);

      console.log("📡 영양표시정보 API");

      const response = await fetch(url.toString());
      const data = await response.json();
      nutritionItems = data.body?.items || [];

      console.log(`✅ 영양정보: ${nutritionItems.length}개`);

      if (nutritionItems.length > 0) {
        console.log("🔍🔍🔍 영양정보 전체 필드 확인 🔍🔍🔍");
        console.log("첫 번째 항목:");
        console.log(JSON.stringify(nutritionItems[0], null, 2));
        console.log("\n두 번째 항목:");
        console.log(JSON.stringify(nutritionItems[1], null, 2));
        console.log("\n세 번째 항목:");
        console.log(JSON.stringify(nutritionItems[2], null, 2));
      }
    } catch (error) {
      console.error("⚠️ 영양표시정보 실패:", error);
    }

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
    const nutritionDetails = nutritionItems
      .map((item: any) => {
        const name = item.NIRWMT_NM || ""; // ✅ 영양성분명 (열량, 나트륨 등)
        const content = item.CTA || ""; // ✅ 함량 (370.000, 470.000 등)
        const unit = item.IGRD_UCD || ""; // ✅ 단위 (kcal, mg, g)
        const percentage = item.NTRTN_RT || ""; // 영양성분 기준치 비율

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
    // API 5: 식품표시정보 주의사항 (getFoodQrIndctAttnInfo01)
    // ==========================================
    let attentionInfo = null;
    try {
      const url = new URL(`${baseUrl}/getFoodQrIndctAttnInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "1");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);

      console.log("📡 주의사항정보 API");

      const response = await fetch(url.toString());
      const data = await response.json();
      attentionInfo = data.body?.items?.[0] || null;

      console.log("✅ 주의사항:", attentionInfo ? "있음" : "없음");
    } catch (error) {
      console.error("⚠️ 주의사항정보 실패:", error);
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

    const productName =
      productInfo?.PRDCT_NM ||
      allergyItems[0]?.PRDCT_NM ||
      rawMaterialItems[0]?.PRDCT_NM ||
      "알 수 없음";

    const manufacturer = productInfo?.MNFCTUR || "정보없음";
    const weight = productInfo?.PRDLST_DCNTS || "정보없음";

    // 알레르기 성분 (중복 제거)
    const allergyNames: any[] = [
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
      let depth = 0; // 괄호 깊이

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
    const allergyWarning = attentionInfo?.PRDLST_ATNT || "";

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

    const nutrition = {
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
    let crossContamination: string[] = [];
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
    const supabase = await createClient();
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

    const detectedAllergens = allergyNames
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

    const crossContaminationRisks = crossContamination
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
    };

    console.log("📋 최종 결과:");
    console.log(`  - 제품명: ${productName}`);
    console.log(`  - 제조사: ${manufacturer}`);
    console.log(`  - 알레르기: ${allergyNames.join(", ")}`);
    console.log(`  - 원재료: ${ingredients.length}개`);
    console.log(`  - 영양정보: ${nutritionItems.length}개`);

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
