import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { checkOpenAIRateLimit } from "@/lib/utils/openai-rate-limit";
import { parseJsonObjectSafe } from "@/lib/utils/ai-safety";
import { aiGuardSystemPrompt, hasPromptInjectionSignal, sanitizeAiUserInput } from "@/lib/utils/ai-guardrails";
import {
  aiInvalidInputResponse,
  aiResultUnavailableResponse,
  aiServiceErrorResponse,
  logAiSecurityEvent,
} from "@/lib/utils/ai-api-guard";
import { ZShortText, ZStringList } from "@/lib/utils/ai-output-guard";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TextAnalyzeResult {
  productName: string;
  manufacturer?: string;
  ingredients?: string[];
  allergens?: string[];
}

const textAnalyzeSchema = z.object({
  productName: ZShortText(120),
  manufacturer: ZShortText(80).optional().default(""),
  ingredients: ZStringList(20, 40).optional().default([]),
  allergens: ZStringList(22, 30).optional().default([]),
});

function normalizeTextAnalyzeResult(parsed: Record<string, unknown>): TextAnalyzeResult | null {
  const productName = String(parsed.productName || "").trim();
  if (!productName) return null;

  const manufacturer = String(parsed.manufacturer || "").trim();
  const ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.map((v) => String(v).trim()).filter(Boolean).slice(0, 20)
    : [];
  const allergens = Array.isArray(parsed.allergens)
    ? parsed.allergens.map((v) => String(v).trim()).filter(Boolean).slice(0, 22)
    : [];

  return {
    productName,
    manufacturer,
    ingredients,
    allergens,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let identifier: string;
    let dailyLimit: number;

    if (user) {
      identifier = `text-analyze:user:${user.id}`;
      dailyLimit = 2;
    } else {
      const headersList = await headers();
      const ip =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        "unknown";
      identifier = `text-analyze:ip:${ip}`;
      dailyLimit = 1;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("image_analyze_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier)
      .gte("analyzed_at", todayStart.toISOString());

    if ((count || 0) >= dailyLimit) {
      return NextResponse.json(
        {
          error: user
            ? `오늘 텍스트 분석 한도(${dailyLimit}회)를 초과했습니다.`
            : `일일 무료 분석 횟수(${dailyLimit}회)를 초과했습니다. 로그인하시면 더 많이 사용할 수 있어요.`,
        },
        { status: 429 },
      );
    }

    supabase
      .from("image_analyze_rate_limits")
      .insert({ identifier, analyzed_at: new Date().toISOString() })
      .then(() => {});

    const rateCheck = checkOpenAIRateLimit("analyze-text");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const { query } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
    }
    if (query.trim().length > 100) {
      return NextResponse.json({ error: "검색어는 100자 이하로 입력해주세요." }, { status: 400 });
    }

    const safeQuery = sanitizeAiUserInput(query.trim(), 100);
    if (hasPromptInjectionSignal(query)) {
      await logAiSecurityEvent({
        route: "/api/food/analyze-text",
        reason: "prompt_injection_pattern",
        userId: user?.id ?? null,
        sample: query,
      });
      return aiInvalidInputResponse();
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: aiGuardSystemPrompt("식품명/원재료/알레르기 분석만 수행하고 JSON 형식만 반환하세요."),
        },
        {
          role: "user",
          content: `당신은 식품 정보 전문가입니다.
"${safeQuery}"라는 제품에 대해 다음 정보를 추론하여 JSON으로 반환하세요:

1. productName: 제품명
2. manufacturer: 추정 제조사 (모르면 "")
3. ingredients: 일반적으로 들어가는 주요 원재료 5-10가지 (배열)
4. allergens: 포함 가능한 알레르기 유발 물질 (배열)

반드시 JSON만 반환하세요.`,
        },
      ],
      max_tokens: 1000,
    });

    const aiResult = response.choices[0].message.content || "{}";
    const parsed = parseJsonObjectSafe<Record<string, unknown>>(aiResult);
    const normalized = parsed ? normalizeTextAnalyzeResult(parsed) : null;

    if (!normalized) {
      return aiResultUnavailableResponse();
    }

    const validated = textAnalyzeSchema.safeParse(normalized);
    if (!validated.success) {
      return aiResultUnavailableResponse();
    }

    return NextResponse.json({
      success: true,
      productName: validated.data.productName,
      manufacturer: validated.data.manufacturer || "",
      detectedIngredients: validated.data.ingredients || [],
      allergens: validated.data.allergens || [],
      dataSource: "ai-text",
    });
  } catch (error) {
    console.error("AI 텍스트 분석 오류:", error);
    return aiServiceErrorResponse();
  }
}
