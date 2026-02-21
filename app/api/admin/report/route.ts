import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/admin/report
// body: { stats: Stats, period: number }
export async function POST(req: NextRequest) {
  try {
    // 관리자 인증
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 })
    }

    const { stats, period } = await req.json()
    if (!stats) return NextResponse.json({ error: "통계 데이터 필요" }, { status: 400 })

    // ─── AI 분석 요청 ───
    const prompt = buildAnalysisPrompt(stats, period)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 웹 서비스 운영 분석 전문가입니다. 편하루(Pyeonharu)는 식품 알레르기 관리 및 식단 관리 웹앱입니다.
주어진 지표 데이터를 분석하여 사이트 건전성, 성장 현황, 개선 포인트를 한국어로 작성해주세요.
분석은 아래 섹션으로 구성하세요:
1. 종합 평가 (overall_grade: A~F, overall_summary: 2~3문장)
2. 핵심 지표 분석 (metrics_analysis: 각 지표에 대한 해석)
3. 강점 (strengths: 배열)
4. 개선 필요 영역 (improvements: 배열, 각각 issue + recommendation)
5. 커뮤니티 건전성 (community_health: 요약)
6. 기능 활용도 분석 (feature_usage: 요약)
7. 액션 아이템 (action_items: 우선순위별 배열, 각각 priority(high/medium/low) + action + expected_impact)

JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    })

    const aiText = completion.choices[0]?.message?.content || "{}"
    let analysis: any
    try {
      const cleaned = aiText.replace(/```json\n?|```/g, "").trim()
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = {
        overall_grade: "N/A",
        overall_summary: "AI 분석 결과를 파싱할 수 없습니다.",
        metrics_analysis: aiText,
        strengths: [],
        improvements: [],
        community_health: "",
        feature_usage: "",
        action_items: [],
      }
    }

    return NextResponse.json({ success: true, analysis, stats, period })
  } catch (error: any) {
    console.error("Admin report error:", error)
    return NextResponse.json({ error: error.message || "분석 실패" }, { status: 500 })
  }
}

function buildAnalysisPrompt(stats: any, period: number): string {
  return `다음은 편하루(식품 알레르기 관리 웹앱)의 최근 ${period}일간 운영 지표입니다. 분석해주세요.

## 사용자 개요
- 전체 가입자: ${stats.overview.totalUsers}명
- DAU (일 활성): ${stats.overview.dau}명
- WAU (주 활성): ${stats.overview.wau}명
- MAU (월 활성): ${stats.overview.mau}명
- 리텐션율 (7일 재방문): ${stats.overview.retentionRate}%
- 스티키니스 (DAU/MAU): ${stats.overview.stickiness}%

## 가입 추이
- 최근 ${period}일 신규 가입: ${stats.signups.recent}명
- 일별 가입 추이: ${JSON.stringify(stats.signups.trend.slice(-7))}

## 기능 사용 (${period}일간)
- 바코드 스캔: ${stats.features.scans}회
- 안전 확인: ${stats.features.checks}회
- 음식 검색: ${stats.features.searches}회
- 식단 기록: ${stats.features.dietEntries}회
- 일별 기능 추이: ${JSON.stringify(stats.features.trend.slice(-7))}

## 커뮤니티
- 전체 게시글: ${stats.community.totalPosts}개
- 최근 ${period}일 게시글: ${stats.community.recentPosts}개
- 전체 댓글: ${stats.community.totalComments}개
- 최근 ${period}일 댓글: ${stats.community.recentComments}개

## 학교 등록
- 총 학교 수: ${stats.schools.total}개
- 인기 학교: ${JSON.stringify(stats.schools.topSchools.slice(0, 5))}

## DAU 추이 (최근 7일)
${JSON.stringify(stats.dauTrend.slice(-7))}`
}
