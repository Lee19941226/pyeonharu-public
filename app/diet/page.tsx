"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Camera, ImageIcon, PenLine, Trash2, X, AlertTriangle, Activity, ChevronLeft, ChevronRight, Loader2, Info, Sparkles, CalendarDays, TrendingUp, TrendingDown, Flame, BarChart3, Trophy, Utensils, Download } from "lucide-react"

function getTimePeriod(dateStr: string): { label: string; emoji: string; color: string } {
  const h = new Date(dateStr).getHours()
  if (h >= 5 && h < 10) return { label: "아침", emoji: "🌅", color: "bg-amber-100 text-amber-700" }
  if (h >= 10 && h < 15) return { label: "점심", emoji: "☀️", color: "bg-orange-100 text-orange-700" }
  if (h >= 15 && h < 21) return { label: "저녁", emoji: "🌇", color: "bg-blue-100 text-blue-700" }
  return { label: "야식", emoji: "🌙", color: "bg-purple-100 text-purple-700" }
}

function getExercise(overCal: number) {
  return [
    { name: "걷기", emoji: "🚶", mins: Math.round(overCal / 4.5) },
    { name: "달리기", emoji: "🏃", mins: Math.round(overCal / 11) },
    { name: "계단", emoji: "🪜", mins: Math.round(overCal / 9) },
    { name: "자전거", emoji: "🚴", mins: Math.round(overCal / 7.5) },
  ]
}

