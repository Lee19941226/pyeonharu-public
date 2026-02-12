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
    interface AIAnalysisResult {
      productName: string;
      manufacturer: string;
      barcode: string;
      confidence: number;
      category: string;
      ingredients: string[];
      allergens: string[];
      weight: string;
      nutritionInfo: {
        servingSize?: string;
        calories?: string;
        sodium?: string;
        carbs?: string;
        sugars?: string;
        fat?: string;
        protein?: string;
      } | null;
      identificationReason: string;
    }
    let analysisData: AIAnalysisResult;
    try {
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06", // ✅ structured outputs 지원 모델
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `당신은 한국 식품 이미지 판별 전문가입니다.

[작업 목표]
업로드된 이미지 속 식품이 무엇인지 추론하고, 여러 후보 중 가장 가능성이 높은 단 1개의 제품/음식만 최종 선택하세요.

[판별 프로세스]
1. 이미지로부터 가능한 후보 식품 3~5개를 내부적으로 추론하세요.
2. 각 후보에 대해 시각적 특징, 텍스트 정보, 포장 형태 등을 종합하여 일치 확률(0~100)을 평가하세요.
3. 가장 높은 확률을 가진 후보 1개만 최종 선택하세요.
4. 확률이 50 미만이면 productName을 "식별 불확실"로 응답하세요.

[식품 유형 구분]
- 포장식품: 제품명, 제조사, 바코드, 정확한 원재료 추출
- 조리음식: 음식명, 주요 재료, 추정 알레르기 성분  
- 식재료: 재료명, 추정 알레르기 성분

알레르기 유발 물질은 한국 식약처 지정 22가지 중에서만 선택하세요.`,
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
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "food_identification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                productName: {
                  type: "string",
                  description: "제품명 또는 음식명 (예: 신라면, 비빔밥)",
                },
                manufacturer: {
                  type: "string",
                  description: "제조사/브랜드 (없으면 빈 문자열)",
                },
                barcode: {
                  type: "string",
                  description: "바코드 숫자 (없으면 빈 문자열)",
                },
                confidence: {
                  type: "number",
                  description: "신뢰도 0~100",
                },
                category: {
                  type: "string",
                  enum: ["포장식품", "조리음식", "식재료"],
                },
                ingredients: {
                  type: "array",
                  items: { type: "string" },
                  description: "원재료 목록",
                },
                allergens: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "계란",
                      "우유",
                      "밀",
                      "메밀",
                      "땅콩",
                      "대두",
                      "호두",
                      "잣",
                      "견과류",
                      "갑각류",
                      "새우",
                      "게",
                      "고등어",
                      "오징어",
                      "조개류",
                      "생선",
                      "복숭아",
                      "토마토",
                      "돼지고기",
                      "쇠고기",
                      "닭고기",
                      "아황산류",
                    ],
                  },
                  description: "알레르기 유발 물질",
                },
                weight: {
                  type: "string",
                  description: "용량/중량 (예: 120g, 없으면 빈 문자열)",
                },
                nutritionInfo: {
                  type: "object",
                  properties: {
                    servingSize: { type: "string" },
                    calories: { type: "string" },
                    sodium: { type: "string" },
                    carbs: { type: "string" },
                    sugars: { type: "string" },
                    fat: { type: "string" },
                    protein: { type: "string" },
                  },
                  required: [
                    "servingSize",
                    "calories",
                    "sodium",
                    "carbs",
                    "sugars",
                    "fat",
                    "protein",
                  ],
                  additionalProperties: false,
                },
                identificationReason: {
                  type: "string",
                  description: "이 제품/음식으로 판단한 근거",
                },
              },
              required: [
                "productName",
                "manufacturer",
                "barcode",
                "confidence",
                "category",
                "ingredients",
                "allergens",
                "weight",
                "nutritionInfo",
                "identificationReason",
              ],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.2,
      });

      // 이제 파싱 불필요! 바로 사용
      const messageContent = visionResponse.choices[0]?.message?.content;

      if (!messageContent) {
        throw new Error("AI 응답이 비어있습니다");
      }

      analysisData = JSON.parse(messageContent) as AIAnalysisResult;

      // 기본값 설정
      const safeAnalysisData = {
        productName: analysisData.productName || "식별 불확실",
        manufacturer: analysisData.manufacturer || "",
        barcode: analysisData.barcode || "",
        confidence: analysisData.confidence ?? 0,
        category: analysisData.category || "식재료",
        ingredients: analysisData.ingredients || [],
        allergens: analysisData.allergens || [],
        weight: analysisData.weight || "",
        nutritionInfo: analysisData.nutritionInfo || null,
        identificationReason: analysisData.identificationReason || "",
      };

      if (safeAnalysisData.confidence < 50) {
        console.log("⚠️ 낮은 신뢰도:", safeAnalysisData.confidence);
        safeAnalysisData.productName = "식별 불확실";
      }

      console.log("✅ AI 최종 선택:", {
        name: safeAnalysisData.productName,
        confidence: safeAnalysisData.confidence,
        category: safeAnalysisData.category,
      });
    } catch (aiError) {
      console.error("❌ AI 분석 실패:", aiError);
      return NextResponse.json(
        {
          success: false,
          error: "AI 이미지 분석에 실패했습니다. 다시 시도해주세요.",
        },
        { status: 500 },
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
    // Step 2.5: DB 캐시에서 제품명 검색
    // ==========================================
    const supabase = await createClient();
    let dbProductData = null;

    if (analysisData.productName) {
      console.log("🔍 DB 캐시 검색:", analysisData.productName);

      try {
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
      } catch (dbError) {
        console.error("⚠️ DB 조회 오류:", dbError);
      }
    }

    // ==========================================
    // Step 3: 바코드가 있으면 식약처 API 조회
    // ==========================================
    let foodCode = null;
    let apiProductData = null;

    if (!dbProductData && analysisData.barcode) {
      console.log("📊 바코드 발견, 식약처 API 조회:", analysisData.barcode);

      const serviceKey = process.env.FOOD_API_KEY || "";
      const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

      try {
        const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
        url.searchParams.append("serviceKey", serviceKey);
        url.searchParams.append("pageNo", "1");
        url.searchParams.append("numOfRows", "1");
        url.searchParams.append("type", "json");
        url.searchParams.append("brcd_no", analysisData.barcode);

        const allergyResponse = await fetch(url.toString());
        const allergyData = await allergyResponse.json();
        const allergyItems = allergyData.body?.items || [];

        if (allergyItems.length > 0) {
          const item = allergyItems[0];
          foodCode = item.BRCD_NO;

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
      } catch (apiError) {
        console.error("❌ 식약처 API 조회 실패:", apiError);
      }
    }

    // ==========================================
    // Step 4: 최종 결과 우선순위 결정
    // ==========================================
    let finalAllergens = detectedAllergens;
    let finalProductName = analysisData.productName;
    let finalIngredients = analysisData.ingredients || [];
    let dataSource = "ai";

    // 1순위: DB 캐시
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
      foodCode = dbProductData.barcode;
    }
    // 2순위: Open API
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
    // 3순위: AI 분석 결과
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

    // ==========================================
    // Step 5: DB에 저장
    // ==========================================
    let dbSaveSuccess = false;
    if (!foodCode) {
      const timestamp = Date.now();

      // ✅ finalProductName이 없을 경우 기본값 사용
      const safeName = finalProductName || "알 수 없는 제품";
      const productSlug = safeName
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, "-")
        .slice(0, 30);

      foodCode = `ai-${productSlug}-${timestamp}`;
    }

    try {
      const { error: saveError } = await supabase
        .from("food_search_cache")
        .upsert(
          {
            food_code: foodCode,
            food_name: finalProductName || "알 수 없는 제품",
            manufacturer:
              apiProductData?.manufacturer ||
              analysisData.manufacturer ||
              "정보없음",
            allergens: finalAllergens,
            raw_materials:
              apiProductData?.rawMaterials ||
              finalIngredients.join(", ") ||
              null,
            data_source: dataSource,
          },
          { onConflict: "food_code" },
        );

      if (saveError) {
        console.error("❌ DB 저장 실패:", saveError);
      } else {
        console.log("✅ 분석 결과 DB 저장 완료:", foodCode);
      }
    } catch (saveError) {
      console.error("❌ DB 저장 중 오류:", saveError);
    }

    // ==========================================
    // Step 6: 최종 결과 반환
    // ==========================================
    return NextResponse.json({
      success: true,
      productName: finalProductName || "알 수 없는 제품",
      manufacturer:
        apiProductData?.manufacturer || analysisData.manufacturer || "",
      weight: apiProductData?.weight || analysisData.weight || "",
      detectedIngredients: finalIngredients,
      allergens: finalAllergens,
      hasUserAllergen: finalHasUserAllergen,
      matchedUserAllergens: finalMatchedAllergens,
      foodCode: dbSaveSuccess ? foodCode : null,
      dataSource,
      rawMaterials: apiProductData?.rawMaterials || null,
      nutritionInfo: analysisData.nutritionInfo,
    });

    // ==========================================
    // Step 6: 최종 결과 반환
    // ==========================================
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
    console.error("💥 전체 분석 에러:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "이미지 분석 중 오류가 발생했습니다",
      },
      { status: 500 },
    );
  }
}
