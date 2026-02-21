"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Loader2, Sparkles, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap } from "lucide-react"

interface Stats {
  period: number
  overview: { totalUsers: number; dau: number; wau: number; mau: number; retentionRate: number; stickiness: number }
  signups: { total: number; recent: number; trend: any[] }
  features: { scans: number; checks: number; searches: number; dietEntries: number; trend: any[] }
  community: { totalPosts: number; recentPosts: number; totalComments: number; recentComments: number; trend: any[] }
  schools: { total: number; topSchools: { name: string; count: number }[] }
  dauTrend: { date: string; dau: number }[]
}

interface Analysis {
  overall_grade: string
  overall_summary: string
  metrics_analysis: Record<string, string>
  strengths: string[]
  improvements: { issue: string; recommendation: string }[]
  community_health: string
  feature_usage: string
  action_items: { priority: string; action: string; expected_impact: string }[]
}

export default function AdminReportButton({ stats, period }: { stats: Stats | null; period: number }) {
  const [generating, setGenerating] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    if (!stats || generating) return
    setGenerating(true)
    setError("")
    try {
      const res = await fetch("/api/admin/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, period }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "분석 실패") }
      const { analysis } = await res.json()
      setAnalysis(analysis)
      setShowModal(true)
    } catch (err: any) {
      setError(err.message)
      setShowModal(true)
    } finally {
      setGenerating(false)
    }
  }

  const gradeColors: Record<string, string> = {
    A: "bg-green-500", B: "bg-blue-500", C: "bg-yellow-500", D: "bg-orange-500", F: "bg-red-600",
  }
  const priorityStyles: Record<string, { bg: string; text: string }> = {
    high: { bg: "bg-red-100", text: "text-red-700" },
    medium: { bg: "bg-amber-100", text: "text-amber-700" },
    low: { bg: "bg-blue-100", text: "text-blue-700" },
  }

  return (
    <>
      <button onClick={handleGenerate} disabled={!stats || generating}
        className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50">
        {generating ? (<><Loader2 className="h-4 w-4 animate-spin" />AI 분석 중...</>) :
          (<><Sparkles className="h-4 w-4" />AI 리포트</>)}
      </button>

      {/* ─── 모달 (Portal) ─── */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto pt-16 pb-8 px-4"
          onClick={() => setShowModal(false)}>
          <div className="w-full max-w-3xl rounded-2xl bg-background shadow-2xl border"
            onClick={(e) => e.stopPropagation()}>

            {/* 헤더 */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b bg-background/95 backdrop-blur px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">AI</div>
                <div>
                  <h2 className="text-base font-bold">편하루 AI 운영 분석 리포트</h2>
                  <p className="text-[11px] text-muted-foreground">최근 {period}일 · GPT-4o 분석 · {new Date().toLocaleDateString("ko-KR")}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error ? (
              <div className="p-6 text-center space-y-3">
                <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : analysis ? (
              <div className="p-6 space-y-6">

                {/* 종합 등급 */}
                <div className="flex items-start gap-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white text-2xl font-black shrink-0 ${gradeColors[analysis.overall_grade?.charAt(0)] || "bg-gray-500"}`}>
                    {analysis.overall_grade || "?"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground">종합 평가</h3>
                    <p className="text-sm mt-1 leading-relaxed">{analysis.overall_summary}</p>
                  </div>
                </div>

                {/* 지표 분석 */}
                {analysis.metrics_analysis && typeof analysis.metrics_analysis === "object" && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-primary" />핵심 지표 분석
                    </h3>
                    <div className="grid gap-2">
                      {Object.entries(analysis.metrics_analysis).map(([key, val]) => (
                        <div key={key} className="rounded-lg border p-3">
                          <p className="text-xs font-bold text-primary">{key}</p>
                          <p className="text-xs text-muted-foreground mt-1">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 기능 활용도 */}
                {analysis.feature_usage && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-amber-500" />기능 활용도
                    </h3>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <p className="text-xs leading-relaxed">{analysis.feature_usage}</p>
                    </div>
                  </div>
                )}

                {/* 커뮤니티 건전성 */}
                {analysis.community_health && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500" />커뮤니티 건전성
                    </h3>
                    <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                      <p className="text-xs leading-relaxed">{analysis.community_health}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 강점 */}
                  {analysis.strengths?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-green-700 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />강점
                      </h3>
                      <div className="space-y-1.5">
                        {analysis.strengths.map((s, i) => (
                          <div key={i} className="flex gap-2 rounded-lg bg-green-50 border border-green-200 p-2.5">
                            <span className="text-green-600 text-xs font-bold shrink-0">✓</span>
                            <p className="text-xs">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 개선점 */}
                  {analysis.improvements?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />개선 필요
                      </h3>
                      <div className="space-y-1.5">
                        {analysis.improvements.map((item, i) => (
                          <div key={i} className="rounded-lg bg-red-50 border border-red-200 p-2.5 space-y-1">
                            <p className="text-xs font-bold text-red-700">{item.issue}</p>
                            <p className="text-xs text-red-600">→ {item.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 액션 아이템 */}
                {analysis.action_items?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-primary" />우선순위별 액션 아이템
                    </h3>
                    <div className="space-y-2">
                      {analysis.action_items.map((item, i) => {
                        const ps = priorityStyles[item.priority] || { bg: "bg-gray-100", text: "text-gray-700" }
                        return (
                          <div key={i} className="rounded-lg border p-3 flex gap-3">
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ps.bg} ${ps.text}`}>
                                {item.priority?.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{item.action}</p>
                              {item.expected_impact && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">기대효과: {item.expected_impact}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 푸터 */}
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    ⚠️ 본 분석은 AI(GPT-4o)가 자동 생성한 것으로, 실제 운영 판단 시 참고용으로만 활용하세요.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
