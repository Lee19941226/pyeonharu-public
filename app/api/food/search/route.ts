import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

    // ==========================================
    // API 1: 제품명으로 검색 (알레르기 API)
    // ==========================================
    const allergyApiUrl = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
    allergyApiUrl.searchParams.append("serviceKey", serviceKey);
    allergyApiUrl.searchParams.append("pageNo", "1");
    allergyApiUrl.searchParams.append("numOfRows", "50");
    allergyApiUrl.searchParams.append("type", "json");
    allergyApiUrl.searchParams.append("prdct_nm", query);

    console.log("📡 제품명 검색 API");

    const allergyResponse = await fetch(allergyApiUrl.toString());
    const allergyData = await allergyResponse.json();
    const allergyItems = allergyData.body?.items || [];

    console.log(`✅ 제품명 검색: ${allergyItems.length}개`);

    // ==========================================
    // API 2: 원재료로 검색 (원재료 API)
    // ==========================================
    const rawMaterialApiUrl = new URL(`${baseUrl}/getFoodQrProdRawmtrl01`);
    rawMaterialApiUrl.searchParams.append("serviceKey", serviceKey);
    rawMaterialApiUrl.searchParams.append("pageNo", "1");
    rawMaterialApiUrl.searchParams.append("numOfRows", "50");
    rawMaterialApiUrl.searchParams.append("type", "json");
    rawMaterialApiUrl.searchParams.append("prvw_cn", query);

    console.log("📡 원재료 검색 API");

    const rawMaterialResponse = await fetch(rawMaterialApiUrl.toString());
    const rawMaterialData = await rawMaterialResponse.json();
    const rawMaterialItems = rawMaterialData.body?.items || [];

    console.log(`✅ 원재료 검색: ${rawMaterialItems.length}개`);

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
        searchType: string;
      }
    >();

    // 제품명 검색 결과 처리
    allergyItems.forEach((item: any) => {
      const foodCode = item.BRCD_NO;
      const foodName = item.PRDCT_NM;
      const allergen = item.ALG_CSG_MTR_NM;

      if (!foodCode) return;

      if (!productMap.has(foodCode)) {
        productMap.set(foodCode, {
          foodCode,
          foodName,
          allergens: [],
          hasAllergen: false,
          searchType: "제품명",
        });
      }

      const product = productMap.get(foodCode)!;

      if (allergen && !product.allergens.includes(allergen)) {
        product.allergens.push(allergen);

        const matched = userAllergens.some(
          (ua) => allergen.includes(ua) || ua.includes(allergen),
        );
        if (matched) {
          product.hasAllergen = true;
        }
      }
    });

    // 원재료 검색 결과 처리 (중복 제거)
    rawMaterialItems.forEach((item: any) => {
      const foodCode = item.BRCD_NO;
      const foodName = item.PRDCT_NM;

      if (!foodCode) return;

      if (!productMap.has(foodCode)) {
        productMap.set(foodCode, {
          foodCode,
          foodName,
          allergens: [],
          hasAllergen: false,
          searchType: "원재료",
        });
      }
    });

    // Map을 배열로 변환
    const items = Array.from(productMap.values()).map((product) => ({
      foodCode: product.foodCode,
      foodName: product.foodName,
      manufacturer: "정보없음",
      allergens: product.allergens,
      hasAllergen: product.hasAllergen,
      searchType: product.searchType,
    }));

    console.log(`✅ 최종 검색 결과: ${items.length}개 제품 (중복 제거)`);

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
