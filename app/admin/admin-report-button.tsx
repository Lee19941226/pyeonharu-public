"use client"

import { useState } from "react"
import { FileDown, Loader2, Sparkles } from "lucide-react"
import jsPDF from "jspdf"

interface Stats {
  period: number
  overview: {
    totalUsers: number
    dau: number
    wau: number
    mau: number
    retentionRate: number
    stickiness: number
  }
  signups: { total: number; recent: number; trend: any[] }
  features: { scans: number; checks: number; searches: number; dietEntries: number; trend: any[] }
  community: { totalPosts: number; recentPosts: number; totalComments: number; recentComments: number; trend: any[] }
  schools: { total: number; topSchools: { name: string; count: number }[] }
  dauTrend: { date: string; dau: number }[]
}

interface Analysis {
  overall_grade: string
  overall_summary: string
  metrics_analysis: string | Record<string, string>
  strengths: string[]
  improvements: { issue: string; recommendation: string }[]
  community_health: string
  feature_usage: string
  action_items: { priority: string; action: string; expected_impact: string }[]
}

export default function AdminReportButton({ stats, period }: { stats: Stats | null; period: number }) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!stats || generating) return
    setGenerating(true)

    try {
      // 1. AI 분석 요청
      const res = await fetch("/api/admin/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, period }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "분석 실패")
      }

      const { analysis } = await res.json()

      // 2. PDF 생성
      generatePDF(stats, period, analysis)
    } catch (err: any) {
      alert(`리포트 생성 실패: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={!stats || generating}
      className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          AI 분석 중...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          <FileDown className="h-3.5 w-3.5" />
          AI 리포트
        </>
      )}
    </button>
  )
}

// ─── PDF 생성 ───
function generatePDF(stats: Stats, period: number, analysis: Analysis) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })

  // ─── 헬퍼 ───
  const addPage = () => { doc.addPage(); y = margin }
  const checkPage = (need: number) => { if (y + need > pageH - 25) addPage() }

  const drawLine = (yPos: number, color = [200, 200, 200]) => {
    doc.setDrawColor(color[0], color[1], color[2])
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageW - margin, yPos)
  }

  const writeTitle = (text: string, size = 18) => {
    doc.setFontSize(size)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(33, 33, 33)
    doc.text(text, margin, y)
    y += size * 0.5 + 2
  }

  const writeSectionTitle = (emoji: string, text: string) => {
    checkPage(15)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(74, 124, 89)
    doc.text(`${emoji}  ${text}`, margin, y)
    y += 7
    drawLine(y, [74, 124, 89])
    y += 5
  }

  const writeLabel = (label: string, value: string, indent = 0) => {
    checkPage(8)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 100, 100)
    doc.text(label, margin + indent, y)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(33, 33, 33)
    doc.text(value, pageW - margin, y, { align: "right" })
    y += 6
  }

  const writeParagraph = (text: string, size = 10) => {
    doc.setFontSize(size)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(text, contentW)
    for (const line of lines) {
      checkPage(6)
      doc.text(line, margin, y)
      y += 5
    }
    y += 2
  }

  const writeBullet = (text: string, color = [60, 60, 60]) => {
    checkPage(8)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(color[0], color[1], color[2])
    const lines = doc.splitTextToSize(text, contentW - 8)
    doc.setFillColor(74, 124, 89)
    doc.circle(margin + 2, y - 1.5, 1, "F")
    for (let i = 0; i < lines.length; i++) {
      checkPage(6)
      doc.text(lines[i], margin + 8, y)
      y += 5
    }
    y += 1
  }

  const drawGradeBadge = (grade: string) => {
    const gradeColors: Record<string, number[]> = {
      A: [34, 197, 94], B: [59, 130, 246], C: [245, 158, 11],
      D: [239, 68, 68], F: [127, 29, 29],
    }
    const c = gradeColors[grade.charAt(0)] || [100, 100, 100]
    const badgeX = pageW - margin - 25
    const badgeY = y - 12
    doc.setFillColor(c[0], c[1], c[2])
    doc.roundedRect(badgeX, badgeY, 25, 14, 3, 3, "F")
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255)
    doc.text(grade, badgeX + 12.5, badgeY + 10, { align: "center" })
  }

  // ═══════════════════════════════════
  // 커버
  // ═══════════════════════════════════
  doc.setFillColor(74, 124, 89)
  doc.rect(0, 0, pageW, 60, "F")

  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("Pyeonharu Analytics Report", margin, 30)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(220, 240, 220)
  doc.text(`AI-Powered Site Health Analysis  |  Period: ${period} days  |  ${today}`, margin, 42)

  y = 75

  // ═══ 1. 종합 평가 ═══
  writeSectionTitle("[Grade]", "Overall Assessment")
  drawGradeBadge(analysis.overall_grade || "N/A")
  writeParagraph(analysis.overall_summary || "No summary available.")
  y += 3

  // ═══ 2. 핵심 지표 ═══
  writeSectionTitle("[KPI]", "Key Performance Indicators")

  // 테이블 스타일 지표
  const kpis = [
    ["Total Users", `${stats.overview.totalUsers.toLocaleString()}`],
    ["DAU (Daily Active)", `${stats.overview.dau.toLocaleString()}`],
    ["WAU (Weekly Active)", `${stats.overview.wau.toLocaleString()}`],
    ["MAU (Monthly Active)", `${stats.overview.mau.toLocaleString()}`],
    ["Retention Rate (7d)", `${stats.overview.retentionRate}%`],
    ["Stickiness (DAU/MAU)", `${stats.overview.stickiness}%`],
  ]

  // 박스 배경
  checkPage(kpis.length * 6 + 8)
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margin, y - 3, contentW, kpis.length * 6 + 6, 2, 2, "F")
  for (const [label, value] of kpis) {
    writeLabel(label, value, 3)
  }
  y += 5

  // AI 분석
  if (typeof analysis.metrics_analysis === "string") {
    writeParagraph(analysis.metrics_analysis)
  } else if (typeof analysis.metrics_analysis === "object") {
    for (const [key, val] of Object.entries(analysis.metrics_analysis)) {
      checkPage(12)
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(74, 124, 89)
      doc.text(key, margin, y)
      y += 5
      writeParagraph(val as string)
    }
  }

  // ═══ 3. 기능 사용 ═══
  writeSectionTitle("[Features]", "Feature Usage Analysis")

  const features = [
    ["Barcode Scans", `${stats.features.scans.toLocaleString()}`],
    ["Safety Checks", `${stats.features.checks.toLocaleString()}`],
    ["Food Search", `${stats.features.searches.toLocaleString()}`],
    ["Diet Entries", `${stats.features.dietEntries.toLocaleString()}`],
  ]

  checkPage(features.length * 6 + 8)
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margin, y - 3, contentW, features.length * 6 + 6, 2, 2, "F")
  for (const [label, value] of features) {
    writeLabel(label, value, 3)
  }
  y += 3

  if (analysis.feature_usage) writeParagraph(analysis.feature_usage)

  // ═══ 4. 커뮤니티 ═══
  writeSectionTitle("[Community]", "Community Health")

  const communityData = [
    ["Total Posts", `${stats.community.totalPosts.toLocaleString()}`],
    [`Posts (${period}d)`, `${stats.community.recentPosts.toLocaleString()}`],
    ["Total Comments", `${stats.community.totalComments.toLocaleString()}`],
    [`Comments (${period}d)`, `${stats.community.recentComments.toLocaleString()}`],
    ["Schools Registered", `${stats.schools.total.toLocaleString()}`],
  ]

  checkPage(communityData.length * 6 + 8)
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margin, y - 3, contentW, communityData.length * 6 + 6, 2, 2, "F")
  for (const [label, value] of communityData) {
    writeLabel(label, value, 3)
  }
  y += 3

  if (analysis.community_health) writeParagraph(analysis.community_health)

  // ═══ 5. 강점 ═══
  if (analysis.strengths?.length) {
    writeSectionTitle("[+]", "Strengths")
    for (const s of analysis.strengths) {
      writeBullet(s, [34, 120, 60])
    }
    y += 2
  }

  // ═══ 6. 개선점 ═══
  if (analysis.improvements?.length) {
    writeSectionTitle("[!]", "Areas for Improvement")
    for (const item of analysis.improvements) {
      checkPage(16)
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(220, 50, 50)
      doc.text(`Issue: ${item.issue || ""}`, margin + 4, y)
      y += 5
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 60, 60)
      const recLines = doc.splitTextToSize(`Recommendation: ${item.recommendation || ""}`, contentW - 8)
      for (const line of recLines) {
        checkPage(6)
        doc.text(line, margin + 4, y)
        y += 5
      }
      y += 3
    }
  }

  // ═══ 7. 액션 아이템 ═══
  if (analysis.action_items?.length) {
    writeSectionTitle("[Action]", "Prioritized Action Items")

    const priorityColors: Record<string, number[]> = {
      high: [220, 38, 38], medium: [245, 158, 11], low: [59, 130, 246],
    }

    for (let i = 0; i < analysis.action_items.length; i++) {
      const item = analysis.action_items[i]
      checkPage(20)

      // 넘버링 + 우선도 배지
      const pColor = priorityColors[item.priority] || [100, 100, 100]
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(33, 33, 33)
      doc.text(`${i + 1}.`, margin, y)

      // 우선도 뱃지
      doc.setFillColor(pColor[0], pColor[1], pColor[2])
      doc.roundedRect(margin + 6, y - 3.5, 14, 5, 1.5, 1.5, "F")
      doc.setFontSize(7)
      doc.setTextColor(255, 255, 255)
      doc.text(item.priority.toUpperCase(), margin + 13, y, { align: "center" })

      // 액션
      doc.setFontSize(10)
      doc.setTextColor(33, 33, 33)
      doc.setFont("helvetica", "bold")
      const actionLines = doc.splitTextToSize(item.action || "", contentW - 30)
      for (const line of actionLines) {
        doc.text(line, margin + 23, y)
        y += 5
      }

      // 기대 효과
      if (item.expected_impact) {
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 100, 100)
        doc.setFontSize(9)
        const impactLines = doc.splitTextToSize(`Expected: ${item.expected_impact}`, contentW - 30)
        for (const line of impactLines) {
          checkPage(5)
          doc.text(line, margin + 23, y)
          y += 4.5
        }
      }
      y += 3
    }
  }

  // ═══ 푸터 ═══
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(160, 160, 160)
    doc.text(`Pyeonharu Admin Report  |  Generated ${today}  |  AI-Analyzed by GPT-4o`, margin, pageH - 10)
    doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 10, { align: "right" })
  }

  // ─── 다운로드 ───
  const filename = `pyeonharu-report-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
