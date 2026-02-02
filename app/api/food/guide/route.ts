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

    // 먼저 식품 정보 조회
    const resultResponse = await fetch(
      `${req.nextUrl.origin}/api/food/result?code=${code}`,
    );
    const resultData = await resultResponse.json();

    if (!resultData.success || resultData.result.isSafe) {
      return NextResponse.json({
        success: false,
        error: "위험한 알레르기 성분이 없습니다",
      });
    }

    const allergen = resultData.result.detectedAllergens[0]?.name || "알레르기";
    const severity =
      resultData.result.detectedAllergens[0]?.severity || "medium";

    // 캐시 확인
    const supabase = await createClient();
    const cacheKey = `${allergen}_${severity}`;

    const { data: cached } = await supabase
      .from("ai_guide_cache")
      .select("guide_content")
      .eq("allergen_code", cacheKey)
      .single();

    if (cached) {
      return NextResponse.json({
        success: true,
        guide: cached.guide_content,
      });
    }

    // OpenAI로 가이드 생성
    const prompt = `
사용자가 ${allergen} 알레르기를 가지고 있으며,
${allergen} 성분이 포함된 식품을 섭취할 뻔했습니다.
심각도: ${severity}

다음 내용을 포함한 대응 가이드를 작성해주세요:
1. 즉시 행동 요령 (30초 이내, 3-5단계)
2. 응급 상황 판단 기준 (생명을 위협하는 증상 5-7가지)
3. 병원 방문이 필요한 증상 (3-5가지)
4. 대체 식품 추천 (4가지, 이모지 포함)

JSON 형식으로 반환:
{
  "allergen": "${allergen}",
  "immediateActions": ["행동1", "행동2", ...],
  "emergencySymptoms": ["증상1", "증상2", ...],
  "hospitalSymptoms": ["증상1", "증상2", ...],
  "alternatives": [
    {"name": "식품명", "emoji": "이모지"},
    ...
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || "{}";
    const guide = JSON.parse(content);

    // 캐시 저장
    await supabase.from("ai_guide_cache").insert({
      allergen_code: cacheKey,
      severity: severity,
      guide_content: guide,
    });

    return NextResponse.json({
      success: true,
      guide,
    });
  } catch (error) {
    console.error("Guide generation error:", error);
    return NextResponse.json(
      { success: false, error: "가이드 생성 실패" },
      { status: 500 },
    );
  }
}
