import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ProductScore {
  foodCode: string;
  foodName: string;
  allergens: string[];
  hasAllergen: boolean;
  score: number;
  matchReason: string;
}

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
    const normalizedQuery = query.toLowerCase().trim();

    // ==========================================
    // API 1: 제품명으로 검색
    // ==========================================
    const allergyApiUrl = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
    allergyApiUrl.searchParams.append("serviceKey", serviceKey);
    allergyApiUrl.searchParams.append("pageNo", "1");
    allergyApiUrl.searchParams.append("numOfRows", "100");
    allergyApiUrl.searchParams.append("type", "json");
    allergyApiUrl.searchParams.append("prdct_nm", query);

    console.log("📡 제품명 검색 API:", query);

    const allergyResponse = await fetch(allergyApiUrl.toString());
    const allergyData = await allergyResponse.json();
    const allergyItems = allergyData.body?.items || [];

    console.log(`✅ 제품명 검색: ${allergyItems.length}개`);

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
    // ✅ 관련성 점수 계산
    // ==========================================
    const calculateMatch = (
      foodName: string,
      searchQuery: string,
      allergen?: string,
    ): { score: number; reason: string } | null => {
      const lowerName = foodName.toLowerCase();
      const lowerQuery = searchQuery.toLowerCase();

      if (!lowerName.includes(lowerQuery)) {
        if (allergen && allergen.toLowerCase().includes(lowerQuery)) {
          return { score: 70, reason: `알레르기 성분: ${allergen}` };
        }
        return null;
      }

      if (lowerName === lowerQuery) {
        return { score: 100, reason: `제품명 일치` };
      }

      if (lowerName.startsWith(lowerQuery)) {
        return { score: 90, reason: `제품명에 '${searchQuery}' 포함` };
      }

      return { score: 80, reason: `제품명에 '${searchQuery}' 포함` };
    };

    // ==========================================
    // 결과 그룹화
    // ==========================================
    const productMap = new Map<string, ProductScore>();

    allergyItems.forEach((item: any) => {
      const foodCode = item.BRCD_NO;
      const foodName = item.PRDCT_NM;
      const allergen = item.ALG_CSG_MTR_NM;

      if (!foodCode || !foodName) return;

      const match = calculateMatch(foodName, normalizedQuery, allergen);

      if (!match) {
        return;
      }

      if (!productMap.has(foodCode)) {
        productMap.set(foodCode, {
          foodCode,
          foodName,
          allergens: [],
          hasAllergen: false,
          score: match.score,
          matchReason: match.reason,
        });
      }

      const product = productMap.get(foodCode)!;

      if (match.score > product.score) {
        product.score = match.score;
        product.matchReason = match.reason;
      }

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

    // ==========================================
    // ✅ 제조사 정보 가져오기 (배치 처리)
    // ==========================================
    const MINIMUM_SCORE = 70;
    const filteredProducts = Array.from(productMap.values()).filter(
      (product) => product.score >= MINIMUM_SCORE,
    );

    console.log(`🏭 제조사 정보 조회 시작: ${filteredProducts.length}개`);

    // ✅ 모든 제품의 제조사 정보를 병렬로 조회
    const manufacturerPromises = filteredProducts.map(async (product) => {
      try {
        const url = new URL(`${baseUrl}/getFoodQrProdMnfInfo01`);
        url.searchParams.append("serviceKey", serviceKey);
        url.searchParams.append("pageNo", "1");
        url.searchParams.append("numOfRows", "1");
        url.searchParams.append("type", "json");
        url.searchParams.append("brcd_no", product.foodCode);

        const response = await fetch(url.toString());
        const data = await response.json();
        const info = data.body?.items?.[0];

        return {
          foodCode: product.foodCode,
          manufacturer: info?.MNFCTUR || "정보없음",
        };
      } catch (error) {
        console.error(`제조사 조회 실패: ${product.foodCode}`);
        return {
          foodCode: product.foodCode,
          manufacturer: "정보없음",
        };
      }
    });

    const manufacturerResults = await Promise.all(manufacturerPromises);

    // ✅ 제조사 정보를 Map으로 변환
    const manufacturerMap = new Map(
      manufacturerResults.map((r) => [r.foodCode, r.manufacturer]),
    );

    console.log(`✅ 제조사 정보 조회 완료`);

    // ==========================================
    // 최종 결과
    // ==========================================
    const items = filteredProducts
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (a.hasAllergen !== b.hasAllergen) {
          return a.hasAllergen ? -1 : 1;
        }
        return a.foodName.localeCompare(b.foodName, "ko");
      })
      .map((product) => ({
        foodCode: product.foodCode,
        foodName: product.foodName,
        allergens: product.allergens,
        hasAllergen: product.hasAllergen,
        matchReason: product.matchReason,
        relevanceScore: product.score,
      }));

    console.log(`✅ 최종 검색 결과: ${items.length}개 제품`);
    if (items.length > 0) {
      console.log(
        "  상위 3개:",
        items.slice(0, 3).map((i) => `${i.foodName}`),
      );
    }

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
