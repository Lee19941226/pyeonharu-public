import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, userAllergens } = await req.json();

    console.log("🤖 AI 이미지 분석 시작...");
    console.log("👤 사용자 알레르기:", userAllergens);

    // ==========================================
    // Step 1: OpenAI Vision으로 이미지 분석
    // ==========================================
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `당신은 식품 성분 분석 전문가입니다.
이미지를 보고 다음 정보를 JSON 형태로 추출하세요:

1. productName: 제품명 (있으면)
2. manufacturer: 제조사/브랜드 (있으면)
3. barcode: 바코드 숫자 (있으면)
4. ingredients: 원재료 리스트 (배열) - 순서대로 번호를 매겨서
   - 성분표가 있으면: 모든 원재료를 정확히 순서대로
   - 성분표가 없으면: 이미지에 보이는 음식 재료
5. allergens: 알레르기 유발 물질 (배열)
   - 한국 식약처 지정 22가지: 계란, 우유, 밀, 메밀, 땅콩, 대두, 호두, 잣, 견과류, 갑각류, 새우, 게, 고등어, 오징어, 조개류, 생선, 복숭아, 토마토, 돼지고기, 쇠고기, 닭고기, 아황산류
6. weight: 용량/중량 (있으면, 예: "200ml", "150g")
7. nutritionInfo: 영양정보 (있으면)
   - servingSize: 1회 제공량
   - calories: 열량
   - sodium: 나트륨
   - carbs: 탄수화물
   - sugars: 당류
   - fat: 지방
   - protein: 단백질

반드시 JSON만 반환하세요. 다른 설명 없이.

예시:
{
  "productName": "빙그레 바나나맛 우유",
  "manufacturer": "빙그레",
  "barcode": "8801234567890",
  "ingredients": [
    "원유(국산) 80%",
    "설탕",
    "바나나농축액 1%",
    "합성착향료(바나나향)",
    "카라멜색소",
    "안정제"
  ],
  "allergens": ["우유"],
  "weight": "240ml",
  "nutritionInfo": {
    "servingSize": "240ml",
    "calories": "190kcal",
    "sodium": "140mg",
    "carbs": "28g",
    "sugars": "25g",
    "fat": "6g",
    "protein": "6g"
  }
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
      max_tokens: 1500,
    });

    const aiResult = visionResponse.choices[0].message.content || "{}";
    console.log("🤖 AI 분석 결과:", aiResult);

    // JSON 파싱
    let analysisData;
    try {
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
    // Step 2: 사용자 알레르기와 매칭
    // ==========================================
    const detectedAllergens = analysisData.allergens || [];
    const matchedUserAllergens: string[] = [];

    if (userAllergens && userAllergens.length > 0) {
      detectedAllergens.forEach((allergen: string) => {
        userAllergens.forEach((userAllergen: string) => {
          if (
            allergen.includes(userAllergen) ||
            userAllergen.includes(allergen)
          ) {
            if (!matchedUserAllergens.includes(userAllergen)) {
              matchedUserAllergens.push(userAllergen);
            }
          }
        });
      });
    }

    const hasUserAllergen = matchedUserAllergens.length > 0;

    console.log("✅ 매칭 결과:", {
      detectedAllergens,
      matchedUserAllergens,
      hasUserAllergen,
    });
    // ==========================================
    // ✨ Step 2.5: DB 캐시 조회 (제품명으로 검색)
    // ==========================================
    const supabase = await createClient();
    let dbProductData = null;

    if (analysisData.productName) {
      console.log("🔍 DB 캐시 검색:", analysisData.productName);

      const { data: cacheData } = await supabase
        .from("food_search_cache")
        .select("*")
        .ilike("food_name", `%${analysisData.productName}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheData) {
        dbProductData = {
          productName: cacheData.food_name,
          manufacturer: cacheData.manufacturer || "",
          barcode: cacheData.food_code,
          allergens: cacheData.allergens || [],
          rawMaterials: cacheData.raw_materials || "",
          weight: cacheData.weight || "",
        };
        console.log("✅ DB 캐시에서 발견:", dbProductData.productName);
      } else {
        console.log("❌ DB 캐시에 없음, Open API 진행");
      }
    }

    // ==========================================
    // Step 3: 바코드가 있으면 식약처 API 조회
    // ==========================================
    let foodCode = null;
    let apiProductData = null;

    if (analysisData.barcode) {
      console.log("📊 바코드 발견, 식약처 API 조회:", analysisData.barcode);

      const serviceKey = process.env.FOOD_API_KEY || "";
      const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

      try {
        // 알레르기 정보 조회
        const allergyUrl = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
        allergyUrl.searchParams.append("serviceKey", serviceKey);
        allergyUrl.searchParams.append("pageNo", "1");
        allergyUrl.searchParams.append("numOfRows", "1");
        allergyUrl.searchParams.append("type", "json");
        allergyUrl.searchParams.append("brcd_no", analysisData.barcode);

        const allergyResponse = await fetch(allergyUrl.toString());
        const allergyData = await allergyResponse.json();
        const allergyItems = allergyData.body?.items || [];

        if (allergyItems.length > 0) {
          const item = allergyItems[0];
          foodCode = item.BRCD_NO;

          // ✅ Open API에서 알레르기 정보 추출
          const apiAllergens: string[] = [];
          if (item.ALLERGY1) apiAllergens.push(item.ALLERGY1);
          if (item.ALLERGY2) apiAllergens.push(item.ALLERGY2);
          if (item.ALLERGY3) apiAllergens.push(item.ALLERGY3);
          if (item.ALLERGY4) apiAllergens.push(item.ALLERGY4);
          if (item.ALLERGY5) apiAllergens.push(item.ALLERGY5);
          if (item.ALLERGY6) apiAllergens.push(item.ALLERGY6);

          apiProductData = {
            productName: item.PRDLST_NM || analysisData.productName,
            manufacturer: item.BSSH_NM,
            barcode: item.BRCD_NO,
            allergens: apiAllergens.filter(Boolean),
            rawMaterials: item.RAWMTRL_NM || "",
            weight: item.CPCTY || "",
          };

          console.log("✅ Open API 제품 발견:", apiProductData);
        }
      } catch (error) {
        console.error("식약처 API 조회 실패:", error);
      }
    }

    // ==========================================
    // Step 4: 최종 결과 반환 (Open API 우선)
    // ==========================================

    let finalAllergens = detectedAllergens;
    let finalProductName = analysisData.productName;
    let finalIngredients = analysisData.ingredients || [];
    let dataSource = "ai";
    // foodCode 생성 (없으면 AI 기반 생성)
    if (!foodCode) {
      const timestamp = Date.now();
      const productSlug = finalProductName
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, "-")
        .slice(0, 30);
      foodCode = `ai-${productSlug}-${timestamp}`;
    }

    // DB에 저장 (중복 방지)
    try {
      await supabase.from("food_search_cache").upsert(
        {
          food_code: foodCode,
          food_name: finalProductName,
          manufacturer:
            apiProductData?.manufacturer ||
            analysisData.manufacturer ||
            "정보없음",
          allergens: finalAllergens,
          raw_materials:
            apiProductData?.rawMaterials || finalIngredients.join(", "),
          weight: apiProductData?.weight || analysisData.weight,
          data_source: dataSource,
        },
        { onConflict: "food_code" },
      );
      console.log("✅ 분석 결과 DB 저장 완료:", foodCode);
    } catch (error) {
      console.error("❌ DB 저장 실패:", error);
    }
    // 1순위: DB 캐시 데이터
    if (dbProductData && dbProductData.allergens.length > 0) {
      finalAllergens = dbProductData.allergens;
      finalProductName = dbProductData.productName;
      dataSource = "database";

      if (dbProductData.rawMaterials) {
        const rawMaterialsList = dbProductData.rawMaterials
          .split(/[,\(\)]+/)
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0);
        finalIngredients = rawMaterialsList;
      }

      console.log("✅ DB 캐시 데이터 우선 적용");
    }
    // 2순위: Open API 데이터
    else if (apiProductData && apiProductData.allergens.length > 0) {
      finalAllergens = apiProductData.allergens;
      finalProductName = apiProductData.productName;
      dataSource = "openapi";

      if (apiProductData.rawMaterials) {
        const rawMaterialsList = apiProductData.rawMaterials
          .split(/[,\(\)]+/)
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0);
        finalIngredients = rawMaterialsList;
      }

      console.log("✅ Open API 데이터 적용");
    }
    // 3순위: AI 분석 결과 (그대로 사용)
    else {
      console.log("✅ AI 분석 결과 사용");
    }

    // 사용자 알레르기 재매칭
    const finalMatchedAllergens: string[] = [];
    if (userAllergens && userAllergens.length > 0) {
      finalAllergens.forEach((allergen: string) => {
        userAllergens.forEach((userAllergen: string) => {
          if (
            allergen.includes(userAllergen) ||
            userAllergen.includes(allergen)
          ) {
            if (!finalMatchedAllergens.includes(userAllergen)) {
              finalMatchedAllergens.push(userAllergen);
            }
          }
        });
      });
    }

    const finalHasUserAllergen = finalMatchedAllergens.length > 0;

    console.log("🎯 최종 결과:", {
      dataSource,
      allergens: finalAllergens,
      matchedUserAllergens: finalMatchedAllergens,
    });

    return NextResponse.json({
      success: true,
      productName: finalProductName,
      manufacturer: apiProductData?.manufacturer || analysisData.manufacturer,
      weight: apiProductData?.weight || analysisData.weight,
      detectedIngredients: finalIngredients,
      allergens: finalAllergens,
      hasUserAllergen: finalHasUserAllergen,
      matchedUserAllergens: finalMatchedAllergens,
      foodCode,
      dataSource,
      rawMaterials: apiProductData?.rawMaterials,
      nutritionInfo: analysisData.nutritionInfo,
    });
  } catch (error) {
    console.error("💥 분석 에러:", error);
    return NextResponse.json(
      { success: false, error: "이미지 분석 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
