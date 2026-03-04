import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyAdmin } from "@/lib/utils/admin-auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const { stats, period } = await req.json();
    if (!stats)
      return NextResponse.json({ error: "통계 데이터 필요" }, { status: 400 });

    const prompt = `다음은 편하루(식품 알레르기 관리 웹앱)의 최근 ${period}일간 운영 지표입니다. 한국어로 분석해주세요.

## 사용자 개요
- 전체 가입자: ${stats.overview.totalUsers}명
- DAU: ${stats.overview.dau}명, WAU: ${stats.overview.wau}명, MAU: ${stats.overview.mau}명
- 리텐션율: ${stats.overview.retentionRate}%, 스티키니스: ${stats.overview.stickiness}%

## 가입 추이 (최근 ${period}일 신규: ${stats.signups.recent}명)
${JSON.stringify(stats.signups.trend.slice(-7))}

## 기능 사용 (${period}일)
- 바코드 스캔: ${stats.features.scans}회, 안전 확인: ${stats.features.checks}회
- 음식 검색: ${stats.features.searches}회, 식단 기록: ${stats.features.dietEntries}회

## 커뮤니티
- 게시글: 전체 ${stats.community.totalPosts}개 / 최근 ${stats.community.recentPosts}개
- 댓글: 전체 ${stats.community.totalComments}개 / 최근 ${stats.community.recentComments}개

## 학교: ${stats.schools.total}개, TOP: ${JSON.stringify(stats.schools.topSchools.slice(0, 5))}
## DAU 추이: ${JSON.stringify(stats.dauTrend.slice(-7))}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 웹 서비스 운영 분석 전문가입니다. 편하루(Pyeonharu)는 식품 알레르기 관리 및 식단 관리 웹앱입니다.
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
}`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    let analysis: any;
    try {
      const cleaned = (completion.choices[0]?.message?.content || "{}")
        .replace(/```json\n?|```/g, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        overall_grade: "N/A",
        overall_summary: "AI 분석 파싱 실패",
        strengths: [],
        improvements: [],
        action_items: [],
      };
    }

    return NextResponse.json({ success: true, analysis, stats, period });
  } catch (error: any) {
    console.error("Admin report error:", error);
    return NextResponse.json(
      { error: "분석 실패" },
      { status: 500 },
    );
  }
}
