import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (!profile || !["admin", "super_admin"].includes(profile.role))
      return NextResponse.json({ error: "권한 없음" }, { status: 403 })

    const { stats, period } = await req.json()
    if (!stats) return NextResponse.json({ error: "통계 데이터 필요" }, { status: 400 })

    const prompt = `Here are the operational metrics for Pyeonharu (food allergy management web app) over the last ${period} days. Analyze in English.

## User Overview
- Total Users: ${stats.overview.totalUsers}
- DAU: ${stats.overview.dau}, WAU: ${stats.overview.wau}, MAU: ${stats.overview.mau}
- Retention Rate: ${stats.overview.retentionRate}%, Stickiness: ${stats.overview.stickiness}%

## Signup Trend (Recent ${period}d: ${stats.signups.recent} new)
${JSON.stringify(stats.signups.trend.slice(-7))}

## Feature Usage (${period}d)
- Barcode Scans: ${stats.features.scans}, Safety Checks: ${stats.features.checks}
- Food Search: ${stats.features.searches}, Diet Entries: ${stats.features.dietEntries}

## Community
- Posts: total ${stats.community.totalPosts} / recent ${stats.community.recentPosts}
- Comments: total ${stats.community.totalComments} / recent ${stats.community.recentComments}

## Schools: ${stats.schools.total}, Top: ${JSON.stringify(stats.schools.topSchools.slice(0,5))}
## DAU Trend: ${JSON.stringify(stats.dauTrend.slice(-7))}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `You are a web service operations analyst. Pyeonharu is a Korean food allergy management and diet tracking web app.
Analyze the given metrics and respond ONLY in pure JSON (no markdown code blocks). ALL text must be in ENGLISH:
{
  "overall_grade": "A~F letter grade",
  "overall_summary": "2-3 sentence overall assessment in English",
  "metrics_analysis": {"metric_name": "interpretation in English"},
  "strengths": ["strength1 in English", "strength2"],
  "improvements": [{"issue": "problem in English", "recommendation": "solution in English"}],
  "community_health": "community health summary in English",
  "feature_usage": "feature usage analysis in English",
  "action_items": [{"priority": "high|medium|low", "action": "action in English", "expected_impact": "impact in English"}]
}` },
        { role: "user", content: prompt }
      ],
      temperature: 0.3, max_tokens: 3000,
    })

    let analysis: any
    try {
      const cleaned = (completion.choices[0]?.message?.content || "{}").replace(/```json\n?|```/g, "").trim()
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = { overall_grade: "N/A", overall_summary: "AI 분석 파싱 실패", strengths: [], improvements: [], action_items: [] }
    }

    return NextResponse.json({ success: true, analysis, stats, period })
  } catch (error: any) {
    console.error("Admin report error:", error)
    return NextResponse.json({ error: error.message || "분석 실패" }, { status: 500 })
  }
}
