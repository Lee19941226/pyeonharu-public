import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || "";


    const supabase = await createClient();

    // ==========================================
    // DB 罹먯떆 ?곗꽑 議고쉶
    // ==========================================
    const { data: cachedData } = await supabase
      .from("food_search_cache")
      .select("*")
      .eq("food_code", code)
      .maybeSingle();

    if (cachedData) {

      // ?ъ슜???뚮젅瑜닿린 留ㅼ묶
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let userAllergens: any[] = [];

      if (user) {
        const { data: allergyData } = await supabase
          .from("user_allergies")
          .select("*")
          .eq("user_id", user.id);
        if (allergyData) userAllergens = allergyData;
      }

      const allergyNames = cachedData.allergens || [];
      const detectedAllergens = allergyNames.map((allergen: string) => {
        const match = userAllergens.find(
          (ua) =>
            allergen.includes(ua.allergen_name) ||
            ua.allergen_name.includes(allergen),
        );
        return match
          ? {
              name: allergen,
              severity: match.severity,
              code: match.allergen_code,
            }
          : { name: allergen, severity: null, code: null };
      });

      // ?먯옱猷??뚯떛
      const ingredients = cachedData.raw_materials
        ? cachedData.raw_materials.split(",").map((i: string) => i.trim())
        : [];

      return NextResponse.json({
        success: true,
        result: {
          foodCode: cachedData.food_code,
          foodName: cachedData.food_name,
          manufacturer: cachedData.manufacturer || "?뺣낫?놁쓬",
          weight: cachedData.weight || "",
          allergens: allergyNames,
          detectedAllergens,
          ingredients,
          nutrition: {},
          nutritionDetails: [],
          crossContamination: [],
          crossContaminationRisks: [],
          allergyWarning: "",
          dataSource: cachedData.data_source || "database",
          isSafe: detectedAllergens.length === 0,
          hasNutritionInfo: false,
        },
      });
    }


    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";
    // ==========================================
    // API 1: ?덈ぉ?쒖“?뺣낫 (getFoodQrProdMnfInfo01)
    // ==========================================
    let productInfo = null;
    try {
      const url = new URL(`${baseUrl}/getFoodQrProdMnfInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "1");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);


      const response = await fetch(url.toString());
      const data = await response.json();
      productInfo = data.body?.items?.[0] || null;

      if (productInfo) {
      }
    } catch (error) {
      console.error("?좑툘 ?덈ぉ?쒖“?뺣낫 ?ㅽ뙣");
    }

    // ==========================================
    // API 2: ?뚮젅瑜닿린?뺣낫 (getFoodQrAllrgyInfo01)
    // ==========================================
    let allergyItems = [];
    try {
      const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "100");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);


      const response = await fetch(url.toString());
      const data = await response.json();
      allergyItems = data.body?.items || [];

    } catch (error) {
      console.error("?좑툘 ?뚮젅瑜닿린?뺣낫 ?ㅽ뙣:", error);
    }

    // ==========================================
    // API 3: ?먯옱猷뚯젙蹂?(getFoodQrProdRawatrl01)
    // ==========================================
    let rawMaterialItems = [];
    try {
      const url = new URL(`${baseUrl}/getFoodQrProdRawmtrl01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "100");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);


      const response = await fetch(url.toString());
      const data = await response.json();
      rawMaterialItems = data.body?.items || [];


      if (rawMaterialItems.length > 0) {
          "?벀 ?먯옱猷??섑뵆:",
          rawMaterialItems[0].PRVW_CN?.substring(0, 100),
        );
      }
    } catch (error) {
      console.error("?좑툘 ?먯옱猷뚯젙蹂??ㅽ뙣:", error);
    }

    // ==========================================
    // API 4: ?곸뼇?쒖떆?뺣낫 (getFoodQrProdNsd01)
    // ==========================================
    let nutritionItems = [];
    try {
      const url = new URL(`${baseUrl}/getFoodQrProdNsd01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "50");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);


      const response = await fetch(url.toString());
      const data = await response.json();
      nutritionItems = data.body?.items || [];


      if (nutritionItems.length > 0) {
      }
    } catch (error) {
      console.error("?좑툘 ?곸뼇?쒖떆?뺣낫 ?ㅽ뙣:", error);
    }

    // ==========================================
    // ?곸뼇?뺣낫 異붿텧 (?곗씠??蹂묓빀 ?뱀뀡??異붽?)
    // ==========================================
    // 1???쒓났???뺣낫
    const servingSize =
      nutritionItems.length > 0
        ? `${nutritionItems[0].NTRTN_INDCT_TCT}${nutritionItems[0].NTRTN_INDCT_TCD}`
        : "";


    // ?곸뼇?깅텇 紐⑸줉
    const nutritionDetails = nutritionItems
      .map((item: any) => {
        const name = item.NIRWMT_NM || ""; // ???곸뼇?깅텇紐?(?대웾, ?섑듃瑜???
        const content = item.CTA || ""; // ???⑤웾 (370.000, 470.000 ??
        const unit = item.IGRD_UCD || ""; // ???⑥쐞 (kcal, mg, g)
        const percentage = item.NTRTN_RT || ""; // ?곸뼇?깅텇 湲곗?移?鍮꾩쑉

        return {
          name: name,
          content: content,
          unit: unit,
          percentage: percentage,
        };
      })
      .filter((item: any) => item.name && item.content);

    if (nutritionDetails.length > 0) {
    }

    // ==========================================
    // API 5: ?앺뭹?쒖떆?뺣낫 二쇱쓽?ы빆 (getFoodQrIndctAttnInfo01)
    // ==========================================
    let attentionInfo = null;
    try {
      const url = new URL(`${baseUrl}/getFoodQrIndctAttnInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", "1");
      url.searchParams.append("numOfRows", "1");
      url.searchParams.append("type", "json");
      url.searchParams.append("brcd_no", code);


      const response = await fetch(url.toString());
      const data = await response.json();
      attentionInfo = data.body?.items?.[0] || null;

    } catch (error) {
      console.error("?좑툘 二쇱쓽?ы빆?뺣낫 ?ㅽ뙣:", error);
    }

    // ==========================================
    // ?곗씠???뺤씤
    // ==========================================
    if (allergyItems.length === 0 && !productInfo) {
      return NextResponse.json(
        { success: false, error: "?앺뭹 ?뺣낫瑜?李얠쓣 ???놁뒿?덈떎" },
        { status: 404 },
      );
    }

    // ==========================================
    // ?곗씠??異붿텧 諛?媛怨?
    // ==========================================

    const productName =
      productInfo?.PRDCT_NM ||
      allergyItems[0]?.PRDCT_NM ||
      rawMaterialItems[0]?.PRDCT_NM ||
      "?????놁쓬";

    const manufacturer = productInfo?.MNFCTUR || "?뺣낫?놁쓬";
    const weight = productInfo?.PRDLST_DCNTS || "?뺣낫?놁쓬";

    // ?뚮젅瑜닿린 ?깅텇 (以묐났 ?쒓굅)
    const allergyNames: any[] = [
      ...new Set(
        allergyItems.map((item: any) => item.ALG_CSG_MTR_NM).filter(Boolean),
      ),
    ];

    // ???먯옱猷?異붿텧 (?섏젙)
    let rawMaterialsText = "";

    // 1?쒖쐞: ?먯옱猷?API (PRVW_CN ?꾨뱶)
    if (rawMaterialItems.length > 0) {
      rawMaterialsText = rawMaterialItems[0].PRVW_CN || "";
    }

    // 2?쒖쐞: ?덈ぉ?쒖“?뺣낫 API (諛깆뾽)
    if (!rawMaterialsText && productInfo) {
      rawMaterialsText = productInfo.RAWMTRL_NM || "";
    }


    // ???뺢탳???먯옱猷??뚯떛 ?⑥닔
    function parseIngredients(text: string): string[] {
      const ingredients: string[] = [];
      let current = "";
      let depth = 0; // 愿꾪샇 源딆씠

      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === "(" || char === "{" || char === "[") {
          depth++;
          current += char;
        } else if (char === ")" || char === "}" || char === "]") {
          depth--;
          current += char;
        } else if ((char === "," || char === "竊?) && depth === 0) {
          // 愿꾪샇 諛뽰쓽 ?쇳몴留?遺꾨━
          const trimmed = current.trim();
          if (trimmed) {
            ingredients.push(trimmed);
          }
          current = "";
        } else {
          current += char;
        }
      }

      // 留덉?留???ぉ
      const trimmed = current.trim();
      if (trimmed) {
        ingredients.push(trimmed);
      }

      return ingredients;
    }

    // ?먯옱猷?異붿텧 遺遺??섏젙
    const ingredients: string[] = rawMaterialsText
      ? parseIngredients(rawMaterialsText).slice(0, 30)
      : [];

    if (ingredients.length > 0) {
    }

    // ?뚮젅瑜닿린 二쇱쓽?ы빆
    const allergyWarning = attentionInfo?.PRDLST_ATNT || "";

    // ?곸뼇?뺣낫 留ㅽ븨
    const getNutritionValue = (name: string): number => {
      const item = nutritionItems.find((item: any) =>
        item.NTRCN_NM?.includes(name),
      );
      return item ? parseFloat(item.CNTNT || "0") || 0 : 0;
    };

    const servingSizeItem = nutritionItems.find(
      (item: any) =>
        item.NTRCN_NM?.includes("1?뚯젣怨듬웾") ||
        item.NTRCN_NM?.includes("?쒓났??),
    );

    const nutrition = {
      servingSize: servingSizeItem
        ? `${servingSizeItem.CNTNT}${servingSizeItem.UNIT || ""}`
        : "",
      calories: getNutritionValue("?대웾"),
      sodium: getNutritionValue("?섑듃瑜?),
      carbs: getNutritionValue("?꾩닔?붾Ъ"),
      sugar: getNutritionValue("?밸쪟"),
      protein: getNutritionValue("?⑤갚吏?),
      fat: getNutritionValue("吏諛?),
      transFat: getNutritionValue("?몃옖?ㅼ?諛?),
      saturatedFat: getNutritionValue("?ы솕吏諛?),
      cholesterol: getNutritionValue("肄쒕젅?ㅽ뀒濡?),
    };

    // 援먯감?ㅼ뿼 ?뺣낫
    let crossContamination: string[] = [];
    if (allergyWarning) {
      const warningLower = allergyWarning.toLowerCase();
      if (
        warningLower.includes("?쒖“?쒖꽕") ||
        warningLower.includes("?쒖“?쇱씤") ||
        warningLower.includes("媛숈? ?쒖꽕")
      ) {
        const allergenKeywords = [
          "?곗쑀",
          "怨꾨?",
          "諛",
          "???,
          "?낆쉘",
          "寃ш낵瑜?,
          "?몃몢",
          "??,
          "媛묎컖瑜?,
          "?앹꽑",
          "議곌컻瑜?,
          "?덉슦",
          "寃?,
          "?ㅼ쭠??,
          "怨좊벑??,
          "硫붾?",
          "蹂듭댂??,
          "?좊쭏??,
          "?쇱?怨좉린",
          "?좉퀬湲?,
          "??퀬湲?,
          "?꾪솴?곕쪟",
        ];
        crossContamination = allergenKeywords.filter((keyword) =>
          allergyWarning.includes(keyword),
        );
      }
    }

    // ==========================================
    // ?ъ슜???뚮젅瑜닿린 留ㅼ묶
    // ==========================================
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userAllergens: any[] = [];
    if (user) {
      const { data: allergyData } = await supabase
        .from("user_allergies")
        .select("*")
        .eq("user_id", user.id);

      if (allergyData) {
        userAllergens = allergyData;
      }
    }

    const detectedAllergens = allergyNames
      .map((allergen: string) => {
        const match = userAllergens.find(
          (ua) =>
            allergen.includes(ua.allergen_name) ||
            ua.allergen_name.includes(allergen),
        );
        if (match) {
          return {
            name: match.allergen_name,
            amount: allergen,
            severity: match.severity,
          };
        }
        return null;
      })
      .filter(Boolean);

    const crossContaminationRisks = crossContamination
      .map((allergen: string) => {
        const match = userAllergens.find(
          (ua) =>
            allergen.includes(ua.allergen_name) ||
            ua.allergen_name.includes(allergen),
        );
        if (match) {
          return {
            name: match.allergen_name,
            type: "援먯감?ㅼ뿼",
            severity: match.severity,
          };
        }
        return null;
      })
      .filter(Boolean);

    // ==========================================
    // 理쒖쥌 寃곌낵
    // ==========================================
    const result = {
      foodCode: code,
      foodName: productName,
      manufacturer: manufacturer,
      weight: weight,
      allergens: allergyNames,
      allergyWarning: allergyWarning || undefined,
      crossContamination:
        crossContamination.length > 0 ? crossContamination : undefined,
      crossContaminationRisks: crossContaminationRisks,
      userAllergens: userAllergens.map((ua) => ua.allergen_name),
      detectedAllergens,
      ingredients: ingredients,
      nutrition: nutrition,
      nutritionDetails: nutritionDetails,
      isSafe:
        detectedAllergens.length === 0 && crossContaminationRisks.length === 0,
      hasNutritionInfo: nutritionItems.length > 0,
      dataSource: "openapi",
    };


    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("?뮙 Result error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "寃곌낵 議고쉶 ?ㅽ뙣",
      },
      { status: 500 },
    );
  }
}