function CircularProgress({ current, total, isOver, size = 160 }: { current: number; total: number; isOver: boolean; size?: number }) {
  const stroke = size > 120 ? 10 : 8; const r = (size - stroke) / 2; const circ = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(current / total, 2) : 0; const offset = circ * (1 - Math.min(pct, 1))
  const color = isOver ? "#DC2626" : "#4A7C59"
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-extrabold ${isOver ? "text-red-600" : "text-primary"} ${size > 120 ? "text-3xl" : "text-xl"}`}>{current.toLocaleString()}</span>
        <span className={`text-muted-foreground ${size > 120 ? "text-xs" : "text-[10px]"}`}>/ {total > 0 ? total.toLocaleString() : "미설정"} kcal</span>
      </div>
    </div>
  )
}

function MiniBarChart({ dailyStats, bmr }: { dailyStats: DailyStat[]; bmr: number }) {
  const maxCal = Math.max(...dailyStats.map((d) => d.totalCal), bmr || 1)
  return (
    <div className="flex items-end gap-1 h-24">
      {dailyStats.map((d) => {
        const height = maxCal > 0 ? Math.max((d.totalCal / maxCal) * 100, d.totalCal > 0 ? 4 : 1) : 1
        const isOver = bmr > 0 && d.totalCal > bmr
        const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("ko-KR", { weekday: "narrow" })
        const isDayToday = d.date === new Date().toLocaleDateString("en-CA")
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">{d.totalCal.toLocaleString()}kcal</div>
            <div className={`w-full rounded-t transition-all duration-300 ${isOver ? "bg-red-400" : d.totalCal > 0 ? "bg-primary/70" : "bg-muted"}`} style={{ height: `${height}%`, minHeight: d.totalCal > 0 ? "3px" : "1px" }} />
            <span className={`text-[9px] ${isDayToday ? "font-bold text-primary" : "text-muted-foreground"}`}>{dayLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

function CalorieAnalysisCard({ totalCal, bmr, overAmount }: { totalCal: number; bmr: number; overAmount: number }) {
  return (<Card className="border-red-200 bg-red-50/50"><CardContent className="p-4 space-y-3">
    <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">AI</div><div><p className="text-sm font-bold text-red-600">칼로리 초과 분석</p><p className="text-[10px] text-muted-foreground">GPT-4o 기준</p></div></div>
    <div className="rounded-md bg-white border-l-2 border-red-500 p-3"><p className="text-xs">총 <strong className="text-red-600">{totalCal.toLocaleString()}kcal</strong> 섭취</p><p className="text-xs">기초대사량 대비 <strong className="text-red-600">{overAmount.toLocaleString()}kcal 초과</strong></p></div>
    <div><p className="text-xs font-bold mb-2">💪 소모 운동량</p><div className="grid grid-cols-2 gap-1.5">{getExercise(overAmount).map((ex) => (<div key={ex.name} className="flex items-center justify-between rounded-md bg-green-50 px-2.5 py-1.5 text-xs"><span>{ex.emoji} {ex.name}</span><span className="font-bold text-primary">{ex.mins}분</span></div>))}</div></div>
  </CardContent></Card>)
}

interface DietEntry { id: string; food_name: string; estimated_cal: number; source: "ai" | "manual"; emoji: string; ai_confidence: number | null; image_url: string | null; recorded_at: string }
interface DailyStat { date: string; totalCal: number; count: number; isOver: boolean; overAmount: number }
interface ReportSummary { totalCalSum: number; avgCal: number; daysWithData: number; totalDays: number; overDays: number; maxDay: { date: string; totalCal: number } | null; minDay: { date: string; totalCal: number } | null; topFoods: { name: string; count: number }[] }
type ViewMode = "daily" | "weekly" | "monthly"

export default function DietPage() {
  const router = useRouter(); const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null); const cameraInputRef = useRef<HTMLInputElement>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [user, setUser] = useState<any>(null); const [entries, setEntries] = useState<DietEntry[]>([]); const [totalCal, setTotalCal] = useState(0); const [bmr, setBmr] = useState(0)
  const [isLoading, setIsLoading] = useState(true); const [isAnalyzing, setIsAnalyzing] = useState(false); const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"))
  const [reportData, setReportData] = useState<{ dailyStats: DailyStat[]; summary: ReportSummary; startDate: string; endDate: string } | null>(null); const [reportLoading, setReportLoading] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false); const [manualName, setManualName] = useState(""); const [manualCal, setManualCal] = useState("")
  const [showWarning, setShowWarning] = useState(false); const [warningShownToday, setWarningShownToday] = useState(false); const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [manualImage, setManualImage] = useState<File | null>(null); const [manualImagePreview, setManualImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false); const manualImageInputRef = useRef<HTMLInputElement>(null); const editImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { setUser(user); if (!user) setIsLoading(false) }) }, [])

  const loadEntries = useCallback(async () => {
    if (!user) return; setIsLoading(true)
    try { const res = await fetch(`/api/diet/entries?date=${date}`); const data = await res.json()
      if (data.success) { setEntries(data.entries); setTotalCal(data.totalCal); setBmr(data.bmr)
        if (data.isOver && !warningShownToday) { const key = `diet_warning_${date}`; if (typeof window !== "undefined" && !sessionStorage.getItem(key)) { setShowWarning(true); sessionStorage.setItem(key, "1"); setWarningShownToday(true) } }
      }
    } catch { toast.error("데이터를 불러오지 못했습니다") } finally { setIsLoading(false) }
  }, [user, date, warningShownToday])
  useEffect(() => { if (user) loadEntries() }, [user, date, loadEntries])

  const loadReport = useCallback(async (type: "weekly" | "monthly") => {
    if (!user) return; setReportLoading(true)
    try { const res = await fetch(`/api/diet/report?type=${type}&date=${date}`); const data = await res.json()
      if (data.success) { setReportData({ dailyStats: data.dailyStats, summary: data.summary, startDate: data.startDate, endDate: data.endDate }); if (data.bmr) setBmr(data.bmr) }
    } catch { toast.error("리포트를 불러오지 못했습니다") } finally { setReportLoading(false) }
  }, [user, date])
  useEffect(() => { if (viewMode !== "daily" && user) loadReport(viewMode) }, [viewMode, user, date, loadReport])

  const handlePhotoAnalyze = async (file: File) => {
    setIsAnalyzing(true)
    try { const fd = new FormData(); fd.append("image", file); const res = await fetch("/api/diet/analyze", { method: "POST", body: fd }); const data = await res.json()
      if (data.success) { toast.success(`${data.entry.emoji} ${data.entry.food_name} (${data.entry.estimated_cal}kcal) 추가!`); loadEntries() } else toast.error(data.error || "분석 실패")
    } catch { toast.error("분석 중 오류") } finally { setIsAnalyzing(false) }
  }

  const handleManualImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("이미지 파일만 선택 가능합니다"); return }
    if (file.size > 5 * 1024 * 1024) { toast.error("5MB 이하 이미지만 가능합니다"); return }
    setManualImage(file); const reader = new FileReader(); reader.onload = (e) => setManualImagePreview(e.target?.result as string); reader.readAsDataURL(file)
  }

  const uploadDietImage = async (file: File, entryId?: string): Promise<string | null> => {
    try { const fd = new FormData(); fd.append("image", file); if (entryId) fd.append("entryId", entryId)
      const res = await fetch("/api/diet/upload-image", { method: "POST", body: fd }); const data = await res.json()
      if (data.success) return data.image_url; toast.error(data.error || "이미지 업로드 실패"); return null
    } catch { toast.error("이미지 업로드 중 오류"); return null }
  }

  const handleEditImage = async (entryId: string, file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("이미지 파일만 선택 가능합니다"); return }
    setIsUploadingImage(true)
    try { const imageUrl = await uploadDietImage(file, entryId); if (imageUrl) { toast.success("사진이 추가되었습니다"); loadEntries() } } finally { setIsUploadingImage(false) }
  }

  const handleDownloadImage = async (imageUrl: string, foodName: string) => {
    try { const response = await fetch(imageUrl); const blob = await response.blob(); const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = `${foodName}_${new Date().toLocaleDateString("ko-KR")}.jpg`; document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url); toast.success("이미지가 저장되었습니다")
    } catch { window.open(imageUrl, "_blank") }
  }

  const closeManualInput = () => { setShowManualInput(false); setManualName(""); setManualCal(""); setManualImage(null); setManualImagePreview(null) }

  const handleManualSubmit = async () => {
    if (!manualName.trim() || !manualCal) return
    try {
      let imageUrl: string | null = null
      if (manualImage) { setIsUploadingImage(true); imageUrl = await uploadDietImage(manualImage); setIsUploadingImage(false) }
      const res = await fetch("/api/diet/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ food_name: manualName.trim(), estimated_cal: parseInt(manualCal), image_url: imageUrl }) })
      const data = await res.json()
      if (data.success) { toast.success(`${imageUrl ? "📸" : "📝"} ${manualName} (${manualCal}kcal) 추가!`); closeManualInput(); loadEntries() } else toast.error(data.error)
    } catch { toast.error("저장에 실패했습니다") }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 을 삭제할까요?`)) return
    try { const res = await fetch(`/api/diet/entries?id=${id}`, { method: "DELETE" }); const data = await res.json(); if (data.success) { toast.success("삭제되었습니다"); loadEntries() } } catch { toast.error("삭제 실패") }
  }

  const moveDate = (offset: number) => { const d = new Date(date); if (viewMode === "monthly") d.setMonth(d.getMonth() + offset); else if (viewMode === "weekly") d.setDate(d.getDate() + offset * 7); else d.setDate(d.getDate() + offset); setDate(d.toLocaleDateString("en-CA")); setWarningShownToday(false) }

  const isToday = date === new Date().toLocaleDateString("en-CA"); const isOver = bmr > 0 && totalCal > bmr; const overAmount = isOver ? totalCal - bmr : 0
  const getDateLabel = () => { const d = new Date(date + "T12:00:00"); if (viewMode === "monthly") return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long" }); if (viewMode === "weekly" && reportData) { const s = new Date(reportData.startDate + "T12:00:00"); const e = new Date(reportData.endDate + "T12:00:00"); return `${s.getMonth()+1}/${s.getDate()} ~ ${e.getMonth()+1}/${e.getDate()}` }; return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }) }

  if (!isLoading && !user) return (<div className="flex min-h-screen flex-col bg-background"><Header /><main className="flex-1 flex items-center justify-center pb-16 md:pb-0"><div className="text-center space-y-4 px-4"><Activity className="h-12 w-12 text-muted-foreground mx-auto" /><h2 className="text-lg font-semibold">로그인이 필요합니다</h2><p className="text-sm text-muted-foreground">식단관리 기능은 로그인 후 이용할 수 있어요</p><Button onClick={() => router.push("/login")}>로그인</Button></div></main><MobileNav /></div>)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0"><div className="container mx-auto px-4 py-4"><div className="flex gap-6 justify-center">
        {/* 좌측 패널 (데스크톱) */}
        <div className="hidden lg:block"><div className="sticky top-20 w-64 space-y-3">
          <Card><CardContent className="p-3"><div className="flex rounded-lg bg-muted p-0.5">{(["daily","weekly","monthly"] as ViewMode[]).map((mode) => (<button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${viewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{mode === "daily" ? "일일" : mode === "weekly" ? "주간" : "월간"}</button>))}</div></CardContent></Card>
          <Card><CardContent className="p-4 space-y-3"><div className="flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /><span className="text-xs font-bold">오늘 요약</span></div><CircularProgress current={totalCal} total={bmr} isOver={isOver} size={100} /><div className="grid grid-cols-3 gap-1 text-center"><div><p className="text-[10px] text-muted-foreground">섭취</p><p className={`text-xs font-bold ${isOver?"text-red-600":""}`}>{totalCal.toLocaleString()}</p></div><div><p className="text-[10px] text-muted-foreground">BMR</p><p className="text-xs font-bold">{bmr>0?bmr.toLocaleString():"-"}</p></div><div><p className="text-[10px] text-muted-foreground">{isOver?"초과":"남은"}</p><p className={`text-xs font-bold ${isOver?"text-red-600":"text-primary"}`}>{bmr>0?(isOver?`+${overAmount.toLocaleString()}`:(bmr-totalCal).toLocaleString()):"-"}</p></div></div></CardContent></Card>
          {viewMode !== "daily" && reportData && !reportLoading && (<><Card><CardContent className="p-4 space-y-3"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><span className="text-xs font-bold">{viewMode === "weekly" ? "주간" : "월간"} 칼로리</span></div><MiniBarChart dailyStats={reportData.dailyStats} bmr={bmr} /></CardContent></Card><Card><CardContent className="p-4 space-y-2"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /><span className="text-xs font-bold">통계</span></div><div className="space-y-1.5"><div className="flex justify-between text-xs"><span className="text-muted-foreground">평균 칼로리</span><span className="font-medium">{reportData.summary.avgCal.toLocaleString()}kcal</span></div><div className="flex justify-between text-xs"><span className="text-muted-foreground">기록한 날</span><span className="font-medium">{reportData.summary.daysWithData} / {reportData.summary.totalDays}일</span></div>{bmr > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">초과한 날</span><span className={`font-medium ${reportData.summary.overDays > 0 ? "text-red-600" : "text-primary"}`}>{reportData.summary.overDays}일</span></div>}{reportData.summary.maxDay && <div className="flex justify-between text-xs"><span className="text-muted-foreground">최대 섭취</span><span className="font-medium">{reportData.summary.maxDay.totalCal.toLocaleString()}kcal</span></div>}</div></CardContent></Card>{reportData.summary.topFoods.length > 0 && <Card><CardContent className="p-4 space-y-2"><div className="flex items-center gap-2"><Utensils className="h-4 w-4 text-primary" /><span className="text-xs font-bold">자주 먹은 음식</span></div><div className="space-y-1">{reportData.summary.topFoods.map((f, i) => (<div key={f.name} className="flex items-center gap-2 text-xs"><span className="text-muted-foreground w-3">{i+1}</span><span className="flex-1 truncate">{f.name}</span><Badge variant="secondary" className="text-[10px] h-4 px-1.5">{f.count}회</Badge></div>))}</div></CardContent></Card>}</>)}
          {isOver && entries.length > 0 && viewMode === "daily" && <CalorieAnalysisCard totalCal={totalCal} bmr={bmr} overAmount={overAmount} />}
        </div></div>

        {/* 메인 콘텐츠 */}
        <div className="w-full max-w-lg space-y-4">
          <div className="lg:hidden"><div className="flex rounded-lg bg-muted p-0.5">{(["daily","weekly","monthly"] as ViewMode[]).map((mode) => (<button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${viewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{mode === "daily" ? "일일" : mode === "weekly" ? "주간" : "월간"}</button>))}</div></div>
          <div className="flex items-center justify-between"><Button variant="ghost" size="icon" onClick={() => moveDate(-1)}><ChevronLeft className="h-5 w-5" /></Button><div className="text-center"><p className="text-xs text-muted-foreground">{getDateLabel()}</p><h1 className="text-lg font-bold">{viewMode === "daily" ? (isToday ? "오늘의 식단" : "지난 기록") : viewMode === "weekly" ? "주간 리포트" : "월간 리포트"}</h1></div><Button variant="ghost" size="icon" onClick={() => moveDate(1)} disabled={viewMode === "daily" && isToday}><ChevronRight className="h-5 w-5" /></Button></div>

          {viewMode === "daily" && (<>
            {bmr === 0 && !isLoading && <Card className="border-dashed border-primary/50"><CardContent className="p-4 text-center space-y-2"><Info className="h-6 w-6 text-primary mx-auto" /><p className="text-sm font-medium">기초대사량을 설정해주세요</p><p className="text-xs text-muted-foreground">칼로리 초과 분석을 위해 필요해요</p><Button size="sm" onClick={() => router.push("/mypage")}>마이페이지에서 설정하기</Button></CardContent></Card>}
            <div className="lg:hidden">{isLoading ? <div className="flex justify-center py-8"><Skeleton className="h-40 w-40 rounded-full" /></div> : <CircularProgress current={totalCal} total={bmr} isOver={isOver} />}{!isLoading && <div className="grid grid-cols-3 gap-2 text-center text-sm mt-3"><div><p className="text-muted-foreground text-xs">섭취</p><p className={`font-bold ${isOver?"text-red-600":""}`}>{totalCal.toLocaleString()}</p></div><div><p className="text-muted-foreground text-xs">기초대사량</p><p className="font-bold">{bmr>0?bmr.toLocaleString():"-"}</p></div><div><p className="text-muted-foreground text-xs">{isOver?"초과":"남은량"}</p><p className={`font-bold ${isOver?"text-red-600":"text-primary"}`}>{bmr>0?(isOver?`+${overAmount.toLocaleString()}`:(bmr-totalCal).toLocaleString()):"-"}</p></div></div>}</div>
            <div className="hidden lg:block">{!isLoading && <div className="grid grid-cols-3 gap-2 text-center text-sm"><div><p className="text-muted-foreground text-xs">섭취</p><p className={`font-bold ${isOver?"text-red-600":""}`}>{totalCal.toLocaleString()}</p></div><div><p className="text-muted-foreground text-xs">기초대사량</p><p className="font-bold">{bmr>0?bmr.toLocaleString():"-"}</p></div><div><p className="text-muted-foreground text-xs">{isOver?"초과":"남은량"}</p><p className={`font-bold ${isOver?"text-red-600":"text-primary"}`}>{bmr>0?(isOver?`+${overAmount.toLocaleString()}`:(bmr-totalCal).toLocaleString()):"-"}</p></div></div>}</div>
            {isToday && <div className="flex gap-2"><Button variant="outline" className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/5" onClick={() => cameraInputRef.current?.click()} disabled={isAnalyzing}>{isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}{isAnalyzing ? "분석 중..." : "사진 촬영"}</Button><Button variant="outline" className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/5" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}><ImageIcon className="h-4 w-4" />앨범 선택</Button><Button className="flex-1 gap-2" onClick={() => setShowManualInput(true)}><PenLine className="h-4 w-4" />직접 입력</Button><input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoAnalyze(f); e.target.value = "" }} /><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoAnalyze(f); e.target.value = "" }} /></div>}
            {isAnalyzing && <Card className="border-primary/30 bg-primary/5"><CardContent className="p-4 flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-primary" /><div><p className="text-sm font-medium">AI가 음식을 분석하고 있어요...</p><p className="text-xs text-muted-foreground">잠시만 기다려주세요</p></div></CardContent></Card>}
            {isOver && entries.length > 0 && <div className="lg:hidden"><CalorieAnalysisCard totalCal={totalCal} bmr={bmr} overAmount={overAmount} /></div>}
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold flex items-center gap-1.5">📋 {isToday ? "오늘" : "이 날"} 먹은 것들</h2><span className="text-[10px] text-muted-foreground">00시 리셋</span></div>
            {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div> : entries.length === 0 ? <div className="py-12 text-center"><p className="text-sm text-muted-foreground">아직 기록이 없어요</p>{isToday && <p className="text-xs text-muted-foreground mt-1">사진을 찍거나 직접 입력해보세요</p>}</div> : (
              <div className="space-y-2">{entries.map((entry, idx) => { const period = getTimePeriod(entry.recorded_at); const time = new Date(entry.recorded_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }); return (
                <Card key={entry.id} className={`transition-all ${isOver && idx === entries.length - 1 ? "border-red-200" : ""}`}><CardContent className="p-3"><div className="flex items-start justify-between gap-2"><div className="flex gap-3 flex-1 min-w-0">
                  {entry.image_url ? (<div className="flex-shrink-0 relative group"><button onClick={() => setPreviewImage(entry.image_url)} className="overflow-hidden rounded-lg border hover:border-primary/50 transition-colors"><img src={entry.image_url} alt={entry.food_name} className="h-12 w-12 object-cover" /></button>{isToday && <button onClick={(e) => { e.stopPropagation(); editImageInputRef.current?.setAttribute("data-entry-id", entry.id); editImageInputRef.current?.click() }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"><Camera className="h-4 w-4 text-white" /></button>}</div>
                  ) : (<button onClick={() => { if (isToday) { editImageInputRef.current?.setAttribute("data-entry-id", entry.id); editImageInputRef.current?.click() } }} className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-lg relative group ${isToday ? "cursor-pointer hover:bg-primary/10 transition-colors" : ""}`}><span>{entry.emoji}</span>{isToday && <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"><Camera className="h-3.5 w-3.5 text-white" /></div>}</button>)}
                  <div className="min-w-0"><span className="text-sm font-medium truncate block">{entry.food_name}</span><div className="flex items-center gap-1.5 mt-1 flex-wrap"><span className="text-[11px] text-muted-foreground">{time}</span><Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${period.color}`}>{period.label}</Badge><Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${entry.source === "ai" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>{entry.source === "ai" ? "AI 추정" : "직접 입력"}</Badge></div></div>
                </div><div className="flex items-center gap-2 flex-shrink-0"><span className={`text-sm font-bold ${isOver ? "text-red-600" : "text-primary"}`}>{entry.estimated_cal}</span>{isToday && <button onClick={() => handleDelete(entry.id, entry.food_name)} className="text-muted-foreground hover:text-red-500 transition-colors p-1"><Trash2 className="h-3.5 w-3.5" /></button>}</div></div></CardContent></Card>
              ) })}</div>)}
            <input ref={editImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; const eid = editImageInputRef.current?.getAttribute("data-entry-id"); if (f && eid) handleEditImage(eid, f); e.target.value = "" }} />
          </>)}

          {viewMode !== "daily" && (<>{reportLoading ? <div className="space-y-4"><Skeleton className="h-32 w-full rounded-lg" /><Skeleton className="h-48 w-full rounded-lg" /><Skeleton className="h-24 w-full rounded-lg" /></div> : !reportData ? <div className="py-12 text-center"><p className="text-sm text-muted-foreground">데이터를 불러오는 중...</p></div> : (<>
            <div className="lg:hidden"><Card><CardContent className="p-4 space-y-3"><div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-primary/5 p-3 text-center"><p className="text-[10px] text-muted-foreground">일 평균</p><p className="text-lg font-bold text-primary">{reportData.summary.avgCal.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">kcal</p></div><div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-[10px] text-muted-foreground">기록한 날</p><p className="text-lg font-bold">{reportData.summary.daysWithData}</p><p className="text-[10px] text-muted-foreground">/ {reportData.summary.totalDays}일</p></div>{bmr > 0 && <><div className={`rounded-lg p-3 text-center ${reportData.summary.overDays > 0 ? "bg-red-50" : "bg-green-50"}`}><p className="text-[10px] text-muted-foreground">초과한 날</p><p className={`text-lg font-bold ${reportData.summary.overDays > 0 ? "text-red-600" : "text-green-600"}`}>{reportData.summary.overDays}일</p><p className="text-[10px] text-muted-foreground">{reportData.summary.overDays > 0 ? "주의 필요" : "잘하고 있어요!"}</p></div><div className="rounded-lg bg-blue-50 p-3 text-center"><p className="text-[10px] text-muted-foreground">총 섭취</p><p className="text-lg font-bold text-blue-600">{reportData.summary.totalCalSum.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">kcal</p></div></>}</div></CardContent></Card></div>
            <Card><CardContent className="p-4 space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-primary" />일별 칼로리</h3>{bmr > 0 && <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="h-[1px] w-4 border-t border-dashed border-red-400" />BMR {bmr.toLocaleString()}</div>}</div><MiniBarChart dailyStats={reportData.dailyStats} bmr={bmr} /></CardContent></Card>
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold">📅 일별 상세</h2></div>
            <div className="space-y-1.5">{reportData.dailyStats.map((d) => { const dayDate = new Date(d.date + "T12:00:00"); const dayLabel = dayDate.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "narrow" }); const pct = bmr > 0 ? Math.min((d.totalCal / bmr) * 100, 100) : 0; return (<Card key={d.date} className={`cursor-pointer transition-colors hover:bg-muted/50 ${d.isOver ? "border-red-200" : ""}`} onClick={() => { setViewMode("daily"); setDate(d.date) }}><CardContent className="p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground w-16 shrink-0">{dayLabel}</span><div className="flex-1"><div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all ${d.isOver ? "bg-red-400" : d.totalCal > 0 ? "bg-primary/60" : ""}`} style={{ width: `${pct}%` }} /></div></div><div className="flex items-center gap-1.5 shrink-0"><span className={`text-xs font-medium ${d.isOver ? "text-red-600" : d.totalCal > 0 ? "" : "text-muted-foreground"}`}>{d.totalCal > 0 ? `${d.totalCal.toLocaleString()}kcal` : "-"}</span>{d.count > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{d.count}끼</Badge>}</div></div></CardContent></Card>) })}</div>
            {reportData.summary.topFoods.length > 0 && <div className="lg:hidden"><Card><CardContent className="p-4 space-y-2"><div className="flex items-center gap-2"><Utensils className="h-4 w-4 text-primary" /><span className="text-sm font-bold">자주 먹은 음식</span></div><div className="space-y-1.5">{reportData.summary.topFoods.map((f, i) => (<div key={f.name} className="flex items-center gap-2 text-sm"><span className="text-muted-foreground w-4 text-right">{i+1}</span><span className="flex-1 truncate">{f.name}</span><Badge variant="secondary" className="text-xs">{f.count}회</Badge></div>))}</div></CardContent></Card></div>}
          </>)}</>)}
        </div>
      </div></div></main>
      <MobileNav />

      {showManualInput && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeManualInput}><div className="w-full max-w-sm rounded-xl bg-background p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">칼로리 직접 입력</h3><p className="text-xs text-muted-foreground">정확한 칼로리를 알고 있다면</p></div><button onClick={closeManualInput} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button></div>
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">사진 (선택)</label><div className="mt-1">{manualImagePreview ? (<div className="relative"><img src={manualImagePreview} alt="음식 사진" className="w-full h-32 object-cover rounded-lg border" /><button onClick={() => { setManualImage(null); setManualImagePreview(null) }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"><X className="h-3.5 w-3.5" /></button><button onClick={() => manualImageInputRef.current?.click()} className="absolute bottom-1 right-1 bg-black/50 text-white rounded-full px-2 py-0.5 text-[10px] hover:bg-black/70 transition-colors">변경</button></div>) : (<div className="flex gap-2"><button onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.capture = "environment"; input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleManualImageSelect(f) }; input.click() }} className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors"><Camera className="h-3.5 w-3.5" />촬영</button><button onClick={() => manualImageInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors"><ImageIcon className="h-3.5 w-3.5" />앨범에서 선택</button></div>)}<input ref={manualImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleManualImageSelect(f); e.target.value = "" }} /></div></div>
          <div><label className="text-xs font-medium text-muted-foreground">음식 이름</label><Input placeholder="예: 빅맥 세트, 삼각김밥" value={manualName} onChange={(e) => setManualName(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">칼로리 (kcal)</label><Input type="number" placeholder="예: 950" value={manualCal} onChange={(e) => setManualCal(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="rounded-lg bg-blue-50 p-3"><p className="text-xs text-blue-700">💡 맥도날드, 스타벅스 등 메뉴에 칼로리가 표기된 경우 직접 입력하면 더 정확해요.</p></div>
        <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={closeManualInput}>취소</Button><Button className="flex-[2]" disabled={!manualName.trim() || !manualCal || parseInt(manualCal) <= 0 || isUploadingImage} onClick={handleManualSubmit}>{isUploadingImage ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />업로드 중...</> : "등록하기"}</Button></div>
      </div></div>)}

      {showWarning && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-background overflow-hidden"><div className="bg-gradient-to-b from-red-100 to-red-50 p-6 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white text-xl">⚠️</div><h3 className="text-lg font-extrabold text-red-600">칼로리 초과 주의</h3><p className="text-sm text-muted-foreground mt-2">오늘 <strong className="text-red-600">{totalCal.toLocaleString()}kcal</strong> 섭취<br />기초대사량 대비 <strong className="text-red-600">{overAmount.toLocaleString()}kcal</strong> 초과</p></div><div className="p-4 space-y-3"><p className="text-xs font-bold">초과분 소모를 위한 운동</p><div className="grid grid-cols-2 gap-2">{getExercise(overAmount).map((ex) => (<div key={ex.name} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-xs"><span>{ex.emoji} {ex.name}</span><span className="font-bold text-primary">{ex.mins}분</span></div>))}</div></div><div className="px-4 pb-4"><Button className="w-full" onClick={() => setShowWarning(false)}>확인</Button><p className="text-center text-[10px] text-muted-foreground mt-2">이 알림은 1일 1회 표시됩니다</p></div></div></div>)}

      {previewImage && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewImage(null)}><div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}><div className="absolute -top-10 right-0 flex items-center gap-3"><button onClick={() => handleDownloadImage(previewImage, "음식사진")} className="text-white hover:text-gray-300 transition-colors flex items-center gap-1"><Download className="h-5 w-5" /><span className="text-xs">저장</span></button><button onClick={() => setPreviewImage(null)} className="text-white hover:text-gray-300 transition-colors"><X className="h-6 w-6" /></button></div><img src={previewImage} alt="음식 사진" className="w-full rounded-xl object-contain max-h-[70vh]" /></div></div>)}
    </div>
  )
}
