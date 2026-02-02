import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || "";

    console.log("🔍 검색 코드:", code);

    // ==========================================
    // API 1: 알레르기 정보 API
    // ==========================================
    const allergyApiUrl = new URL(
      "https://apis.data.go.kr/1471000/FoodQrInfoService01/getFoodQrAllrgyInfo01",
    );
    allergyApiUrl.searchParams.append(
      "serviceKey",
      process.env.FOOD_API_KEY || "",
    );
    allergyApiUrl.searchParams.append("pageNo", "1");
    allergyApiUrl.searchParams.append("numOfRows", "100"); // ✅ 여러 알레르기 성분 조회
    allergyApiUrl.searchParams.append("type", "json");
    allergyApiUrl.searchParams.append("brcd_no", code);

    console.log("📡 알레르기 API URL:", allergyApiUrl.toString());

    const allergyResponse = await fetch(allergyApiUrl.toString());
    const allergyData = await allergyResponse.json();

    console.log("📦 알레르기 API 응답:", JSON.stringify(allergyData, null, 2));

    // ==========================================
    // API 2: 영양정보 API
    // ==========================================
    const nutritionApiUrl = new URL(
      "https://apis.data.go.kr/1471000/FoodNtrIrdntInfoService1/getFoodNtrItdntList1",
    );
    nutritionApiUrl.searchParams.append(
      "serviceKey",
      process.env.FOOD_API_KEY || "",
    );
    nutritionApiUrl.searchParams.append("pageNo", "1");
    nutritionApiUrl.searchParams.append("numOfRows", "1");
    nutritionApiUrl.searchParams.append("type", "json");
    nutritionApiUrl.searchParams.append("BRCD_NO", code); // ✅ 바코드로 검색

    console.log("📡 영양정보 API URL:", nutritionApiUrl.toString());

    const nutritionResponse = await fetch(nutritionApiUrl.toString());
    const nutritionData = await nutritionResponse.json();

    console.log(
      "📦 영양정보 API 응답:",
      JSON.stringify(nutritionData, null, 2),
    );

    // ==========================================
    // 데이터 병합
    // ==========================================
    const allergyItems = allergyData.body?.items || [];
    const nutritionItem = nutritionData.body?.items?.[0];

    if (allergyItems.length === 0 && !nutritionItem) {
      return NextResponse.json(
        { success: false, error: "식품 정보를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 알레르기 성분 추출
    const allergyNames = allergyItems
      .map((item: any) => item.ALG_CSG_MTR_NM)
      .filter(Boolean);

    console.log("🔬 알레르기 성분 목록:", allergyNames);

    // 제품 기본 정보 (알레르기 API에서)
    const productName =
      allergyItems[0]?.PRDCT_NM || nutritionItem?.PRDLST_NM || "알 수 없음";

    // 원재료 (영양정보 API에서)
    const rawMaterials = nutritionItem?.RAWMTRL_NM || "";
    const ingredients = rawMaterials
      ? rawMaterials.split(",").map((s: string) => s.trim())
      : [];

    // 알레르기 유발물질 표시 (영양정보 API에서)
    const allergyWarning = nutritionItem?.ALLERGY_INDUCEMENT_INTRCN || "";

    // 제조사
    const manufacturer =
      nutritionItem?.BSSH_NM || nutritionItem?.MNFCTUR || "정보없음";

    // 내용량
    const weight = nutritionItem?.PRDLST_DCNTS || "N/A";

    // 영양정보
    const nutrition = {
      calories: parseFloat(nutritionItem?.ERGY || "0") || 0,
      sodium: parseFloat(nutritionItem?.NTRCN_CNTNT_1 || "0") || 0, // 나트륨
      carbs: parseFloat(nutritionItem?.NTRCN_CNTNT_2 || "0") || 0, // 탄수화물
      protein: parseFloat(nutritionItem?.NTRCN_CNTNT_3 || "0") || 0, // 단백질
      fat: parseFloat(nutritionItem?.NTRCN_CNTNT_4 || "0") || 0, // 지방
      sugar: parseFloat(nutritionItem?.SUGAR || "0") || 0, // 당류
    };

    console.log("📊 영양정보:", nutrition);

    // 사용자 알레르기 정보 조회
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

    // 사용자 알레르기와 매칭
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

    // 교차오염 정보 파싱 (예: "이 제품은 우유, 대두를 사용한 제품과 같은 제조시설에서 제조하고 있습니다")
    let crossContamination: string[] = [];
    if (allergyWarning) {
      // "같은 제조시설", "같은 제조라인" 등의 키워드 포함 시 교차오염 정보로 판단
      if (
        allergyWarning.includes("제조시설") ||
        allergyWarning.includes("제조라인") ||
        allergyWarning.includes("제조공정")
      ) {
        // 알레르기 성분 추출 시도
        const allergenKeywords = [
          "우유",
          "계란",
          "밀",
          "대두",
          "땅콩",
          "견과류",
          "갑각류",
          "생선",
          "조개류",
          "메밀",
          "복숭아",
          "토마토",
          "돼지고기",
          "쇠고기",
          "닭고기",
          "오징어",
          "고등어",
          "아황산류",
          "호두",
          "잣",
        ];
        crossContamination = allergenKeywords.filter((keyword) =>
          allergyWarning.includes(keyword),
        );
      }
    }

    const result = {
      foodCode: code,
      foodName: productName,
      manufacturer: manufacturer,
      weight: weight,
      allergens: allergyNames, // ✅ 실제 알레르기 성분
      allergyWarning: allergyWarning, // ✅ 알레르기 유발물질 표시 전체 문구
      crossContamination: crossContamination, // ✅ 교차오염 알레르기
      userAllergens: userAllergens.map((ua) => ua.allergen_name),
      detectedAllergens,
      ingredients: ingredients, // ✅ 원재료
      nutrition: nutrition, // ✅ 영양정보
      isSafe: detectedAllergens.length === 0,
    };

    console.log("📋 최종 결과:", JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("💥 Result error:", error);
    return NextResponse.json(
      { success: false, error: "결과 조회 실패" },
      { status: 500 },
    );
  }
}
