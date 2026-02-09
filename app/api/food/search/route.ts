import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query) {
      return NextResponse.json({
        success: true,
        items: [],
        totalCount: 0,
      });
    }

    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

    // ==========================================
    // API 1: 제품명으로 검색 (알레르기 API)
    // ==========================================
    const allergyApiUrl = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
    allergyApiUrl.searchParams.append("serviceKey", serviceKey);
    allergyApiUrl.searchParams.append("pageNo", "1");
    allergyApiUrl.searchParams.append("numOfRows", "100");
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
    rawMaterialApiUrl.searchParams.append("numOfRows", "100");
    rawMaterialApiUrl.searchParams.append("type", "json");
    rawMaterialApiUrl.searchParams.append("prvw_cn", query);

    console.log("📡 원재료 검색 API");

    const rawMaterialResponse = await fetch(rawMaterialApiUrl.toString());
    const rawMaterialData = await rawMaterialResponse.json();
    const rawMaterialItems = rawMaterialData.body?.items || [];

    console.log(`✅ 원재료 검색: ${rawMaterialItems.length}개`);

    // ==========================================
    // API 3: 주의사항 검색 (교차오염 정보)
    // ==========================================
    const attentionApiUrl = new URL(`${baseUrl}/getFoodQrIndctAttnInfo01`);
    attentionApiUrl.searchParams.append("serviceKey", serviceKey);
    attentionApiUrl.searchParams.append("pageNo", "1");
    attentionApiUrl.searchParams.append("numOfRows", "100");
    attentionApiUrl.searchParams.append("type", "json");
    attentionApiUrl.searchParams.append("prdlst_atnt", query);

    console.log("📡 주의사항 검색 API");

    const attentionResponse = await fetch(attentionApiUrl.toString());
    const attentionData = await attentionResponse.json();
    const attentionItems = attentionData.body?.items || [];

    console.log(`✅ 주의사항 검색: ${attentionItems.length}개`);

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
        searchTypes: Set<string>;
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
          searchTypes: new Set(),
        });
      }

      const product = productMap.get(foodCode)!;
      product.searchTypes.add("제품명");

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

    // 원재료 검색 결과 처리
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
          searchTypes: new Set(),
        });
      }

      const product = productMap.get(foodCode)!;
      product.searchTypes.add("원재료");
    });

    // 주의사항 검색 결과 처리 (교차오염)
    attentionItems.forEach((item: any) => {
      const foodCode = item.BRCD_NO;
      const foodName = item.PRDCT_NM;

      if (!foodCode) return;

      if (!productMap.has(foodCode)) {
        productMap.set(foodCode, {
          foodCode,
          foodName,
          allergens: [],
          hasAllergen: false,
          searchTypes: new Set(),
        });
      }

      const product = productMap.get(foodCode)!;
      product.searchTypes.add("교차오염 주의");
    });

    // Map을 배열로 변환
    const items = Array.from(productMap.values()).map((product) => ({
      foodCode: product.foodCode,
      foodName: product.foodName,
      manufacturer: "정보없음",
      allergens: product.allergens,
      hasAllergen: product.hasAllergen,
      searchType: Array.from(product.searchTypes).join(" · "),
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
