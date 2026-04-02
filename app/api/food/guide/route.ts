import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { checkApiRateLimit } from "@/lib/utils/api-rate-limit";
import { parseJsonObjectSafe } from "@/lib/utils/ai-safety";
import { aiGuardSystemPrompt } from "@/lib/utils/ai-guardrails";
import { aiResultUnavailableResponse, aiServiceErrorResponse } from "@/lib/utils/ai-api-guard";
import { ZShortText, ZStringList } from "@/lib/utils/ai-output-guard";
import { z } from "zod";

const supabaseService = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const guideSchema = z.object({
  allergen: ZShortText(40),
  immediateActions: ZStringList(6, 80),
  emergencySymptoms: ZStringList(8, 80),
  hospitalSymptoms: ZStringList(6, 80),
  alternatives: z
    .array(
      z.object({
        name: ZShortText(40),
        emoji: ZShortText(8),
      }),
    )
    .max(6)
    .default([]),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || "";

    const resultResponse = await fetch(
      `${req.nextUrl.origin}/api/food/result?code=${code}`,
      {
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
      },
    );
    const resultData = await resultResponse.json();

    if (
      !resultData.success ||
      !resultData.result.detectedAllergens ||
      resultData.result.detectedAllergens.length === 0
    ) {
      return NextResponse.json(
        { error: "위험한 알레르기 성분이 없습니다" },
        { status: 404 },
      );
    }

    const allergen = resultData.result.detectedAllergens[0]?.name || "알레르기";
    const severity = resultData.result.detectedAllergens[0]?.severity || "medium";

    const supabase = await createClient();
    const cacheKey = `${allergen}_${severity}`;

    const { data: cached } = await supabase
      .from("ai_guide_cache")
      .select("guide_content")
      .eq("allergen_code", cacheKey)
      .maybeSingle();

    if (cached) {
      return NextResponse.json({
        success: true,
        guide: cached.guide_content,
      });
    }

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    const rateResult = await checkApiRateLimit({
      prefix: "guide",
      userId: user?.id || null,
      dailyLimitLogin: 10,
      dailyLimitAnon: 5,
    });
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "일일 가이드 생성 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 },
      );
    }

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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: aiGuardSystemPrompt("알레르기 대응 가이드 작성만 수행하고 JSON 객체만 반환하세요."),
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content || "{}";
    const guide = parseJsonObjectSafe<Record<string, unknown>>(content);

    if (!guide) {
      return aiResultUnavailableResponse();
    }

    const validated = guideSchema.safeParse(guide);
    if (!validated.success) {
      return aiResultUnavailableResponse();
    }

    try {
      await supabaseService.from("ai_guide_cache").insert({
        allergen_code: cacheKey,
        severity,
        guide_content: validated.data,
      });
    } catch (cacheError) {
      console.error("[food/guide] cache insert failed:", cacheError);
    }

    return NextResponse.json({
      success: true,
      guide: validated.data,
    });
  } catch (error) {
    console.error("[food/guide] error:", error);
    return aiServiceErrorResponse();
  }
}
