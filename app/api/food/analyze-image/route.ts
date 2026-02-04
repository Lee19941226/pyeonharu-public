import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    // 식약처 푸드QR 알레르기정보 API 호출
    const apiUrl = new URL(
      "https://apis.data.go.kr/1471000/FoodQrInfoService01/getFoodQrAllrgyInfo01",
    );

    const serviceKey = process.env.FOOD_API_KEY || "";

    // 필수 파라미터
    apiUrl.searchParams.append("serviceKey", serviceKey);
    apiUrl.searchParams.append("pageNo", "1");
    apiUrl.searchParams.append("numOfRows", "100");
    apiUrl.searchParams.append("type", "json");
    apiUrl.searchParams.append("prdct_nm", query);

    console.log("API URL:", apiUrl.toString());

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      console.error("API Error Status:", response.status);
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Response:", data);

    // ==========================================
    // 사용자 알레르기 정보 조회
    // ==========================================
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

    console.log("👤 사용자 알레르기:", userAllergens);

    // ==========================================
    // 결과 그룹화 (바코드별로 중복 제거)
    // ==========================================
    const productMap = new Map<
      string,
      {
        foodCode: string;
        foodName: string;
        allergens: string[];
        hasAllergen: boolean;
      }
    >();

    const rawItems = data.body?.items || [];

    rawItems.forEach((item: any) => {
      const foodCode = item.BRCD_NO; // 바코드
      const foodName = item.PRDCT_NM; // 제품명
      const allergen = item.ALG_CSG_MTR_NM; // 알레르기 성분명

      if (!foodCode) return;

      // 기존 제품이 있으면 가져오기, 없으면 새로 생성
      if (!productMap.has(foodCode)) {
        productMap.set(foodCode, {
          foodCode,
          foodName,
          allergens: [],
          hasAllergen: false,
        });
      }

      const product = productMap.get(foodCode)!;

      // 알레르기 성분 추가 (중복 제거)
      if (allergen && !product.allergens.includes(allergen)) {
        product.allergens.push(allergen);

        // 사용자 알레르기와 매칭
        const matched = userAllergens.some(
          (ua) => allergen.includes(ua) || ua.includes(allergen),
        );
        if (matched) {
          product.hasAllergen = true;
        }
      }
    });

    // Map을 배열로 변환
    const items = Array.from(productMap.values()).map((product) => ({
      foodCode: product.foodCode,
      foodName: product.foodName,
      manufacturer: "정보없음", // ✅ 알레르기 API에는 제조사 정보 없음
      allergens: product.allergens, // ✅ 알레르기 성분 목록 추가
      hasAllergen: product.hasAllergen,
    }));

    console.log(`✅ 검색 결과: ${items.length}개 제품`);
    console.log("샘플:", items.slice(0, 2));

    return NextResponse.json({
      success: true,
      items,
      totalCount: items.length,
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
