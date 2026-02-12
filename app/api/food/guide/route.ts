import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || "";


    // ==========================================
    // ??荑좏궎瑜??ы븿?댁꽌 result API ?몄텧
    // ==========================================
    const resultResponse = await fetch(
      `${req.nextUrl.origin}/api/food/result?code=${code}`,
      {
        headers: {
          cookie: req.headers.get("cookie") || "", // ??荑좏궎 ?꾨떖!
        },
      },
    );
    const resultData = await resultResponse.json();


    // ==========================================
    // ??議곌굔 ?섏젙: detectedAllergens媛 ?덈뒗吏 吏곸젒 ?뺤씤
    // ==========================================
    if (
      !resultData.success ||
      !resultData.result.detectedAllergens ||
      resultData.result.detectedAllergens.length === 0
    ) {
      return NextResponse.json({
        success: false,
        error: "?꾪뿕???뚮젅瑜닿린 ?깅텇???놁뒿?덈떎",
      });
    }

    const allergen = resultData.result.detectedAllergens[0]?.name || "?뚮젅瑜닿린";
    const severity =
      resultData.result.detectedAllergens[0]?.severity || "medium";


    // ==========================================
    // 罹먯떆 ?뺤씤
    // ==========================================
    const supabase = await createClient();
    const cacheKey = `${allergen}_${severity}`;

    const { data: cached } = await supabase
      .from("ai_guide_cache")
      .select("guide_content")
      .eq("allergen_code", cacheKey)
      .maybeSingle(); // ??single() ??maybeSingle()濡?蹂寃?(?먮윭 諛⑹?)

    if (cached) {
      return NextResponse.json({
        success: true,
        guide: cached.guide_content,
      });
    }


    // ==========================================
    // OpenAI濡?媛?대뱶 ?앹꽦
    // ==========================================
    const prompt = `
?ъ슜?먭? ${allergen} ?뚮젅瑜닿린瑜?媛吏怨??덉쑝硫?
${allergen} ?깅텇???ы븿???앺뭹????랬??六뷀뻽?듬땲??
?ш컖?? ${severity}

?ㅼ쓬 ?댁슜???ы븿?????媛?대뱶瑜??묒꽦?댁＜?몄슂:
1. 利됱떆 ?됰룞 ?붾졊 (30珥??대궡, 3-5?④퀎)
2. ?묎툒 ?곹솴 ?먮떒 湲곗? (?앸챸???꾪삊?섎뒗 利앹긽 5-7媛吏)
3. 蹂묒썝 諛⑸Ц???꾩슂??利앹긽 (3-5媛吏)
4. ?泥??앺뭹 異붿쿇 (4媛吏, ?대え吏 ?ы븿)

JSON ?뺤떇?쇰줈留?諛섑솚?섏꽭?? ?ㅻⅨ ?ㅻ챸 ?놁씠:
{
  "allergen": "${allergen}",
  "immediateActions": ["?됰룞1", "?됰룞2", ...],
  "emergencySymptoms": ["利앹긽1", "利앹긽2", ...],
  "hospitalSymptoms": ["利앹긽1", "利앹긽2", ...],
  "alternatives": [
    {"name": "?앺뭹紐?, "emoji": "?대え吏"},
    ...
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // ????鍮좊Ⅴ怨???댄븳 紐⑤뜽
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || "{}";

    // ??JSON ?뚯떛 媛쒖꽑
    let guide;
    try {
      // ```json ?쒓렇 ?쒓굅
      const cleanJson = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      guide = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON ?뚯떛 ?ㅽ뙣:", e);
      return NextResponse.json(
        { success: false, error: "AI ?묐떟???뚯떛?????놁뒿?덈떎" },
        { status: 500 },
      );
    }


    // ==========================================
    // 罹먯떆 ???
    // ==========================================
    try {
      await supabase.from("ai_guide_cache").insert({
        allergen_code: cacheKey,
        severity: severity,
        guide_content: guide,
      });
    } catch (cacheError) {
      console.error("?좑툘 罹먯떆 ????ㅽ뙣 (臾댁떆):", cacheError);
      // 罹먯떆 ????ㅽ뙣?대룄 媛?대뱶??諛섑솚
    }

    return NextResponse.json({
      success: true,
      guide,
    });
  } catch (error) {
    console.error("?뮙 Guide generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "媛?대뱶 ?앹꽦 ?ㅽ뙣",
      },
      { status: 500 },
    );
  }
}
