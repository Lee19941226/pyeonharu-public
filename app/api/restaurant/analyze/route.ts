import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { checkApiRateLimit } from "@/lib/utils/api-rate-limit";
import { parseJsonObjectSafe, redactSensitiveText } from "@/lib/utils/ai-safety";
import { aiGuardSystemPrompt } from "@/lib/utils/ai-guardrails";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type RiskLevel = "safe" | "caution" | "danger";

function normalizeStringArray(value: unknown, limit = 10): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean).slice(0, limit);
}

function normalizeRestaurantAnalysis(parsed: Record<string, unknown>) {
  const risk = String(parsed.riskLevel || "").toLowerCase();
  const riskLevel: RiskLevel =
    risk === "safe" || risk === "caution" || risk === "danger"
      ? (risk as RiskLevel)
      : "caution";

  const summary = String(parsed.summary || "").trim();
  if (!summary) return null;

  const reviewAnalysisRaw =
    parsed.reviewAnalysis && typeof parsed.reviewAnalysis === "object"
      ? (parsed.reviewAnalysis as Record<string, unknown>)
      : {};

  const estimatedMenus = Array.isArray(parsed.estimatedMenus)
    ? parsed.estimatedMenus
        .map((m) => {
          if (!m || typeof m !== "object") return null;
          const mm = m as Record<string, unknown>;
          return {
            name: String(mm.name || "").trim(),
            price: String(mm.price || "").trim(),
            allergens: normalizeStringArray(mm.allergens, 12),
            matchedUserAllergens: normalizeStringArray(mm.matchedUserAllergens, 12),
            risk:
              ["safe", "caution", "danger"].includes(String(mm.risk || "").toLowerCase())
                ? String(mm.risk).toLowerCase()
                : "caution",
          };
        })
        .filter((m) => m && m.name)
        .slice(0, 8)
    : [];

  return {
    riskLevel,
    summary,
    popularity: String(parsed.popularity || "알 수 없음"),
    popularityNote: String(parsed.popularityNote || "").trim(),
    reviewAnalysis: {
      topKeywords: normalizeStringArray(reviewAnalysisRaw.topKeywords, 10),
      positiveReviews: normalizeStringArray(reviewAnalysisRaw.positiveReviews, 6),
      negativeReviews: normalizeStringArray(reviewAnalysisRaw.negativeReviews, 6),
      overallSentiment: String(reviewAnalysisRaw.overallSentiment || "").trim(),
    },
    estimatedMenus,
    safeOptions: normalizeStringArray(parsed.safeOptions, 8),
    tips: String(parsed.tips || "").trim(),
    overallReview: String(parsed.overallReview || "").trim(),
  };
}

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
    const { restaurantName, category, address, userAllergens } = body;

    if (!restaurantName || !userAllergens || userAllergens.length === 0) {
      return NextResponse.json(
        { error: "음식점 이름과 알레르기 정보가 필요합니다." },
        { status: 400 },
      );
    }

    const rateResult = await checkApiRateLimit({
      prefix: "rest",
      userId: user.id,
      dailyLimitLogin: 10,
      dailyLimitAnon: 0,
    });
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "일일 음식점 분석 한도(10회)를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const safeRestaurantName = redactSensitiveText(String(restaurantName));
    const safeAddress = redactSensitiveText(String(address || "정보 없음"));
    const safeCategory = redactSensitiveText(String(category || "알 수 없음"));
    const safeAllergens = Array.isArray(userAllergens)
      ? userAllergens.map((v) => redactSensitiveText(String(v))).filter(Boolean).slice(0, 22)
      : [];

    const prompt = `당신은 한국 음식점 리뷰와 메뉴 정보에 매우 해박한 전문가입니다.
음식점명: ${safeRestaurantName}
주소: ${safeAddress}
카테고리: ${safeCategory}
사용자 알레르기: ${safeAllergens.join(", ")}

반드시 JSON 형식으로만 응답:
{
  "riskLevel": "safe 또는 caution 또는 danger",
  "summary": "한 줄 소개",
  "popularity": "높음 또는 보통 또는 낮음 또는 알 수 없음",
  "popularityNote": "유명도 설명",
  "reviewAnalysis": {
    "topKeywords": ["키워드"],
    "positiveReviews": ["긍정"],
    "negativeReviews": ["부정"],
    "overallSentiment": "요약"
  },
  "estimatedMenus": [
    {"name":"메뉴","price":"가격","allergens":["알레르기"],"matchedUserAllergens":["일치"],"risk":"safe|caution|danger"}
  ],
  "safeOptions": ["안전 메뉴"],
  "tips": "팁",
  "overallReview": "전반 평가"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: aiGuardSystemPrompt("음식점 알레르기 위험 분석만 수행하고 JSON 객체만 반환하세요."),
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || "";
    const parsed = parseJsonObjectSafe<Record<string, unknown>>(content);
    const normalized = parsed ? normalizeRestaurantAnalysis(parsed) : null;

    if (!normalized) {
      return NextResponse.json(
        { error: "AI 분석 결과를 처리할 수 없습니다." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      analysis: {
        ...normalized,
        disclaimer: "AI가 추정한 정보입니다. 실제 메뉴와 성분은 매장에 직접 확인하세요.",
      },
    });
  } catch (error) {
    console.error("[Restaurant Analyze] Error:", error);
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}

