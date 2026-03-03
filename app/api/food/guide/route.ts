import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseService = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
  console.log("🚀 가이드 API 호출됨");

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || "";

    console.log("📦 받은 코드:", code);

    // ==========================================
    // ✅ 쿠키를 포함해서 result API 호출
    // ==========================================
    const resultResponse = await fetch(
      `${req.nextUrl.origin}/api/food/result?code=${code}`,
      {
        headers: {
          cookie: req.headers.get("cookie") || "", // ✅ 쿠키 전달!
        },
      },
    );
    const resultData = await resultResponse.json();

    console.log("📋 Result 데이터:", resultData);

    // ==========================================
    // ✅ 조건 수정: detectedAllergens가 있는지 직접 확인
    // ==========================================
    if (
      !resultData.success ||
      !resultData.result.detectedAllergens ||
      resultData.result.detectedAllergens.length === 0
    ) {
      console.log("❌ 위험한 알레르기 없음");
      return NextResponse.json({
        success: false,
        error: "위험한 알레르기 성분이 없습니다",
      });
    }

    const allergen = resultData.result.detectedAllergens[0]?.name || "알레르기";
    const severity =
      resultData.result.detectedAllergens[0]?.severity || "medium";

    console.log(`✅ 알레르기 감지: ${allergen} (심각도: ${severity})`);

    // ==========================================
    // 캐시 확인
    // ==========================================
    const supabase = await createClient();
    const cacheKey = `${allergen}_${severity}`;

    const { data: cached } = await supabase
      .from("ai_guide_cache")
      .select("guide_content")
      .eq("allergen_code", cacheKey)
      .maybeSingle(); // ✅ single() → maybeSingle()로 변경 (에러 방지)

    if (cached) {
      console.log("✅ 캐시에서 가져옴");
      return NextResponse.json({
        success: true,
        guide: cached.guide_content,
      });
    }

    console.log("🤖 OpenAI로 가이드 생성 시작...");

    // ==========================================
    // OpenAI로 가이드 생성
    // ==========================================
    const prompt = `
사용자가 ${allergen} 알레르기를 가지고 있으며,
${allergen} 성분이 포함된 식품을 섭취할 뻔했습니다.
심각도: ${severity}

다음 내용을 포함한 대응 가이드를 작성해주세요:
1. 즉시 행동 요령 (30초 이내, 3-5단계)
2. 응급 상황 판단 기준 (생명을 위협하는 증상 5-7가지)
3. 병원 방문이 필요한 증상 (3-5가지)
4. 대체 식품 추천 (4가지, 이모지 포함)

JSON 형식으로만 반환하세요. 다른 설명 없이:
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
      model: "gpt-4o-mini", // ✅ 더 빠르고 저렴한 모델
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || "{}";
    console.log("🤖 OpenAI 응답:", content.substring(0, 200));

    // ✅ JSON 파싱 개선
    let guide;
    try {
      // ```json 태그 제거
      const cleanJson = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      guide = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON 파싱 실패:", e);
      return NextResponse.json(
        { success: false, error: "AI 응답을 파싱할 수 없습니다" },
        { status: 500 },
      );
    }

    console.log("✅ 가이드 생성 완료:", guide);

    // ==========================================
    // 캐시 저장
    // ==========================================
    try {
      await supabaseService.from("ai_guide_cache").insert({
        allergen_code: cacheKey,
        severity: severity,
        guide_content: guide,
      });
      console.log("✅ 캐시 저장 완료");
    } catch (cacheError) {
      console.error("⚠️ 캐시 저장 실패 (무시):", cacheError);
      // 캐시 저장 실패해도 가이드는 반환
    }

    return NextResponse.json({
      success: true,
      guide,
    });
  } catch (error) {
    console.error("💥 Guide generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "가이드 생성 실패",
      },
      { status: 500 },
    );
  }
}
