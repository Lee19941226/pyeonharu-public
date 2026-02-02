import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    // 식약처 API 호출
    const apiUrl = new URL(
      "https://apis.data.go.kr/1471000/FoodNtrIrdntInfoService1/getFoodNtrItdntList1",
    );
    apiUrl.searchParams.append("serviceKey", process.env.FOOD_API_KEY || "");
    apiUrl.searchParams.append("PRDLST_NM", query);
    apiUrl.searchParams.append("pageNo", "1");
    apiUrl.searchParams.append("numOfRows", "10");
    apiUrl.searchParams.append("type", "json");

    const response = await fetch(apiUrl.toString());
    const data = await response.json();

    // 사용자 알레르기 정보 조회
    const supabase = createClient();
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

    // 결과 매핑
    const items =
      data.body?.items?.map((item: any) => {
        const allergens = item.ALLERGY_INDUCEMENT_INTRCN?.split(",") || [];
        const hasAllergen = allergens.some((allergen: string) =>
          userAllergens.some((userAllergen) => allergen.includes(userAllergen)),
        );

        return {
          foodCode: item.PRDLST_CD,
          foodName: item.PRDLST_NM,
          manufacturer: item.BSSH_NM,
          hasAllergen,
        };
      }) || [];

    return NextResponse.json({
      success: true,
      items,
      totalCount: data.body?.totalCount || 0,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "검색 실패" },
      { status: 500 },
    );
  }
}
