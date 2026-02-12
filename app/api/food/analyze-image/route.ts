import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, userAllergens } = await req.json();


    // ==========================================
    // Step 1: OpenAI Vision?쇰줈 ?대?吏 遺꾩꽍
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
        model: "gpt-4o-2024-08-06", // ??structured outputs 吏??紐⑤뜽
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `?뱀떊? ?쒓뎅 ?앺뭹 ?대?吏 ?먮퀎 ?꾨Ц媛?낅땲??

[?묒뾽 紐⑺몴]
?낅줈?쒕맂 ?대?吏 ???앺뭹??臾댁뾿?몄? 異붾줎?섍퀬, ?щ윭 ?꾨낫 以?媛??媛?μ꽦???믪? ??1媛쒖쓽 ?쒗뭹/?뚯떇留?理쒖쥌 ?좏깮?섏꽭??

[?먮퀎 ?꾨줈?몄뒪]
1. ?대?吏濡쒕???媛?ν븳 ?꾨낫 ?앺뭹 3~5媛쒕? ?대??곸쑝濡?異붾줎?섏꽭??
2. 媛??꾨낫??????쒓컖???뱀쭠, ?띿뒪???뺣낫, ?ъ옣 ?뺥깭 ?깆쓣 醫낇빀?섏뿬 ?쇱튂 ?뺣쪧(0~100)???됯??섏꽭??
3. 媛???믪? ?뺣쪧??媛吏??꾨낫 1媛쒕쭔 理쒖쥌 ?좏깮?섏꽭??
4. ?뺣쪧??50 誘몃쭔?대㈃ productName??"?앸퀎 遺덊솗??濡??묐떟?섏꽭??

[?앺뭹 ?좏삎 援щ텇]
- ?ъ옣?앺뭹: ?쒗뭹紐? ?쒖“?? 諛붿퐫?? ?뺥솗???먯옱猷?異붿텧
- 議곕━?뚯떇: ?뚯떇紐? 二쇱슂 ?щ즺, 異붿젙 ?뚮젅瑜닿린 ?깅텇  
- ?앹옱猷? ?щ즺紐? 異붿젙 ?뚮젅瑜닿린 ?깅텇

?뚮젅瑜닿린 ?좊컻 臾쇱쭏? ?쒓뎅 ?앹빟泥?吏??22媛吏 以묒뿉?쒕쭔 ?좏깮?섏꽭??`,
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
                  description: "?쒗뭹紐??먮뒗 ?뚯떇紐?(?? ?좊씪硫? 鍮꾨퉼諛?",
                },
                manufacturer: {
                  type: "string",
                  description: "?쒖“??釉뚮옖??(?놁쑝硫?鍮?臾몄옄??",
                },
                barcode: {
                  type: "string",
                  description: "諛붿퐫???レ옄 (?놁쑝硫?鍮?臾몄옄??",
                },
                confidence: {
                  type: "number",
                  description: "?좊ː??0~100",
                },
                category: {
                  type: "string",
                  enum: ["?ъ옣?앺뭹", "議곕━?뚯떇", "?앹옱猷?],
                },
                ingredients: {
                  type: "array",
                  items: { type: "string" },
                  description: "?먯옱猷?紐⑸줉",
                },
                allergens: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "怨꾨?",
                      "?곗쑀",
                      "諛",
                      "硫붾?",
                      "?낆쉘",
                      "???,
                      "?몃몢",
                      "??,
                      "寃ш낵瑜?,
                      "媛묎컖瑜?,
                      "?덉슦",
                      "寃?,
                      "怨좊벑??,
                      "?ㅼ쭠??,
                      "議곌컻瑜?,
                      "?앹꽑",
                      "蹂듭댂??,
                      "?좊쭏??,
                      "?쇱?怨좉린",
                      "?좉퀬湲?,
                      "??퀬湲?,
                      "?꾪솴?곕쪟",
                    ],
                  },
                  description: "?뚮젅瑜닿린 ?좊컻 臾쇱쭏",
                },
                weight: {
                  type: "string",
                  description: "?⑸웾/以묐웾 (?? 120g, ?놁쑝硫?鍮?臾몄옄??",
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
                  description: "???쒗뭹/?뚯떇?쇰줈 ?먮떒??洹쇨굅",
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

      // ?댁젣 ?뚯떛 遺덊븘?? 諛붾줈 ?ъ슜
      const messageContent = visionResponse.choices[0]?.message?.content;

      if (!messageContent) {
        throw new Error("AI ?묐떟??鍮꾩뼱?덉뒿?덈떎");
      }

      analysisData = JSON.parse(messageContent) as AIAnalysisResult;

      // 湲곕낯媛??ㅼ젙
      const safeAnalysisData = {
        productName: analysisData.productName || "?앸퀎 遺덊솗??,
        manufacturer: analysisData.manufacturer || "",
        barcode: analysisData.barcode || "",
        confidence: analysisData.confidence ?? 0,
        category: analysisData.category || "?앹옱猷?,
        ingredients: analysisData.ingredients || [],
        allergens: analysisData.allergens || [],
        weight: analysisData.weight || "",
        nutritionInfo: analysisData.nutritionInfo || null,
        identificationReason: analysisData.identificationReason || "",
      };

      if (safeAnalysisData.confidence < 50) {
        safeAnalysisData.productName = "?앸퀎 遺덊솗??;
      }

        name: safeAnalysisData.productName,
        confidence: safeAnalysisData.confidence,
        category: safeAnalysisData.category,
      });
    } catch (aiError) {
      console.error("??AI 遺꾩꽍 ?ㅽ뙣:", aiError);
      return NextResponse.json(
        {
          success: false,
          error: "AI ?대?吏 遺꾩꽍???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?쒕룄?댁＜?몄슂.",
        },
        { status: 500 },
      );
    }

    // ==========================================
    // Step 2: ?ъ슜???뚮젅瑜닿린? 留ㅼ묶
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

      detectedAllergens,
      matchedUserAllergens,
      hasUserAllergen,
    });

    // ==========================================
    // Step 2.5: DB 罹먯떆?먯꽌 ?쒗뭹紐?寃??
    // ==========================================
    const supabase = await createClient();
    let dbProductData = null;

    if (analysisData.productName) {

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
        } else {
        }
      } catch (dbError) {
        console.error("?좑툘 DB 議고쉶 ?ㅻ쪟:", dbError);
      }
    }

    // ==========================================
    // Step 3: 諛붿퐫?쒓? ?덉쑝硫??앹빟泥?API 議고쉶
    // ==========================================
    let foodCode = null;
    let apiProductData = null;

    if (!dbProductData && analysisData.barcode) {

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

        }
      } catch (apiError) {
        console.error("???앹빟泥?API 議고쉶 ?ㅽ뙣:", apiError);
      }
    }

    // ==========================================
    // Step 4: 理쒖쥌 寃곌낵 ?곗꽑?쒖쐞 寃곗젙
    // ==========================================
    let finalAllergens = detectedAllergens;
    let finalProductName = analysisData.productName;
    let finalIngredients = analysisData.ingredients || [];
    let dataSource = "ai";

    // 1?쒖쐞: DB 罹먯떆
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

      foodCode = dbProductData.barcode;
    }
    // 2?쒖쐞: Open API
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

    }
    // 3?쒖쐞: AI 遺꾩꽍 寃곌낵
    else {
    }

    // ?ъ슜???뚮젅瑜닿린 ?щℓ移?
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
    // Step 5: DB?????
    // ==========================================
    let dbSaveSuccess = false;
    if (!foodCode) {
      const timestamp = Date.now();

      // ??finalProductName???놁쓣 寃쎌슦 湲곕낯媛??ъ슜
      const safeName = finalProductName || "?????녿뒗 ?쒗뭹";
      const productSlug = safeName
        .toLowerCase()
        .replace(/[^a-z0-9媛-??/g, "-")
        .slice(0, 30);

      foodCode = `ai-${productSlug}-${timestamp}`;
    }

    try {
      const { error: saveError } = await supabase
        .from("food_search_cache")
        .upsert(
          {
            food_code: foodCode,
            food_name: finalProductName || "?????녿뒗 ?쒗뭹",
            manufacturer:
              apiProductData?.manufacturer ||
              analysisData.manufacturer ||
              "?뺣낫?놁쓬",
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
        console.error("??DB ????ㅽ뙣:", saveError);
      } else {
      }
    } catch (saveError) {
      console.error("??DB ???以??ㅻ쪟:", saveError);
    }

    // ==========================================
    // Step 6: 理쒖쥌 寃곌낵 諛섑솚
    // ==========================================
    return NextResponse.json({
      success: true,
      productName: finalProductName || "?????녿뒗 ?쒗뭹",
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
    // Step 6: 理쒖쥌 寃곌낵 諛섑솚
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
    console.error("?뮙 ?꾩껜 遺꾩꽍 ?먮윭:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "?대?吏 遺꾩꽍 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎",
      },
      { status: 500 },
    );
  }
}
