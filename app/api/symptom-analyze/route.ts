import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { checkOpenAIRateLimit } from "@/lib/utils/openai-rate-limit";
import { parseJsonObjectSafe, redactSensitiveText } from "@/lib/utils/ai-safety";
import { aiGuardSystemPrompt, hasPromptInjectionSignal, sanitizeAiUserInput } from "@/lib/utils/ai-guardrails";
import {
  aiInvalidInputResponse,
  aiResultUnavailableResponse,
  aiServiceErrorResponse,
  logAiSecurityEvent,
} from "@/lib/utils/ai-api-guard";
import { clampInt, clampText, ZShortText, ZStringList } from "@/lib/utils/ai-output-guard";
import { z } from "zod";

const symptomAnalyzeSchema = z.object({
  suspectedDisease: ZShortText(80),
  department: ZShortText(40),
  confidence: z.number().int().min(50).max(95),
  healthAdvice: ZStringList(6, 120),
  dietaryAdvice: z
    .array(
      z.object({
        item: ZShortText(40),
        emoji: ZShortText(8),
        reason: ZShortText(120),
      }),
    )
    .max(8)
    .default([]),
  avoidFoods: ZStringList(10, 40),
  visitTip: ZShortText(120),
  emergencyLevel: z.enum(["normal", "urgent", "emergency"]),
  possibleDepartments: ZStringList(6, 40),
});

// 잔여 횟수 조회
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const headersList = await headers();

    const today = new Date().toISOString().split("T")[0];
    let identifier: string;
    let dailyLimit: number;

    if (user) {
      identifier = `user:${user.id}:${today}`;
      dailyLimit = 3;
    } else {
      const ip =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        "unknown";
      identifier = `ip:${ip}:${today}`;
      dailyLimit = 1;
    }

    const { count } = await supabase
      .from("symptom_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier);

    const used = count || 0;
    return NextResponse.json({
      used,
      limit: dailyLimit,
      remaining: Math.max(dailyLimit - used, 0),
    });
  } catch {
    return NextResponse.json({ used: 0, limit: 1, remaining: 1 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const headersList = await headers();

    const { symptom } = await req.json();

    if (!symptom || typeof symptom !== "string" || !symptom.trim()) {
      return NextResponse.json({ error: "증상을 입력해주세요." }, { status: 400 });
    }
    if (symptom.trim().length > 500) {
      return NextResponse.json({ error: "증상은 500자 이하로 입력해주세요." }, { status: 400 });
    }

    if (hasPromptInjectionSignal(symptom)) {
      await logAiSecurityEvent({
        route: "/api/symptom-analyze",
        reason: "prompt_injection_pattern",
        userId: user?.id ?? null,
        sample: symptom,
      });
      return aiInvalidInputResponse();
    }

    const redactedSymptom = sanitizeAiUserInput(redactSensitiveText(symptom.trim()), 500);

    const today = new Date().toISOString().split("T")[0];
    let identifier: string;
    let dailyLimit: number;

    if (user) {
      identifier = `user:${user.id}:${today}`;
      dailyLimit = 3;
    } else {
      const ip =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        "unknown";
      identifier = `ip:${ip}:${today}`;
      dailyLimit = 1;
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

    const rateCheck = checkOpenAIRateLimit("symptom-analyze");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    await supabase.from("symptom_rate_limits").insert({ identifier });

    const systemPrompt = aiGuardSystemPrompt(`당신은 한국의 의료 안내 AI 어시스턴트 "편하루 AI"입니다.
사용자가 입력한 증상을 분석하여 의심 질환과 적합한 진료과를 추천하고, 건강 조언을 제공합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "suspectedDisease": "의심 질환명",
  "department": "추천 진료과명",
  "confidence": 신뢰도(50~95 사이 정수),
  "healthAdvice": ["조언1", "조언2"],
  "dietaryAdvice": [{"item":"추천 음식","emoji":"🍵","reason":"이유"}],
  "avoidFoods": ["피해야 할 음식"],
  "visitTip": "방문 팁",
  "emergencyLevel": "normal 또는 urgent 또는 emergency",
  "possibleDepartments": ["대안 진료과1"]
}`);

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
          { role: "user", content: `증상: ${redactedSymptom}` },
        ],
        temperature: 0.3,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      return aiResultUnavailableResponse();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return aiResultUnavailableResponse();
    }

    const parsed = parseJsonObjectSafe<Record<string, unknown>>(content);
    if (!parsed) {
      return aiResultUnavailableResponse();
    }

    const normalized = {
      suspectedDisease: clampText(parsed.suspectedDisease, 80),
      department: clampText(parsed.department, 40),
      confidence: clampInt(parsed.confidence, { min: 50, max: 95, fallback: 70 }),
      healthAdvice: Array.isArray(parsed.healthAdvice)
        ? parsed.healthAdvice.map((v) => clampText(v, 120)).filter(Boolean).slice(0, 6)
        : [],
      dietaryAdvice: Array.isArray(parsed.dietaryAdvice)
        ? parsed.dietaryAdvice
            .map((v) => {
              const row = (v || {}) as Record<string, unknown>;
              return {
                item: clampText(row.item, 40),
                emoji: clampText(row.emoji, 8, "🍽️"),
                reason: clampText(row.reason, 120),
              };
            })
            .filter((v) => v.item)
            .slice(0, 8)
        : [],
      avoidFoods: Array.isArray(parsed.avoidFoods)
        ? parsed.avoidFoods.map((v) => clampText(v, 40)).filter(Boolean).slice(0, 10)
        : [],
      visitTip: clampText(parsed.visitTip, 120),
      emergencyLevel: ["normal", "urgent", "emergency"].includes(String(parsed.emergencyLevel))
        ? String(parsed.emergencyLevel)
        : "normal",
      possibleDepartments: Array.isArray(parsed.possibleDepartments)
        ? parsed.possibleDepartments.map((v) => clampText(v, 40)).filter(Boolean).slice(0, 6)
        : [],
    };

    const validated = symptomAnalyzeSchema.safeParse(normalized);
    if (!validated.success) {
      return aiResultUnavailableResponse();
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Symptom analyze error:", error);
    return aiServiceErrorResponse();
  }
}
