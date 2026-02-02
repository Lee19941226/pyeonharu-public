import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    // 식약처 푸드QR 알레르기정보 API 호출
    // ✅ 기본 엔드포인트만 포함 (쿼리스트링 제거)
    const apiUrl = new URL(
      "https://apis.data.go.kr/1471000/FoodQrInfoService01/getFoodQrAllrgyInfo01",
    );

    // ✅ 환경변수에서 serviceKey 가져오기 (디코딩된 원본)
    // .env.local에 저장된 키를 그대로 사용
    const serviceKey = process.env.FOOD_API_KEY || "";

    // 필수 파라미터
    apiUrl.searchParams.append("serviceKey", serviceKey);
    apiUrl.searchParams.append("pageNo", "1");
    apiUrl.searchParams.append("numOfRows", "10");
    apiUrl.searchParams.append("type", "json");

    // 검색 파라미터 (제품명으로 검색)
    apiUrl.searchParams.append("prdct_nm", query);

    console.log("API URL:", apiUrl.toString()); // 디버깅용

    const response = await fetch(apiUrl.toString());

    // 응답 상태 확인
    if (!response.ok) {
      console.error("API Error Status:", response.status);
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Response:", data); // 디버깅용

    // 사용자 알레르기 정보 조회
    const supabase = await createClient();
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
        // 알레르기 성분 확인
        const allergens = item.ALLERGY_INFO?.split(",") || [];
        const hasAllergen = allergens.some((allergen: string) =>
          userAllergens.some((userAllergen) => allergen.includes(userAllergen)),
        );

        return {
          foodCode: item.BRCD_NO || item.ELB_MNG_NO,
          foodName: item.PRDCT_NM,
          manufacturer: item.MNFCTUR || "정보없음",
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
      {
        success: false,
        error: error instanceof Error ? error.message : "검색 실패",
      },
      { status: 500 },
    );
  }
}
