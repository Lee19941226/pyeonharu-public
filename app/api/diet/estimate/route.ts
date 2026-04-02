import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/utils/api-rate-limit";
import { parseJsonObjectSafe } from "@/lib/utils/ai-safety";
import { aiGuardSystemPrompt, hasPromptInjectionSignal, sanitizeAiUserInput } from "@/lib/utils/ai-guardrails";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface DietEstimateResult {
  estimated_cal: number;
  serving_desc: string;
  emoji: string;
}

function normalizeDietEstimateResult(
  parsed: Record<string, unknown>,
): DietEstimateResult {
  const estimatedRaw = Number(parsed.estimated_cal);
  const estimatedCal = Number.isFinite(estimatedRaw)
    ? Math.max(0, Math.min(5000, Math.round(estimatedRaw)))
    : 0;

  return {
    estimated_cal: estimatedCal,
    serving_desc: String(parsed.serving_desc || "").trim(),
    emoji: String(parsed.emoji || "").trim() || "🍽️",
  };
}

// POST /api/diet/estimate — 음식 이름으로 AI 칼로리 추정
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { food_name, grams } = body;

    if (hasPromptInjectionSignal(String(food_name || ""))) {
      return NextResponse.json({ error: "입력 형식이 올바르지 않습니다." }, { status: 400 });
    }

    if (!food_name?.trim()) {
      return NextResponse.json({ error: "음식 이름을 입력해주세요." }, { status: 400 });
    }

    const rateResult = await checkApiRateLimit({
      prefix: "estimate",
      userId: user.id,
      dailyLimitLogin: 20,
      dailyLimitAnon: 0,
    });
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "일일 칼로리 추정 한도(20회)를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const gramsInfo =
      grams && parseInt(grams, 10) > 0
        ? `${parseInt(grams, 10)}g 기준으로`
        : "일반적인 1인분 기준으로";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: aiGuardSystemPrompt("칼로리 추정만 수행하고 JSON 객체만 반환하세요."),
        },
        {
          role: "system",
          content: `당신은 한국 음식 영양 전문가입니다. 음식 이름과 양을 보고 칼로리를 추정합니다.

## 추정 규칙
1. **반드시 해당 음식 단품 1인분만** 추정하세요. 밥, 반찬, 국 등 세트 구성으로 부풀리지 마세요.
2. 한국 식약처 영양성분 DB, 농촌진흥청 식품성분표를 기준으로 추정하세요.
3. "잡곡밥과 시금치나물"처럼 여러 음식이 함께 나열된 경우, 나열된 음식들의 칼로리 합산으로 추정하세요.
   - 예: 잡곡밥(1공기 약 300kcal) + 시금치나물(1접시 약 40kcal) = 약 340kcal
4. 추정치는 실제 데이터 기반으로 현실적인 값을 제시하세요. 과대/과소 추정 금지.

## 참고 칼로리 (1인분 기준)
- 흰쌀밥 1공기(210g): 약 310kcal
- 잡곡밥 1공기(210g): 약 300kcal
- 김치찌개: 약 200kcal
- 된장찌개: 약 150kcal
- 시금치나물: 약 40kcal
- 닭가슴살 샐러드: 약 250~350kcal
- 삼겹살 1인분(200g): 약 550kcal
- 비빔밥: 약 500kcal
- 라면: 약 500kcal

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "estimated_cal": 추정 칼로리 (정수, kcal),
  "serving_desc": "기준 설명 (예: '1인분 약 300g', '1개 약 50g')",
  "emoji": "음식을 나타내는 이모지 1개"
}`,
        },
        {
          role: "user",
          content: `"${sanitizeAiUserInput(food_name.trim(), 80)}" 음식의 칼로리를 ${gramsInfo} 추정해주세요.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || "";
    const parsed = parseJsonObjectSafe<Record<string, unknown>>(content);
    if (!parsed) {
      return NextResponse.json(
        { error: "AI 분석 결과를 처리할 수 없습니다." },
        { status: 500 },
      );
    }

    const result = normalizeDietEstimateResult(parsed);

    return NextResponse.json({
      success: true,
      estimated_cal: result.estimated_cal,
      serving_desc: result.serving_desc,
      emoji: result.emoji,
    });
  } catch (error) {
    console.error("[Diet Estimate] Error:", error);
    return NextResponse.json(
      { error: "AI 추정 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}


