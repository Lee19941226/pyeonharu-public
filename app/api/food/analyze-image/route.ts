import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    console.log("🔍 AI 이미지 분석 시작...");

    // ==========================================
    // Step 1: OpenAI Vision으로 이미지 분석
    // ==========================================
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o", // Vision 지원 모델
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `당신은 식품 성분 분석 전문가입니다. 
이미지를 분석해서 다음 정보를 JSON 형태로 추출하세요:

1. barcode: 바코드 숫자 (있으면)
2. productName: 제품명 (있으면)
3. ingredients: 이미지에 보이는 모든 재료/성분 (배열)
   - 성분표가 있으면: 성분표의 모든 원재료
   - 성분표가 없으면: 이미지에 보이는 음식 재료 (새우, 파, 면, 고추 등)
4. hasNutritionLabel: 성분표가 있는지 여부 (true/false)

반드시 JSON만 반환하세요. 다른 설명 없이.

예시:
{
  "barcode": "8801234567890",
  "productName": "새우튀김",
  "ingredients": ["새우", "밀가루", "식용유", "소금"],
  "hasNutritionLabel": true
}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const aiResult = visionResponse.choices[0].message.content || "{}";
    console.log("🤖 AI 분석 결과:", aiResult);

    // JSON 파싱
    let analysisData;
    try {
      // GPT가 ```json으로 감쌀 수 있으므로 제거
      const cleanJson = aiResult
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      analysisData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON 파싱 실패:", e);
      return NextResponse.json(
        { success: false, error: "AI 분석 결과를 파싱할 수 없습니다" },
        { status: 400 },
      );
    }

    // ==========================================
    // Step 2: 바코드가 있으면 직접 조회
    // ==========================================
    if (analysisData.barcode) {
      console.log("✅ 바코드 발견:", analysisData.barcode);
      return NextResponse.json({
        success: true,
        data: {
          foodCode: analysisData.barcode,
          method: "barcode",
        },
      });
    }

    // ==========================================
    // Step 3: 제품명이 있으면 식약처 API 검색
    // ==========================================
    if (analysisData.productName) {
      console.log("🔍 제품명으로 검색:", analysisData.productName);

      const searchResults = await searchFoodByName(analysisData.productName);

      if (searchResults.length > 0) {
        // 결과가 1개면 바로 리턴
        if (searchResults.length === 1) {
          return NextResponse.json({
            success: true,
            data: {
              foodCode: searchResults[0].foodCode,
              method: "product_name",
            },
          });
        }

        // 여러 개면 선택 화면으로
        return NextResponse.json({
          success: true,
          data: {
            method: "multiple_results",
            candidates: searchResults,
          },
        });
      }
    }

    // ==========================================
    // Step 4: 재료명으로 검색 (최후의 수단)
    // ==========================================
    if (analysisData.ingredients && analysisData.ingredients.length > 0) {
      console.log("🥘 재료명으로 검색:", analysisData.ingredients);

      const ingredientResults = await searchByIngredients(
        analysisData.ingredients,
      );

      if (ingredientResults.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            method: "ingredients",
            candidates: ingredientResults,
            detectedIngredients: analysisData.ingredients,
          },
        });
      }
    }

    // ==========================================
    // Step 5: 아무것도 못 찾음
    // ==========================================
    return NextResponse.json({
      success: false,
      error: "식품 정보를 찾을 수 없습니다. 더 선명한 사진을 시도해보세요.",
      analysisData, // 디버깅용
    });
  } catch (error) {
    console.error("💥 분석 에러:", error);
    return NextResponse.json(
      { success: false, error: "이미지 분석 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

// ==========================================
// 헬퍼 함수: 제품명으로 검색
// ==========================================
async function searchFoodByName(productName: string) {
  const serviceKey = process.env.FOOD_API_KEY || "";
  const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

  try {
    const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
    url.searchParams.append("serviceKey", serviceKey);
    url.searchParams.append("pageNo", "1");
    url.searchParams.append("numOfRows", "10");
    url.searchParams.append("type", "json");
    url.searchParams.append("prdct_nm", productName);

    const response = await fetch(url.toString());
    const data = await response.json();
    const items = data.body?.items || [];

    // 바코드별로 그룹화 (중복 제거)
    const uniqueProducts = new Map();
    items.forEach((item: any) => {
      const code = item.BRCD_NO;
      if (!uniqueProducts.has(code)) {
        uniqueProducts.set(code, {
          foodCode: code,
          foodName: item.PRDCT_NM,
          manufacturer: "정보없음",
        });
      }
    });

    return Array.from(uniqueProducts.values()).slice(0, 5); // 최대 5개
  } catch (error) {
    console.error("제품명 검색 실패:", error);
    return [];
  }
}

// ==========================================
// 헬퍼 함수: 재료명으로 검색 (✅ 관련성 필터링 추가)
// ==========================================
async function searchByIngredients(ingredients: string[]) {
  const serviceKey = process.env.FOOD_API_KEY || "";
  const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

  try {
    // 주요 재료 (첫 3개)만 사용
    const mainIngredients = ingredients.slice(0, 3);
    console.log("🔍 재료로 검색:", mainIngredients);

    // ✅ 관련성 점수 계산 함수
    const calculateRelevance = (
      foodName: string,
      ingredient: string,
    ): number | null => {
      const lowerName = foodName.toLowerCase();
      const lowerIngredient = ingredient.toLowerCase();

      // 1. 제품명에 재료명이 포함 (80점) - 가장 관련성 높음
      if (lowerName.includes(lowerIngredient)) {
        return 80;
      }

      // 2. 제품명이 재료로 시작 (90점)
      if (lowerName.startsWith(lowerIngredient)) {
        return 90;
      }

      // 3. 원재료에만 포함 (50점) - 관련성 낮음
      return 50;
    };

    // 각 재료로 검색
    const productScores = new Map<
      string,
      { foodName: string; score: number; ingredient: string }
    >();

    for (const ingredient of mainIngredients) {
      const url = new URL(`${baseUrl}/getFoodQrProdRawmtrl01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "30");
      url.searchParams.append("type", "json");
      url.searchParams.append("prvw_cn", ingredient);

      const response = await fetch(url.toString());
      const data = await response.json();
      const items = data.body?.items || [];

      console.log(`  "${ingredient}" 검색 결과: ${items.length}개`);

      items.forEach((item: any) => {
        const code = item.BRCD_NO;
        const foodName = item.PRDCT_NM;

        if (!code || !foodName) return;

        // ✅ 관련성 점수 계산
        const score = calculateRelevance(foodName, ingredient);

        if (!score) return;

        // 이미 있는 제품이면 더 높은 점수로 업데이트
        if (productScores.has(code)) {
          const existing = productScores.get(code)!;
          if (score > existing.score) {
            productScores.set(code, { foodName, score, ingredient });
          }
        } else {
          productScores.set(code, { foodName, score, ingredient });
        }
      });
    }

    // ✅ 60점 이상만 필터링 (제품명 포함 이상)
    const MINIMUM_SCORE = 60;

    const filteredResults = Array.from(productScores.entries())
      .filter(([_, data]) => data.score >= MINIMUM_SCORE)
      .sort((a, b) => {
        // 점수 높은 순
        if (b[1].score !== a[1].score) {
          return b[1].score - a[1].score;
        }
        // 제품명 가나다순
        return a[1].foodName.localeCompare(b[1].foodName, "ko");
      })
      .slice(0, 10) // 최대 10개
      .map(([code, data]) => ({
        foodCode: code,
        foodName: data.foodName,
        matchedIngredient: data.ingredient,
        relevanceScore: data.score,
      }));

    console.log(`✅ 필터링 후 결과: ${filteredResults.length}개`);
    if (filteredResults.length > 0) {
      console.log(
        "  상위 3개:",
        filteredResults
          .slice(0, 3)
          .map(
            (r) =>
              `${r.foodName} (${r.relevanceScore}점 - ${r.matchedIngredient})`,
          ),
      );
    }

    return filteredResults;
  } catch (error) {
    console.error("재료명 검색 실패:", error);
    return [];
  }
}
