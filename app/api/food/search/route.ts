import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

interface ProductScore {
  foodCode: string;
  foodName: string;
  manufacturer?: string;
  allergens: string[];
  hasAllergen: boolean;
  score: number;
  matchReason: string;
  dataSource: "db" | "openapi" | "ai";
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, items: [], totalCount: 0 });
    }

    const supabase = await createClient();
    const normalizedQuery = query.toLowerCase().trim();

    // ?ъ슜???뚮젅瑜닿린 ?뺣낫
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

    // ==========================================
    // 1?④퀎: DB + OpenAPI 蹂묐젹 ?ㅽ뻾
    // ==========================================
    const [dbItems, openApiItems] = await Promise.all([
      // ?? Source 1: DB 罹먯떆 ??
      (async () => {
        try {
          const { data } = await supabase
            .from("food_search_cache")
            .select("*")
            .ilike("food_name", `%${query}%`)
            .limit(50);
          return data || [];
        } catch {
          return [];
        }
      })(),

      // ?? Source 2: Open API (?뚮젅瑜닿린 ?뺣낫) ??
      (async () => {
        try {
          const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
          url.searchParams.append("serviceKey", serviceKey);
          url.searchParams.append("pageNo", "1");
          url.searchParams.append("numOfRows", "100");
          url.searchParams.append("type", "json");
          url.searchParams.append("prdct_nm", query);

          const res = await fetch(url.toString());
          const data = await res.json();
          return data.body?.items || [];
        } catch {
          return [];
        }
      })(),
    ]);

      `?뱤 1李?寃??寃곌낵 - DB: ${dbItems.length}, OpenAPI: ${openApiItems.length}`,
    );

    // ==========================================
    // 2?④퀎: 寃곌낵 遺議???AI ?몄텧 (5媛?誘몃쭔???뚮쭔)
    // ==========================================
    let aiItems: any[] = [];
    const totalResults = dbItems.length + openApiItems.length;

    if (totalResults < 5) {
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: `?쒓뎅?먯꽌 ?ㅼ젣濡??먮ℓ?섍굅???뷀엳 癒밸뒗 ?앺뭹 以?"${query}"媛 ?ы븿?섍굅??愿?⑤맂 ?쒗뭹/?뚯떇??理쒕? 15媛??뚮젮二쇱꽭??
媛怨듭떇?? ?뚮즺, 怨쇱옄, ?쇰컲 ?뚯떇 紐⑤몢 ?ы븿?섏꽭??

JSON 諛곗뿴留?諛섑솚:
[
  {
    "foodName": "?ㅼ젣 ?쒗뭹紐??먮뒗 ?뚯떇紐?,
    "manufacturer": "?쒖“??(媛怨듭떇?덉씤 寃쎌슦)",
    "allergens": ["?뚮젅瑜닿린 ?좊컻臾쇱쭏"],
    "category": "怨쇱옄|?뚮즺|?좎젣??鍮?硫대쪟|?뚯뒪|怨쇱씪|?뚯떇|湲고?"
  }
]

?쒓뎅 ?앹빟泥?吏??22媛吏 ?뚮젅瑜닿린 湲곗??쇰줈 遺꾩꽍:
怨꾨?, ?곗쑀, 諛, 硫붾?, ?낆쉘, ??? ?몃몢, ?? 寃ш낵瑜? 媛묎컖瑜? ?덉슦, 寃? 怨좊벑?? ?ㅼ쭠?? 議곌컻瑜? ?앹꽑, 蹂듭댂?? ?좊쭏?? ?쇱?怨좉린, ?좉퀬湲? ??퀬湲? ?꾪솴?곕쪟`,
            },
          ],
          max_tokens: 1500,
        });

        const aiText = aiResponse.choices[0].message.content || "[]";
        const clean = aiText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        aiItems = JSON.parse(clean);
      } catch (e) {
        console.error("??AI 遺꾩꽍 ?ㅽ뙣:", e);
        aiItems = [];
      }
    } else {
    }

      `?뱤 理쒖쥌 寃??寃곌낵 - DB: ${dbItems.length}, OpenAPI: ${openApiItems.length}, AI: ${aiItems.length}`,
    );

    // ==========================================
    // ?듯빀 寃곌낵 ?앹꽦 (?곗꽑?쒖쐞 ?먯닔 ?ы븿)
    // ==========================================
    const allResults: ProductScore[] = [];

    // ?? 1?쒖쐞: DB 罹먯떆 (湲곕낯 ?먯닔 + 200) ??
    dbItems.forEach((item: any) => {
      const hasAllergen = (item.allergens || []).some((a: string) =>
        userAllergens.some((ua) => a.includes(ua) || ua.includes(a)),
      );
      const nameScore = item.food_name.toLowerCase().startsWith(normalizedQuery)
        ? 95
        : 85;

      allResults.push({
        foodCode: item.food_code,
        foodName: item.food_name,
        manufacturer: item.manufacturer || "",
        allergens: item.allergens || [],
        hasAllergen,
        score: nameScore + 200, // DB ?곗꽑
        matchReason: "DB",
        dataSource: "db",
      });
    });

    // ?? 2?쒖쐞: Open API (湲곕낯 ?먯닔 + 100) ??
    const openApiMap = new Map<string, ProductScore>();

    openApiItems.forEach((item: any) => {
      const foodCode = item.BRCD_NO;
      const foodName = item.PRDCT_NM;
      const allergen = item.ALG_CSG_MTR_NM;
      if (!foodCode || !foodName) return;

      const lowerName = foodName.toLowerCase();
      let score = 0;

      if (lowerName === normalizedQuery) score = 100;
      else if (lowerName.startsWith(normalizedQuery)) score = 90;
      else if (lowerName.includes(normalizedQuery)) score = 80;
      else if (allergen?.toLowerCase().includes(normalizedQuery)) score = 70;

      if (score < 70) return;

      if (!openApiMap.has(foodCode)) {
        openApiMap.set(foodCode, {
          foodCode,
          foodName,
          allergens: [],
          hasAllergen: false,
          score: score + 100, // OpenAPI ?곗꽑
          matchReason: "?앹빟泥?,
          dataSource: "openapi",
        });
      }

      const product = openApiMap.get(foodCode)!;
      if (allergen && !product.allergens.includes(allergen)) {
        product.allergens.push(allergen);
        if (
          userAllergens.some(
            (ua) => allergen.includes(ua) || ua.includes(allergen),
          )
        ) {
          product.hasAllergen = true;
        }
      }
    });

    allResults.push(...Array.from(openApiMap.values()));

    // ?? 3?쒖쐞: AI 寃곌낵 (湲곕낯 ?먯닔 60) ??
    if (Array.isArray(aiItems)) {
      aiItems.forEach((item: any, index: number) => {
        if (!item.foodName) return;

        const aiCode = `ai-${Buffer.from(item.foodName).toString("base64url").slice(0, 20)}-${index}`;
        const hasAllergen = (item.allergens || []).some((a: string) =>
          userAllergens.some((ua) => a.includes(ua) || ua.includes(a)),
        );

        allResults.push({
          foodCode: aiCode,
          foodName: item.foodName,
          manufacturer: item.manufacturer || "",
          allergens: item.allergens || [],
          hasAllergen,
          score: 60,
          matchReason: `AI (${item.category || "?앺뭹"})`,
          dataSource: "ai",
        });
      });
    }

    // ==========================================
    // 以묐났 ?쒓굅 (?대쫫 ?좎궗??湲곗?)
    // ==========================================
    const deduped: ProductScore[] = [];
    const seenCodes = new Set<string>();

    // ?먯닔 ?믪? ???뺣젹 (DB > OpenAPI > AI)
    allResults.sort((a, b) => b.score - a.score);
    allResults.forEach((item, index) => {
      // ??foodCode媛 ?대? ?덉쑝硫??ㅽ궢
      if (seenCodes.has(item.foodCode)) {
        return;
      }

      // ???덈줈????ぉ留?異붽?
      seenCodes.add(item.foodCode);
      deduped.push(item);
        `  ??[${index}] 異붽?: ${item.foodName} (${item.foodCode}) [${item.dataSource}]`,
      );
    });

      `??以묐났 ?쒓굅 ?꾨즺: ${allResults.length}媛???${deduped.length}媛?,
    );

    // ==========================================
    // AI 寃곌낵 以??좉퇋 ??DB 罹먯떆 ???(鍮꾨룞湲?
    // ==========================================
    const aiToCache = deduped.filter((r) => r.dataSource === "ai");
    if (aiToCache.length > 0) {
      supabase
        .from("food_search_cache")
        .upsert(
          aiToCache.map((item) => ({
            food_code: item.foodCode,
            food_name: item.foodName,
            manufacturer: item.manufacturer || null,
            allergens: item.allergens,
            raw_materials: null,
            weight: null,
            data_source: "ai",
          })),
          { onConflict: "food_code" },
        )
    }

    // ==========================================
    // 諛섑솚
    // ==========================================
    return NextResponse.json({
      success: true,
      items: deduped,
      totalCount: deduped.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "寃??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎" },
      { status: 500 },
    );
  }
}
