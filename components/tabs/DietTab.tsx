"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  Camera, ImageIcon, PenLine, Trash2, X, Activity,
  ChevronLeft, ChevronRight, Loader2, Info,
  BarChart3, Trophy, Utensils, Flame, Calendar,
} from "lucide-react"

function getTimePeriod(dateStr: string) {
  const h = new Date(dateStr).getHours()
  if (h >= 5 && h < 10) return { label: "아침", color: "bg-amber-100 text-amber-700" }
  if (h >= 10 && h < 15) return { label: "점심", color: "bg-orange-100 text-orange-700" }
  if (h >= 15 && h < 21) return { label: "저녁", color: "bg-blue-100 text-blue-700" }
  return { label: "야식", color: "bg-purple-100 text-purple-700" }
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
  const stroke = size > 120 ? 10 : 7
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(current / total, 2) : 0
  const offset = circ * (1 - Math.min(pct, 1))
  const color = isOver ? "#DC2626" : "#4A7C59"
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-extrabold ${isOver ? "text-red-600" : "text-primary"} ${size > 120 ? "text-2xl" : "text-lg"}`}>{current.toLocaleString()}</span>
        <span className={`text-muted-foreground ${size > 120 ? "text-[10px]" : "text-[9px]"}`}>/ {total > 0 ? total.toLocaleString() : "미설정"} kcal</span>
      </div>
    </div>
  )
}

function BarChart({ dailyStats, bmr, onDayClick }: { dailyStats: DailyStat[]; bmr: number; onDayClick?: (date: string) => void }) {
  const maxCal = bmr > 0 ? bmr : Math.max(...dailyStats.map((d) => d.totalCal), 1)
  const todayStr = new Date().toLocaleDateString("en-CA")
  const showDate = dailyStats.length <= 14
  return (
    <div className="space-y-1">
      {bmr > 0 && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="flex-1 border-t border-dashed border-red-300" />
          <span className="text-[8px] text-red-400 shrink-0">BMR {bmr.toLocaleString()}</span>
        </div>
      )}
      <div className="flex items-end gap-[2px] h-24">
        {dailyStats.map((d) => {
          const pct = maxCal > 0 ? Math.min((d.totalCal / maxCal) * 100, 130) : 0
          const height = d.totalCal > 0 ? Math.max(pct, 3) : 1
          const isOver = bmr > 0 && d.totalCal > bmr
          const dayDate = new Date(d.date + "T12:00:00")
          const dayLabel = dayDate.toLocaleDateString("ko-KR", { weekday: "narrow" })
          const dayNum = dayDate.getDate()
          const isTd = d.date === todayStr
          return (
            <div key={d.date} className={`flex-1 flex flex-col items-center gap-0 group relative ${onDayClick ? "cursor-pointer" : ""}`}
              onClick={() => onDayClick?.(d.date)}>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[8px] px-1 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                {d.totalCal > 0 ? `${d.totalCal.toLocaleString()}kcal` : "-"}
              </div>
              <div className={`w-full rounded-t-sm transition-all duration-300 ${isOver ? "bg-red-400" : d.totalCal > 0 ? "bg-primary/70" : "bg-muted/40"} ${onDayClick ? "hover:opacity-80" : ""}`}
                style={{ height: `${height}%`, minHeight: d.totalCal > 0 ? "2px" : "1px" }} />
              {showDate && <span className={`text-[7px] leading-none mt-0.5 ${isTd ? "font-bold text-primary" : "text-muted-foreground"}`}>{dayLabel}</span>}
              {showDate && <span className={`text-[6px] leading-none ${isTd ? "font-bold text-primary" : "text-muted-foreground/40"}`}>{dayNum}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CalorieAnalysisCard({ totalCal, bmr, overAmount }: { totalCal: number; bmr: number; overAmount: number }) {
  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold">AI</div>
          <p className="text-xs font-bold text-red-600">칼로리 초과 분석</p>
        </div>
        <div className="rounded-md bg-white border-l-2 border-red-500 p-2">
          <p className="text-[11px]">총 <strong className="text-red-600">{totalCal.toLocaleString()}kcal</strong> · BMR 대비 <strong className="text-red-600">+{overAmount.toLocaleString()}kcal</strong></p>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {getExercise(overAmount).map((ex) => (
            <div key={ex.name} className="flex flex-col items-center rounded bg-green-50 py-1 text-[10px]">
              <span>{ex.emoji}</span><span className="font-bold text-primary">{ex.mins}분</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface DietEntry { id: string; food_name: string; estimated_cal: number; source: "ai"|"manual"; emoji: string; ai_confidence: number|null; image_url: string|null; recorded_at: string }
interface DailyStat { date: string; totalCal: number; count: number; isOver: boolean; overAmount: number }
interface ReportSummary { totalCalSum: number; avgCal: number; daysWithData: number; totalDays: number; overDays: number; maxDay: { date: string; totalCal: number }|null; minDay: { date: string; totalCal: number }|null; topFoods: { name: string; count: number }[] }
type RangePreset = "7d" | "14d" | "30d" | "custom"

export default function DietTab() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [entries, setEntries] = useState<DietEntry[]>([])
  const [totalCal, setTotalCal] = useState(0)
  const [bmr, setBmr] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"))

  // 대시보드 기간
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [dashData, setDashData] = useState<{ stats: DailyStat[]; summary: ReportSummary } | null>(null)
  const [dashLoading, setDashLoading] = useState(false)

  const [showManualInput, setShowManualInput] = useState(false)
  const [manualName, setManualName] = useState("")
  const [manualCal, setManualCal] = useState("")
  const [showWarning, setShowWarning] = useState(false)
  const [warningShownToday, setWarningShownToday] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => { setUser(user); if (!user) setIsLoading(false) }) }, [])

  // 일일
  const loadEntries = useCallback(async () => {
    if (!user) return; setIsLoading(true)
    try {
      const res = await fetch(`/api/diet/entries?date=${date}`); const data = await res.json()
      if (data.success) {
        setEntries(data.entries); setTotalCal(data.totalCal); setBmr(data.bmr)
        if (data.isOver && !warningShownToday) {
          const key = `diet_warning_${date}`
          if (typeof window !== "undefined" && !sessionStorage.getItem(key)) { setShowWarning(true); sessionStorage.setItem(key, "1"); setWarningShownToday(true) }
        }
      }
    } catch { toast.error("데이터를 불러오지 못했습니다") } finally { setIsLoading(false) }
  }, [user, date, warningShownToday])
  useEffect(() => { if (user) loadEntries() }, [user, date, loadEntries])

  // 대시보드 기간 계산
  const getDashRange = useCallback(() => {
    const today = new Date()
    const todayStr = today.toLocaleDateString("en-CA")
    if (rangePreset === "custom" && customStart && customEnd) return { start: customStart, end: customEnd }
    const days = rangePreset === "7d" ? 7 : rangePreset === "14d" ? 14 : 30
    const start = new Date(today); start.setDate(start.getDate() - days + 1)
    return { start: start.toLocaleDateString("en-CA"), end: todayStr }
  }, [rangePreset, customStart, customEnd])

  // 대시보드 로드
  const loadDashboard = useCallback(async () => {
    if (!user) return; setDashLoading(true)
    try {
      const { start, end } = getDashRange()
      const res = await fetch(`/api/diet/report?type=custom&startDate=${start}&endDate=${end}`)
      const data = await res.json()
      if (data.success) {
        setDashData({ stats: data.dailyStats, summary: data.summary })
        if (data.bmr) setBmr(data.bmr)
      }
    } catch {} finally { setDashLoading(false) }
  }, [user, getDashRange])
  useEffect(() => { if (user) loadDashboard() }, [user, loadDashboard])

  // handlers
  const handlePhotoAnalyze = async (file: File) => {
    setIsAnalyzing(true)
    try {
      const fd = new FormData(); fd.append("image", file)
      const res = await fetch("/api/diet/analyze", { method: "POST", body: fd }); const data = await res.json()
      if (data.success) { toast.success(`${data.entry.emoji} ${data.entry.food_name} (${data.entry.estimated_cal}kcal) 추가!`); loadEntries(); loadDashboard() }
      else toast.error(data.error || "분석 실패")
    } catch { toast.error("분석 중 오류") } finally { setIsAnalyzing(false) }
  }
  const handleManualSubmit = async () => {
    if (!manualName.trim() || !manualCal) return
    try {
      const res = await fetch("/api/diet/entries", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food_name: manualName.trim(), estimated_cal: parseInt(manualCal) }) }); const data = await res.json()
      if (data.success) { toast.success(`📝 ${manualName} (${manualCal}kcal) 추가!`); setManualName(""); setManualCal(""); setShowManualInput(false); loadEntries(); loadDashboard() }
      else toast.error(data.error)
    } catch { toast.error("저장 실패") }
  }
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 삭제?`)) return
    try { const res = await fetch(`/api/diet/entries?id=${id}`, { method: "DELETE" }); const data = await res.json()
      if (data.success) { toast.success("삭제됨"); loadEntries(); loadDashboard() }
    } catch { toast.error("삭제 실패") }
  }
  const moveDate = (offset: number) => {
    const d = new Date(date); d.setDate(d.getDate() + offset)
    setDate(d.toLocaleDateString("en-CA")); setWarningShownToday(false)
  }

  const isToday = date === new Date().toLocaleDateString("en-CA")
  const isOver = bmr > 0 && totalCal > bmr
  const overAmount = isOver ? totalCal - bmr : 0

  const getRangeLabel = () => {
    const { start, end } = getDashRange()
    const s = new Date(start + "T12:00:00"); const e = new Date(end + "T12:00:00")
    return `${s.getMonth()+1}/${s.getDate()} ~ ${e.getMonth()+1}/${e.getDate()}`
  }

  if (!isLoading && !user) return (
    <div className="w-full"><div className="text-center space-y-4 px-4 py-12">
      <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
      <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
      <p className="text-sm text-muted-foreground">식단관리 기능은 로그인 후 이용할 수 있어요</p>
      <Button onClick={() => router.push("/login")}>로그인</Button>
    </div></div>
  )

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-3">

        {/* ═══ 상단 대시보드 ═══ */}
        {user && (
          <div className="max-w-2xl mx-auto mb-4 space-y-2">
            {/* 기간 선택 */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md bg-muted p-0.5 text-[11px]">
                {(["7d", "14d", "30d"] as RangePreset[]).map((p) => (
                  <button key={p} onClick={() => { setRangePreset(p); setShowCustomPicker(false) }}
                    className={`px-2.5 py-1 rounded-sm transition-all ${rangePreset === p && !showCustomPicker ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {p === "7d" ? "7일" : p === "14d" ? "14일" : "30일"}
                  </button>
                ))}
                <button onClick={() => { setRangePreset("custom"); setShowCustomPicker(true) }}
                  className={`px-2.5 py-1 rounded-sm transition-all flex items-center gap-1 ${showCustomPicker ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  <Calendar className="h-3 w-3" />기간
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">{getRangeLabel()}</span>
            </div>

            {/* 커스텀 기간 선택 */}
            {showCustomPicker && (
              <div className="flex items-center gap-2 text-xs">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="border rounded px-2 py-1 text-xs bg-background" />
                <span className="text-muted-foreground">~</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="border rounded px-2 py-1 text-xs bg-background" />
                <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                  disabled={!customStart || !customEnd}
                  onClick={() => { setRangePreset("custom"); loadDashboard() }}>
                  조회
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {/* 오늘 요약 (2col) */}
              <Card className="md:col-span-2">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2"><Flame className="h-3.5 w-3.5 text-orange-500" /><span className="text-xs font-bold">오늘</span></div>
                  <div className="flex items-center gap-3">
                    <CircularProgress current={totalCal} total={bmr} isOver={isOver} size={80} />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">섭취</span><span className={`font-bold ${isOver ? "text-red-600" : ""}`}>{totalCal.toLocaleString()}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">BMR</span><span className="font-bold">{bmr > 0 ? bmr.toLocaleString() : "-"}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">{isOver ? "초과" : "남은"}</span>
                        <span className={`font-bold ${isOver ? "text-red-600" : "text-primary"}`}>{bmr > 0 ? (isOver ? `+${overAmount.toLocaleString()}` : (bmr-totalCal).toLocaleString()) : "-"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 바 차트 (3col) */}
              <Card className="md:col-span-3">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2"><BarChart3 className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-bold">칼로리 추이</span></div>
                  {dashLoading ? <Skeleton className="h-24 w-full rounded" /> :
                    dashData?.stats?.length ? <BarChart dailyStats={dashData.stats} bmr={bmr} onDayClick={(d) => setDate(d)} /> :
                    <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">데이터 없음</div>}
                </CardContent>
              </Card>
            </div>

            {/* 통계 요약 */}
            {dashData?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Card><CardContent className="p-2.5 text-center">
                  <p className="text-[9px] text-muted-foreground">일 평균</p>
                  <p className="text-sm font-bold text-primary">{dashData.summary.avgCal.toLocaleString()}<span className="text-[9px] font-normal text-muted-foreground ml-0.5">kcal</span></p>
                </CardContent></Card>
                <Card><CardContent className="p-2.5 text-center">
                  <p className="text-[9px] text-muted-foreground">기록한 날</p>
                  <p className="text-sm font-bold">{dashData.summary.daysWithData}<span className="text-[9px] font-normal text-muted-foreground ml-0.5">/ {dashData.summary.totalDays}일</span></p>
                </CardContent></Card>
                {bmr > 0 && (
                  <Card><CardContent className={`p-2.5 text-center ${dashData.summary.overDays > 0 ? "bg-red-50/50" : "bg-green-50/50"}`}>
                    <p className="text-[9px] text-muted-foreground">초과한 날</p>
                    <p className={`text-sm font-bold ${dashData.summary.overDays > 0 ? "text-red-600" : "text-green-600"}`}>{dashData.summary.overDays}일</p>
                  </CardContent></Card>
                )}
                {dashData.summary.topFoods.length > 0 && (
                  <Card><CardContent className="p-2.5">
                    <p className="text-[9px] text-muted-foreground mb-0.5">자주 먹은 음식</p>
                    {dashData.summary.topFoods.slice(0, 3).map((f, i) => (
                      <div key={f.name} className="flex items-center gap-1 text-[9px]">
                        <span className="text-muted-foreground">{i+1}.</span>
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{f.count}회</span>
                      </div>
                    ))}
                  </CardContent></Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ 일일 기록 ═══ */}
        <div className="max-w-lg mx-auto space-y-3">
          {/* 구분선 */}
          <div className="border-t pt-3" />

          {/* 날짜 네비게이션 */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">
                {new Date(date + "T12:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </p>
              <h1 className="text-base font-bold">{isToday ? "오늘의 식단" : "지난 기록"}</h1>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveDate(1)} disabled={isToday}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          {bmr === 0 && !isLoading && (
            <Card className="border-dashed border-primary/50">
              <CardContent className="p-3 text-center space-y-1.5">
                <Info className="h-5 w-5 text-primary mx-auto" />
                <p className="text-xs font-medium">기초대사량을 설정해주세요</p>
                <Button size="sm" className="h-7 text-xs" onClick={() => router.push("/mypage")}>마이페이지에서 설정</Button>
              </CardContent>
            </Card>
          )}

          {isToday && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5 text-xs h-9 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => cameraInputRef.current?.click()} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                {isAnalyzing ? "분석중" : "촬영"}
              </Button>
              <Button variant="outline" className="flex-1 gap-1.5 text-xs h-9 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
                <ImageIcon className="h-3.5 w-3.5" />앨범
              </Button>
              <Button className="flex-1 gap-1.5 text-xs h-9" onClick={() => setShowManualInput(true)}>
                <PenLine className="h-3.5 w-3.5" />직접 입력
              </Button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { const f=e.target.files?.[0]; if(f) handlePhotoAnalyze(f); e.target.value="" }} />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f=e.target.files?.[0]; if(f) handlePhotoAnalyze(f); e.target.value="" }} />
            </div>
          )}

          {isAnalyzing && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-xs">AI가 음식을 분석하고 있어요...</p>
              </CardContent>
            </Card>
          )}

          {isOver && entries.length > 0 && <CalorieAnalysisCard totalCal={totalCal} bmr={bmr} overAmount={overAmount} />}

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold flex items-center gap-1">📋 {isToday ? "오늘" : "이 날"} 먹은 것들</h2>
            <span className="text-[9px] text-muted-foreground">00시 리셋</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground">아직 기록이 없어요</p>
              {isToday && <p className="text-[10px] text-muted-foreground mt-1">사진을 찍거나 직접 입력해보세요</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              {entries.map((entry, idx) => {
                const period = getTimePeriod(entry.recorded_at)
                const time = new Date(entry.recorded_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
                return (
                  <Card key={entry.id} className={`transition-all ${isOver && idx === entries.length-1 ? "border-red-200" : ""}`}>
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-2.5 flex-1 min-w-0">
                          {entry.image_url ? (
                            <button onClick={() => setPreviewImage(entry.image_url)}
                              className="flex-shrink-0 overflow-hidden rounded-lg border hover:border-primary/50 transition-colors">
                              <img src={entry.image_url} alt={entry.food_name} className="h-10 w-10 object-cover" />
                            </button>
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-sm">{entry.emoji}</div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-medium truncate block">{entry.food_name}</span>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">{time}</span>
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-3.5 ${period.color}`}>{period.label}</Badge>
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-3.5 ${entry.source === "ai" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                                {entry.source === "ai" ? "AI" : "직접"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-xs font-bold ${isOver ? "text-red-600" : "text-primary"}`}>{entry.estimated_cal}</span>
                          {isToday && (
                            <button onClick={() => handleDelete(entry.id, entry.food_name)} className="text-muted-foreground hover:text-red-500 transition-colors p-0.5">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 직접 입력 모달 */}
      {showManualInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowManualInput(false)}>
          <div className="w-full max-w-sm rounded-xl bg-background p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div><h3 className="text-lg font-bold">칼로리 직접 입력</h3><p className="text-xs text-muted-foreground">정확한 칼로리를 알고 있다면</p></div>
              <button onClick={() => setShowManualInput(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">음식 이름</label>
                <Input placeholder="예: 빅맥 세트" value={manualName} onChange={(e) => setManualName(e.target.value)} className="mt-1" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">칼로리 (kcal)</label>
                <Input type="number" placeholder="예: 950" value={manualCal} onChange={(e) => setManualCal(e.target.value)} className="mt-1" /></div>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5"><p className="text-xs text-blue-700">💡 메뉴에 칼로리가 표기된 경우 직접 입력하면 더 정확해요.</p></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowManualInput(false)}>취소</Button>
              <Button className="flex-[2]" disabled={!manualName.trim() || !manualCal || parseInt(manualCal) <= 0} onClick={handleManualSubmit}>등록하기</Button>
            </div>
          </div>
        </div>
      )}

      {/* 초과 경고 */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background overflow-hidden">
            <div className="bg-gradient-to-b from-red-100 to-red-50 p-5 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white text-lg">⚠️</div>
              <h3 className="text-base font-extrabold text-red-600">칼로리 초과 주의</h3>
              <p className="text-xs text-muted-foreground mt-1">
                오늘 <strong className="text-red-600">{totalCal.toLocaleString()}kcal</strong> · BMR 대비 <strong className="text-red-600">+{overAmount.toLocaleString()}kcal</strong>
              </p>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-xs font-bold">초과분 소모 운동</p>
              <div className="grid grid-cols-4 gap-1.5">
                {getExercise(overAmount).map((ex) => (
                  <div key={ex.name} className="flex flex-col items-center rounded-lg bg-green-50 py-1.5 text-[10px]">
                    <span>{ex.emoji}</span><span className="font-bold text-primary">{ex.mins}분</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-3 pb-3">
              <Button className="w-full h-9 text-sm" onClick={() => setShowWarning(false)}>확인</Button>
              <p className="text-center text-[9px] text-muted-foreground mt-1.5">1일 1회 표시</p>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 미리보기 */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300"><X className="h-6 w-6" /></button>
            <img src={previewImage} alt="음식 사진" className="w-full rounded-xl object-contain max-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  )
}
