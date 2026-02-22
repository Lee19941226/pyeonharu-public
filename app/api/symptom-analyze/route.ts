import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const headersList = await headers();

    // ─── Rate Limit 체크 ───
    const today = new Date().toISOString().split("T")[0];
    let identifier: string;
    let dailyLimit: number;

    if (user) {
      // 로그인 사용자: user_id 기반, 하루 20회
      identifier = `user:${user.id}:${today}`;
      dailyLimit = 20;
    } else {
      // 비로그인: IP 기반, 하루 5회
      const ip =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        "unknown";
      identifier = `ip:${ip}:${today}`;
      dailyLimit = 5;
    }

    const { count } = await supabase
      .from("symptom_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier);

    if ((count || 0) >= dailyLimit) {
      return NextResponse.json(
        {
          error: user
            ? `하루 분석 한도(${dailyLimit}회)를 초과했습니다.`
            : `일일 무료 분석 횟수(${dailyLimit}회)를 초과했습니다. 로그인하시면 더 많이 사용할 수 있습니다.`,
        },
        { status: 429 },
      );
    }

    // ─── 카운트 증가 ───
    await supabase.from("symptom_rate_limits").insert({ identifier });

    const { symptom } = await req.json();

    if (!symptom || typeof symptom !== "string" || !symptom.trim()) {
      return NextResponse.json(
        { error: "증상을 입력해주세요." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const systemPrompt = `당신은 한국의 의료 안내 AI 어시스턴트 "편하루 AI"입니다.
사용자가 입력한 증상을 분석하여 의심 질환과 적합한 진료과를 추천하고, 건강 조언을 제공해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "suspectedDisease": "의심 질환명 (예: 급성 상기도 감염 (감기))",
  "department": "추천 진료과명",
  "confidence": 신뢰도(50~95 사이 정수),
  "healthAdvice": [
    "⚠ 유행 질환 관련 경고 또는 주의사항 (있는 경우)",
    "🍵 자가 관리 팁 (구체적인 조언)",
    "🏥 병원 방문 권고 문구"
  ],
  "dietaryAdvice": [
    {
      "item": "추천 음식/음료명",
      "emoji": "적절한 이모지",
      "reason": "해당 증상에 좋은 이유 (간단히)"
    }
  ],
  "avoidFoods": ["피해야 할 음식1", "피해야 할 음식2"],
  "visitTip": "해당 진료과 방문 시 참고할 팁 (예: 체온 기록과 증상 시작 시점을 말씀하시면 더 정확한 진단을 받으실 수 있어요.)",
  "emergencyLevel": "normal 또는 urgent 또는 emergency",
  "possibleDepartments": ["대안 진료과1", "대안 진료과2"]
}

진료과 목록: 내과, 외과, 정형외과, 신경과, 신경외과, 피부과, 비뇨의학과, 산부인과, 소아청소년과, 안과, 이비인후과, 치과, 정신건강의학과, 재활의학과, 가정의학과, 응급의학과

식이 요법 예시:
- 목/인후 증상: 생강차, 도라지차, 꿀물, 배숙, 유자차
- 소화기 증상: 죽, 미음, 매실차, 양배추즙
- 호흡기 증상: 도라지차, 모과차, 무즙
- 근육/관절 통증: 생강, 강황(울금), 체리, 오메가3 풍부한 생선
- 피로/면역: 홍삼차, 대추차, 삼계탕
- 두통: 충분한 수분, 마그네슘 풍부한 견과류

규칙:
- healthAdvice 배열은 2~4개 항목으로, 각 항목 앞에 적절한 이모지를 붙여주세요
- dietaryAdvice 배열은 2~4개 항목으로, 증상 완화에 실제로 도움되는 한국인에게 친숙한 음식/음료를 추천해주세요
- avoidFoods는 해당 증상 시 피해야 할 음식을 1~3개 알려주세요 (해당 없으면 빈 배열)
- 위험한 증상(가슴 통증, 호흡곤란, 심한 출혈 등)이면 emergencyLevel을 "emergency"로 설정하고 응급의학과를 최우선 추천
- 빠른 병원 방문이 필요한 경우 emergencyLevel을 "urgent"로 설정
- visitTip은 해당 진료과 방문 시 의사에게 전달하면 좋을 정보를 알려주세요
- 최근 유행하는 질환(독감, 코로나 등)이 의심되면 healthAdvice에 관련 경고를 포함하세요`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `증상: ${symptom.trim()}` },
        ],
        temperature: 0.3,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        await response.json().catch(() => ({})),
      );
      return NextResponse.json(
        { error: "AI 분석 중 오류가 발생했습니다." },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "AI 응답을 받지 못했습니다." },
        { status: 502 },
      );
    }

    const cleaned = content
      .replace(/```json\s?/g, "")
      .replace(/```/g, "")
      .trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (error) {
    console.error("Symptom analyze error:", error);
    return NextResponse.json(
      { error: "분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
