import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyAdmin } from "@/lib/utils/admin-auth";
import { parseJsonObjectSafe } from "@/lib/utils/ai-safety";
import { aiGuardSystemPrompt, hasPromptInjectionSignal, sanitizeAiUserInput } from "@/lib/utils/ai-guardrails";
import {
  aiInvalidInputResponse,
  aiResultUnavailableResponse,
  aiServiceErrorResponse,
  logAiSecurityEvent,
} from "@/lib/utils/ai-api-guard";
import { clampText, ZShortText, ZStringList } from "@/lib/utils/ai-output-guard";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const adminReportSchema = z.object({
  overall_grade: ZShortText(8),
  overall_summary: ZShortText(240),
  metrics_analysis: z.record(z.string().trim().max(200)).default({}),
  strengths: ZStringList(8, 120),
  improvements: z
    .array(
      z.object({
        issue: ZShortText(120),
        recommendation: ZShortText(160),
      }),
    )
    .max(10)
    .default([]),
  community_health: ZShortText(200).optional().default(""),
  feature_usage: ZShortText(200).optional().default(""),
  action_items: z
    .array(
      z.object({
        priority: z.enum(["high", "medium", "low"]),
        action: ZShortText(140),
        expected_impact: ZShortText(140),
      }),
    )
    .max(12)
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const { stats, period } = await req.json();
    if (!stats) {
      return NextResponse.json({ error: "통계 데이터 필요" }, { status: 400 });
    }

    const safePeriod = Number.isFinite(Number(period)) ? String(Math.max(1, Math.min(90, Number(period)))) : "7";

    const promptInjectionInput = `${safePeriod} ${JSON.stringify(stats).slice(0, 2000)}`;
    if (hasPromptInjectionSignal(promptInjectionInput)) {
      await logAiSecurityEvent({
        route: "/api/admin/report",
        reason: "prompt_injection_pattern",
        userId: auth.userId,
        sample: promptInjectionInput,
      });
      return aiInvalidInputResponse();
    }

    const prompt = `다음은 편하루(식품 알레르기 관리 웹앱)의 최근 ${safePeriod}일간 운영 지표입니다. 한국어로 분석해주세요.

## 사용자 개요
- 전체 가입자: ${stats.overview.totalUsers}명
- DAU: ${stats.overview.dau}명, WAU: ${stats.overview.wau}명, MAU: ${stats.overview.mau}명
- 리텐션율: ${stats.overview.retentionRate}%, 스티키니스: ${stats.overview.stickiness}%

## 가입 추이 (최근 ${safePeriod}일 신규: ${stats.signups.recent}명)
${JSON.stringify(stats.signups.trend.slice(-7))}

## 기능 사용 (${safePeriod}일)
- 바코드 스캔: ${stats.features.scans}회, 안전 확인: ${stats.features.checks}회
- 음식 검색: ${stats.features.searches}회, 식단 기록: ${stats.features.dietEntries}회

## 커뮤니티
- 게시글: 전체 ${stats.community.totalPosts}개 / 최근 ${stats.community.recentPosts}개
- 댓글: 전체 ${stats.community.totalComments}개 / 최근 ${stats.community.recentComments}개

## 학교: ${JSON.stringify(stats.schools.topSchools.slice(0, 5).map((s: any) => sanitizeAiUserInput(String(s.name || ""), 40)))}
## DAU 추이: ${JSON.stringify(stats.dauTrend.slice(-7))}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: aiGuardSystemPrompt(`당신은 웹 서비스 운영 분석 전문가입니다. 편하루(Pyeonharu)는 식품 알레르기 관리 및 식단 관리 웹앱입니다.
주어진 지표 데이터를 분석하여 JSON으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON). 모든 텍스트는 반드시 한국어로 작성:
{
  "overall_grade": "A~F 등급",
  "overall_summary": "2~3문장 종합 평가 (한국어)",
  "metrics_analysis": {"지표명": "해석 (한국어)"},
  "strengths": ["강점1 (한국어)"],
  "improvements": [{"issue": "문제점 (한국어)", "recommendation": "개선안 (한국어)"}],
  "community_health": "커뮤니티 건전성 요약 (한국어)",
  "feature_usage": "기능 활용도 분석 (한국어)",
  "action_items": [{"priority": "high|medium|low", "action": "액션 (한국어)", "expected_impact": "기대효과 (한국어)"}]
}`),
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const parsed = parseJsonObjectSafe<Record<string, unknown>>(
      completion.choices[0]?.message?.content || "",
    );

    if (!parsed) {
      return aiResultUnavailableResponse();
    }

    const normalized = {
      overall_grade: clampText(parsed.overall_grade, 8, "N/A"),
      overall_summary: clampText(parsed.overall_summary, 240),
      metrics_analysis:
        parsed.metrics_analysis && typeof parsed.metrics_analysis === "object"
          ? Object.fromEntries(
              Object.entries(parsed.metrics_analysis as Record<string, unknown>).slice(0, 20).map(([k, v]) => [
                clampText(k, 30),
                clampText(v, 200),
              ]),
            )
          : {},
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map((v) => clampText(v, 120)).filter(Boolean).slice(0, 8)
        : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
            .map((v) => {
              const row = (v || {}) as Record<string, unknown>;
              return {
                issue: clampText(row.issue, 120),
                recommendation: clampText(row.recommendation, 160),
              };
            })
            .filter((v) => v.issue && v.recommendation)
            .slice(0, 10)
        : [],
      community_health: clampText(parsed.community_health, 200),
      feature_usage: clampText(parsed.feature_usage, 200),
      action_items: Array.isArray(parsed.action_items)
        ? parsed.action_items
            .map((v) => {
              const row = (v || {}) as Record<string, unknown>;
              const priority = ["high", "medium", "low"].includes(String(row.priority))
                ? String(row.priority)
                : "medium";
              return {
                priority,
                action: clampText(row.action, 140),
                expected_impact: clampText(row.expected_impact, 140),
              };
            })
            .filter((v) => v.action)
            .slice(0, 12)
        : [],
    };

    const validated = adminReportSchema.safeParse(normalized);
    if (!validated.success) {
      return aiResultUnavailableResponse();
    }

    return NextResponse.json({ success: true, analysis: validated.data, stats, period: safePeriod });
  } catch (error: any) {
    console.error("Admin report error:", error);
    return aiServiceErrorResponse();
  }
}

