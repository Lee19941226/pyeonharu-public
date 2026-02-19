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
import {
  Camera,
  ImageIcon,
  PenLine,
  Trash2,
  X,
  AlertTriangle,
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Info,
  Sparkles,
} from "lucide-react"

// ─── 시간대 분류 ───
function getTimePeriod(dateStr: string): { label: string; emoji: string; color: string } {
  const h = new Date(dateStr).getHours()
  if (h >= 5 && h < 10) return { label: "아침", emoji: "🌅", color: "bg-amber-100 text-amber-700" }
  if (h >= 10 && h < 15) return { label: "점심", emoji: "☀️", color: "bg-orange-100 text-orange-700" }
  if (h >= 15 && h < 21) return { label: "저녁", emoji: "🌇", color: "bg-blue-100 text-blue-700" }
  return { label: "야식", emoji: "🌙", color: "bg-purple-100 text-purple-700" }
}

// ─── 운동량 환산 ───
function getExercise(overCal: number) {
  return [
    { name: "걷기", emoji: "🚶", mins: Math.round(overCal / 4.5) },
    { name: "달리기", emoji: "🏃", mins: Math.round(overCal / 11) },
    { name: "계단", emoji: "🪜", mins: Math.round(overCal / 9) },
    { name: "자전거", emoji: "🚴", mins: Math.round(overCal / 7.5) },
  ]
}

