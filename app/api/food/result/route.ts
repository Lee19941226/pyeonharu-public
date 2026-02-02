import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || "";

    // 식약처 API 호출
    const apiUrl = new URL(
      "https://apis.data.go.kr/1471000/FoodNtrIrdntInfoService1/getFoodNtrItdntList1",
    );
    apiUrl.searchParams.append("serviceKey", process.env.FOOD_API_KEY || "");
    apiUrl.searchParams.append("PRDLST_CD", code);
    apiUrl.searchParams.append("type", "json");

    const response = await fetch(apiUrl.toString());
    const data = await response.json();

    const item = data.body?.items?.[0];

    if (!item) {
      return NextResponse.json(
        { success: false, error: "식품 정보를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 사용자 알레르기 정보 조회
    const supabase = createClient();
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

    // 알레르기 매칭
    const foodAllergens = item.ALLERGY_INDUCEMENT_INTRCN?.split(",") || [];
    const detectedAllergens = foodAllergens
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

    const result = {
      foodCode: item.PRDLST_CD,
      foodName: item.PRDLST_NM,
      manufacturer: item.BSSH_NM,
      weight: item.PRDLST_DCNTS || "N/A",
      allergens: foodAllergens,
      userAllergens: userAllergens.map((ua) => ua.allergen_name),
      detectedAllergens,
      ingredients: item.RAWMTRL_NM?.split(",") || [],
      nutrition: {
        calories: parseFloat(item.ERGY) || 0,
        sodium: parseFloat(item.NTRCN_CNTNT_1) || 0,
        carbs: parseFloat(item.NTRCN_CNTNT_2) || 0,
        protein: parseFloat(item.NTRCN_CNTNT_3) || 0,
        fat: parseFloat(item.NTRCN_CNTNT_4) || 0,
      },
      isSafe: detectedAllergens.length === 0,
    };

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Result error:", error);
    return NextResponse.json(
      { success: false, error: "결과 조회 실패" },
      { status: 500 },
    );
  }
}