// ─── 원형 프로그레스 SVG ───
function CircularProgress({ current, total, isOver }: { current: number; total: number; isOver: boolean }) {
  const size = 160
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(current / total, 2) : 0
  const offset = circ * (1 - Math.min(pct, 1))
  const color = isOver ? "#DC2626" : "#4A7C59"

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-extrabold ${isOver ? "text-red-600" : "text-primary"}`}>
          {current.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          / {total > 0 ? total.toLocaleString() : "미설정"} kcal
        </span>
      </div>
    </div>
  )
}

// ─── Types ───
interface DietEntry {
  id: string
  food_name: string
  estimated_cal: number
  source: "ai" | "manual"
  emoji: string
  ai_confidence: number | null
  image_url: string | null
  recorded_at: string
}

export default function DietPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // State
  const [user, setUser] = useState<any>(null)
  const [entries, setEntries] = useState<DietEntry[]>([])
  const [totalCal, setTotalCal] = useState(0)
  const [bmr, setBmr] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [date, setDate] = useState(() => {
    const now = new Date()
    return now.toLocaleDateString("en-CA") // YYYY-MM-DD in local timezone
  })

  // Modals
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualName, setManualName] = useState("")
  const [manualCal, setManualCal] = useState("")
  const [showWarning, setShowWarning] = useState(false)
  const [warningShownToday, setWarningShownToday] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // ─── Auth ───
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (!user) setIsLoading(false)
    })
  }, [])

  // ─── 데이터 로드 ───
  const loadEntries = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/diet/entries?date=${date}`)
      const data = await res.json()
      if (data.success) {
        setEntries(data.entries)
        setTotalCal(data.totalCal)
        setBmr(data.bmr)

        // 초과 경고 팝업 (1일 1회)
        if (data.isOver && !warningShownToday) {
          const key = `diet_warning_${date}`
          if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
            setShowWarning(true)
            sessionStorage.setItem(key, "1")
            setWarningShownToday(true)
          }
        }
      }
    } catch {
      toast.error("데이터를 불러오지 못했습니다")
    } finally {
      setIsLoading(false)
    }
  }, [user, date, warningShownToday])

  useEffect(() => {
    if (user) loadEntries()
  }, [user, date, loadEntries])

  // ─── 사진 분석 ───
  const handlePhotoAnalyze = async (file: File) => {
    setIsAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append("image", file)

      const res = await fetch("/api/diet/analyze", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`${data.entry.emoji} ${data.entry.food_name} (${data.entry.estimated_cal}kcal) 추가!`)
        loadEntries()
      } else {
        toast.error(data.error || "분석에 실패했습니다")
      }
    } catch {
      toast.error("분석 중 오류가 발생했습니다")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ─── 직접 입력 ───
  const handleManualSubmit = async () => {
    if (!manualName.trim() || !manualCal) return

    try {
      const res = await fetch("/api/diet/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name: manualName.trim(),
          estimated_cal: parseInt(manualCal),
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`📝 ${manualName} (${manualCal}kcal) 추가!`)
        setManualName("")
        setManualCal("")
        setShowManualInput(false)
        loadEntries()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("저장에 실패했습니다")
    }
  }

  // ─── 삭제 ───
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 을 삭제할까요?`)) return

    try {
      const res = await fetch(`/api/diet/entries?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("삭제되었습니다")
        loadEntries()
      }
    } catch {
      toast.error("삭제 실패")
    }
  }

  // ─── 날짜 이동 ───
  const moveDate = (offset: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + offset)
    setDate(d.toLocaleDateString("en-CA"))
    setWarningShownToday(false)
  }

  const isToday = date === new Date().toLocaleDateString("en-CA")
  const isOver = bmr > 0 && totalCal > bmr
  const overAmount = isOver ? totalCal - bmr : 0

  // ─── 비로그인 ───
  if (!isLoading && !user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center pb-16 md:pb-0">
          <div className="text-center space-y-4 px-4">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
            <p className="text-sm text-muted-foreground">식단관리 기능은 로그인 후 이용할 수 있어요</p>
            <Button onClick={() => router.push("/login")}>로그인</Button>
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4">
          <div className="mx-auto max-w-lg space-y-4">

            {/* ─── 날짜 네비게이션 ─── */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => moveDate(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  {new Date(date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
                </p>
                <h1 className="text-lg font-bold">{isToday ? "오늘의 식단" : "지난 기록"}</h1>
              </div>
              <Button variant="ghost" size="icon" onClick={() => moveDate(1)} disabled={isToday}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* ─── BMR 미설정 안내 ─── */}
            {bmr === 0 && !isLoading && (
              <Card className="border-dashed border-primary/50">
                <CardContent className="p-4 text-center space-y-2">
                  <Info className="h-6 w-6 text-primary mx-auto" />
                  <p className="text-sm font-medium">기초대사량을 설정해주세요</p>
                  <p className="text-xs text-muted-foreground">칼로리 초과 분석을 위해 필요해요</p>
                  <Button size="sm" onClick={() => router.push("/mypage")}>
                    마이페이지에서 설정하기
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ─── 원형 프로그레스 ─── */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : (
              <CircularProgress current={totalCal} total={bmr} isOver={isOver} />
            )}

            {/* ─── 요약 수치 ─── */}
            {!isLoading && (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">섭취</p>
                  <p className={`font-bold ${isOver ? "text-red-600" : "text-foreground"}`}>
                    {totalCal.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">기초대사량</p>
                  <p className="font-bold">{bmr > 0 ? bmr.toLocaleString() : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{isOver ? "초과" : "남은량"}</p>
                  <p className={`font-bold ${isOver ? "text-red-600" : "text-primary"}`}>
                    {bmr > 0
                      ? isOver
                        ? `+${overAmount.toLocaleString()}`
                        : (bmr - totalCal).toLocaleString()
                      : "-"}
                  </p>
                </div>
              </div>
            )}

            {/* ─── 입력 버튼 ─── */}
            {isToday && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {isAnalyzing ? "분석 중..." : "사진 촬영"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <ImageIcon className="h-4 w-4" />
                  앨범 선택
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => setShowManualInput(true)}
                >
                  <PenLine className="h-4 w-4" />
                  직접 입력
                </Button>
                {/* 카메라 전용 */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handlePhotoAnalyze(file)
                    e.target.value = ""
                  }}
                />
                {/* 앨범/갤러리 전용 (capture 없음) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handlePhotoAnalyze(file)
                    e.target.value = ""
                  }}
                />
              </div>
            )}

            {/* ─── 분석 중 오버레이 ─── */}
            {isAnalyzing && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">AI가 음식을 분석하고 있어요...</p>
                    <p className="text-xs text-muted-foreground">잠시만 기다려주세요</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── 타임라인 ─── */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                📋 {isToday ? "오늘" : "이 날"} 먹은 것들
              </h2>
              <span className="text-[10px] text-muted-foreground">00시 리셋</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">아직 기록이 없어요</p>
                {isToday && (
                  <p className="text-xs text-muted-foreground mt-1">
                    사진을 찍거나 직접 입력해보세요
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, idx) => {
                  const period = getTimePeriod(entry.recorded_at)
                  const time = new Date(entry.recorded_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })

                  return (
                    <Card
                      key={entry.id}
                      className={`transition-all ${
                        isOver && idx === entries.length - 1
                          ? "border-red-200"
                          : ""
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          {/* 왼쪽: 썸네일 + 정보 */}
                          <div className="flex gap-3 flex-1 min-w-0">
                            {/* 음식 사진 썸네일 또는 이모지 */}
                            {entry.image_url ? (
                              <button
                                onClick={() => setPreviewImage(entry.image_url)}
                                className="flex-shrink-0 overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-colors"
                              >
                                <img
                                  src={entry.image_url}
                                  alt={entry.food_name}
                                  className="h-12 w-12 object-cover"
                                />
                              </button>
                            ) : (
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                                {entry.emoji}
                              </div>
                            )}

                            {/* 음식 정보 */}
                            <div className="min-w-0">
                              <span className="text-sm font-medium truncate block">
                                {entry.food_name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[11px] text-muted-foreground">
                                  {time}
                                </span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${period.color}`}>
                                  {period.label}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 h-4 ${
                                    entry.source === "ai"
                                      ? "bg-purple-50 text-purple-600 border-purple-200"
                                      : "bg-blue-50 text-blue-600 border-blue-200"
                                  }`}
                                >
                                  {entry.source === "ai" ? "AI 추정" : "직접 입력"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* 오른쪽: 칼로리 + 삭제 */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-sm font-bold ${isOver ? "text-red-600" : "text-primary"}`}>
                              {entry.estimated_cal}
                            </span>
                            {isToday && (
                              <button
                                onClick={() => handleDelete(entry.id, entry.food_name)}
                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

            {/* ─── AI 분석 리포트 (초과 시 타임라인 하단) ─── */}
            {isOver && entries.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                      AI
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-600">오늘의 칼로리 분석</p>
                      <p className="text-[10px] text-muted-foreground">최종 누적 기준 · GPT-4o</p>
                    </div>
                  </div>

                  <div className="rounded-md bg-white border-l-2 border-red-500 p-3">
                    <p className="text-xs">
                      금일 총 <strong className="text-red-600">{totalCal.toLocaleString()}kcal</strong> 섭취
                    </p>
                    <p className="text-xs">
                      기초대사량 {bmr.toLocaleString()}kcal 대비{" "}
                      <strong className="text-red-600">{overAmount.toLocaleString()}kcal 초과</strong>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold mb-2">💪 소모 운동량</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {getExercise(overAmount).map((ex) => (
                        <div
                          key={ex.name}
                          className="flex items-center justify-between rounded-md bg-green-50 px-2.5 py-1.5 text-xs"
                        >
                          <span>{ex.emoji} {ex.name}</span>
                          <span className="font-bold text-primary">{ex.mins}분</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md bg-purple-50 p-2.5">
                    <p className="text-[10px] text-purple-700">
                      ⚠️ AI 추정 칼로리는 음식 사진을 기반으로 통상적인 값을 추측한 데이터이며,
                      실제 칼로리와 차이가 있을 수 있습니다. 정확한 칼로리를 아는 경우 직접 입력을 권장합니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <MobileNav />

      {/* ─── 직접 입력 모달 ─── */}
      {showManualInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowManualInput(false)}>
          <div className="w-full max-w-sm rounded-xl bg-background p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">칼로리 직접 입력</h3>
                <p className="text-xs text-muted-foreground">정확한 칼로리를 알고 있다면</p>
              </div>
              <button onClick={() => setShowManualInput(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">음식 이름</label>
                <Input
                  placeholder="예: 빅맥 세트, 삼각김밥"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">칼로리 (kcal)</label>
                <Input
                  type="number"
                  placeholder="예: 950"
                  value={manualCal}
                  onChange={(e) => setManualCal(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                💡 맥도날드, 스타벅스 등 메뉴에 칼로리가 표기된 경우 직접 입력하면 더 정확해요.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowManualInput(false)}>
                취소
              </Button>
              <Button
                className="flex-[2]"
                disabled={!manualName.trim() || !manualCal || parseInt(manualCal) <= 0}
                onClick={handleManualSubmit}
              >
                등록하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 초과 경고 팝업 ─── */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background overflow-hidden">
            <div className="bg-gradient-to-b from-red-100 to-red-50 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white text-xl">
                ⚠️
              </div>
              <h3 className="text-lg font-extrabold text-red-600">칼로리 초과 주의</h3>
              <p className="text-sm text-muted-foreground mt-2">
                오늘 <strong className="text-red-600">{totalCal.toLocaleString()}kcal</strong> 섭취<br />
                기초대사량 대비 <strong className="text-red-600">{overAmount.toLocaleString()}kcal</strong> 초과
              </p>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs font-bold">초과분 소모를 위한 운동</p>
              <div className="grid grid-cols-2 gap-2">
                {getExercise(overAmount).map((ex) => (
                  <div
                    key={ex.name}
                    className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-xs"
                  >
                    <span>{ex.emoji} {ex.name}</span>
                    <span className="font-bold text-primary">{ex.mins}분</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 pb-4">
              <Button className="w-full" onClick={() => setShowWarning(false)}>
                확인
              </Button>
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                이 알림은 1일 1회 표시됩니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 이미지 미리보기 모달 ─── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewImage}
              alt="음식 사진"
              className="w-full rounded-xl object-contain max-h-[70vh]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
