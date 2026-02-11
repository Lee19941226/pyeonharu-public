"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  UtensilsCrossed,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Flame,
  Info,
} from "lucide-react"

interface MenuItem {
  name: string
  allergenNumbers: string[]
  allergenNames: string[]
  status: "safe" | "danger" | "caution" | "unknown"
  matchedAllergens: string[]
  crossAllergens: string[]
}

interface Meal {
  mealType: string
  mealTypeName: string
  menu: MenuItem[]
  calInfo: string
  ntrInfo: string
  originInfo: string
}

interface WeekDay {
  date: string
  meals: Meal[]
}

type ViewMode = "day" | "week"

function formatDate(dateStr: string) {
  const y = dateStr.slice(0, 4)
  const m = dateStr.slice(4, 6)
  const d = dateStr.slice(6, 8)
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const days = ["일", "월", "화", "수", "목", "금", "토"]
  return `${y}년 ${Number(m)}월 ${Number(d)}일 (${days[date.getDay()]})`
}

function formatShortDate(dateStr: string) {
  const d = Number(dateStr.slice(6, 8))
  const dayOfWeek = new Date(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(4, 6)) - 1,
    d
  ).getDay()
  const days = ["일", "월", "화", "수", "목", "금", "토"]
  return `${d}일(${days[dayOfWeek]})`
}

function shiftDate(dateStr: string, offset: number) {
  const y = Number(dateStr.slice(0, 4))
  const m = Number(dateStr.slice(4, 6)) - 1
  const d = Number(dateStr.slice(6, 8))
  const date = new Date(y, m, d + offset)
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, "0")
  const nd = String(date.getDate()).padStart(2, "0")
  return `${ny}${nm}${nd}`
}

function getToday() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}${m}${d}`
}

function getWeekLabel(dateStr: string) {
  const y = Number(dateStr.slice(0, 4))
  const m = Number(dateStr.slice(4, 6)) - 1
  const d = Number(dateStr.slice(6, 8))
  const date = new Date(y, m, d)
  const dayOfWeek = date.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(y, m, d + mondayOffset)
  const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4)
  return `${monday.getMonth() + 1}/${monday.getDate()} ~ ${friday.getMonth() + 1}/${friday.getDate()}`
}

export default function SchoolMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const parts = id.split("-")
  const officeCode = parts[0] || ""
  const schoolCode = parts.slice(1).join("-") || ""

  const [meals, setMeals] = useState<Meal[]>([])
  const [weekData, setWeekData] = useState<WeekDay[]>([])
  const [date, setDate] = useState(getToday())
  const [viewMode, setViewMode] = useState<ViewMode>("day")
  const [isLoading, setIsLoading] = useState(true)
  const [schoolName, setSchoolName] = useState("")
  const [noData, setNoData] = useState(false)
  const [showOrigin, setShowOrigin] = useState(false)

  useEffect(() => {
    if (viewMode === "day") {
      loadMeals()
    } else {
      loadWeekMeals()
    }
  }, [date, viewMode])

  const loadMeals = async () => {
    setIsLoading(true)
    setNoData(false)
    try {
      const res = await fetch(
        `/api/school/meals?schoolCode=${schoolCode}&officeCode=${officeCode}&date=${date}`
      )
      const data = await res.json()

      if (data.meals && data.meals.length > 0) {
        setMeals(data.meals)
      } else {
        setMeals([])
        setNoData(true)
      }
    } catch (e) {
      console.error(e)
      setMeals([])
      setNoData(true)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWeekMeals = async () => {
    setIsLoading(true)
    setNoData(false)
    try {
      const res = await fetch(
        `/api/school/meals?schoolCode=${schoolCode}&officeCode=${officeCode}&date=${date}&mode=week`
      )
      const data = await res.json()

      if (data.week && data.week.length > 0) {
        setWeekData(data.week)
        const hasAnyMeals = data.week.some((d: WeekDay) => d.meals.length > 0)
        if (!hasAnyMeals) setNoData(true)
      } else {
        setWeekData([])
        setNoData(true)
      }
    } catch (e) {
      console.error(e)
      setWeekData([])
      setNoData(true)
    } finally {
      setIsLoading(false)
    }
  }

  // 학교명 가져오기
  useEffect(() => {
    const fetchSchoolName = async () => {
      try {
        const res = await fetch("/api/school/register")
        if (res.ok) {
          const data = await res.json()
          const found = (data.schools || []).find(
            (s: { school_code: string }) => s.school_code === schoolCode
          )
          if (found) {
            setSchoolName(found.school_name)
            return
          }
        }
      } catch {}
      setSchoolName(`학교 (${schoolCode})`)
    }
    fetchSchoolName()
  }, [schoolCode])

  const totalDanger = meals.reduce(
    (acc, meal) => acc + meal.menu.filter(m => m.status === "danger").length,
    0
  )
  const totalCaution = meals.reduce(
    (acc, meal) => acc + meal.menu.filter(m => m.status === "caution").length,
    0
  )

  const handlePrev = () => {
    if (viewMode === "day") {
      setDate(prev => shiftDate(prev, -1))
    } else {
      setDate(prev => shiftDate(prev, -7))
    }
  }

  const handleNext = () => {
    if (viewMode === "day") {
      setDate(prev => shiftDate(prev, 1))
    } else {
      setDate(prev => shiftDate(prev, 7))
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">

            {/* 헤더 */}
            <div className="mb-4 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">{schoolName || "급식 상세"}</h1>
                <p className="text-xs text-muted-foreground">급식 알레르기 체크 결과</p>
              </div>
            </div>

            {/* 보기 모드 탭 */}
            <div className="mb-4 flex gap-2">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
                className="flex-1"
              >
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                오늘
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="flex-1"
              >
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                이번 주
              </Button>
            </div>

            {/* 날짜 네비게이션 */}
            <div className="mb-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {viewMode === "day" ? formatDate(date) : getWeekLabel(date)}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 오늘로 돌아가기 */}
            {date !== getToday() && (
              <div className="mb-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setDate(getToday())}
                >
                  오늘로 돌아가기
                </Button>
              </div>
            )}

            {/* 로딩 */}
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}

            {/* 데이터 없음 */}
            {!isLoading && noData && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <UtensilsCrossed className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">급식 정보가 없습니다</p>
                  <p className="text-xs text-muted-foreground">
                    {viewMode === "day" ? "방학, 휴일, 또는 아직 등록되지 않은 날짜입니다" : "이번 주 급식 정보가 없습니다"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ===== 일간 보기 ===== */}
            {!isLoading && !noData && viewMode === "day" && (
              <div className="space-y-3">
                {/* 요약 카드 */}
                <Card className={
                  totalDanger > 0 ? "border-red-200 bg-red-50/50" :
                  totalCaution > 0 ? "border-yellow-200 bg-yellow-50/50" :
                  "border-green-200 bg-green-50/50"
                }>
                  <CardContent className="flex items-center gap-3 p-4">
                    {totalDanger > 0 ? (
                      <ShieldAlert className="h-8 w-8 text-red-500" />
                    ) : totalCaution > 0 ? (
                      <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    ) : (
                      <ShieldCheck className="h-8 w-8 text-green-500" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {totalDanger > 0
                          ? `주의 메뉴 ${totalDanger}개 발견`
                          : totalCaution > 0
                            ? `교차오염 주의 ${totalCaution}개`
                            : "오늘 급식은 안전해요!"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totalDanger > 0 && totalCaution > 0
                          ? `위험 ${totalDanger}개 · 교차오염 주의 ${totalCaution}개`
                          : totalDanger > 0
                            ? "알레르기 유발 성분이 포함되어 있어요"
                            : totalCaution > 0
                              ? "교차반응 가능성이 있는 성분이 포함되어 있어요"
                              : "등록된 알레르기에 해당하는 성분이 없습니다"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 급식 목록 */}
                {meals.map((meal, mi) => (
                  <MealCard key={mi} meal={meal} showOrigin={showOrigin} setShowOrigin={setShowOrigin} />
                ))}
              </div>
            )}

            {/* ===== 주간 보기 ===== */}
            {!isLoading && !noData && viewMode === "week" && (
              <div className="space-y-3">
                {/* 주간 요약 */}
                <WeekSummary weekData={weekData} />

                {/* 일별 카드 */}
                {weekData.map((day, di) => (
                  <WeekDayCard
                    key={di}
                    day={day}
                    isToday={day.date === getToday()}
                    showOrigin={showOrigin}
                    setShowOrigin={setShowOrigin}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

// ===== 급식 카드 컴포넌트 =====
function MealCard({ meal, showOrigin, setShowOrigin }: { meal: Meal; showOrigin: boolean; setShowOrigin: (v: boolean) => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        {/* 급식 타입 + 칼로리 */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">{meal.mealTypeName}</span>
          </div>
          {meal.calInfo && (
            <Badge variant="outline" className="text-[10px]">
              <Flame className="mr-1 h-3 w-3" />
              {meal.calInfo}
            </Badge>
          )}
        </div>

        {/* 메뉴 아이템 */}
        <div className="space-y-2">
          {meal.menu.map((item, j) => (
            <MenuItemRow key={j} item={item} />
          ))}
        </div>

        {/* 원산지 */}
        {meal.originInfo && (
          <div className="mt-3 border-t pt-2">
            <button
              onClick={() => setShowOrigin(!showOrigin)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Info className="h-3 w-3" />
              원산지 정보 {showOrigin ? "접기" : "보기"}
            </button>
            {showOrigin && (
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {meal.originInfo.replace(/<br\s*\/?>/gi, " / ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ===== 메뉴 아이템 행 =====
function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${
      item.status === "danger"
        ? "bg-red-50 border border-red-200"
        : item.status === "caution"
          ? "bg-yellow-50 border border-yellow-200"
          : ""
    }`}>
      <div className="flex items-center gap-2">
        {item.status === "danger" ? (
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
        ) : item.status === "caution" ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
        ) : item.status === "safe" ? (
          <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-gray-400" />
        )}
        <span className={`text-sm font-medium ${
          item.status === "danger"
            ? "text-red-700"
            : item.status === "caution"
              ? "text-yellow-700"
              : ""
        }`}>
          {item.name}
        </span>
      </div>

      {/* 위험: 직접 매칭된 알레르기 */}
      {item.status === "danger" && item.matchedAllergens.length > 0 && (
        <div className="ml-6 mt-1 flex flex-wrap gap-1">
          {item.matchedAllergens.map((a, k) => (
            <Badge key={k} variant="destructive" className="text-[10px]">
              {a}
            </Badge>
          ))}
        </div>
      )}

      {/* 교차오염: 교차반응 알레르기 */}
      {item.status === "caution" && item.crossAllergens && item.crossAllergens.length > 0 && (
        <div className="ml-6 mt-1 flex flex-wrap gap-1">
          {item.crossAllergens.map((a, k) => (
            <Badge key={k} className="bg-yellow-100 text-[10px] text-yellow-800 hover:bg-yellow-200">
              ⚠️ 교차오염 가능: {a}
            </Badge>
          ))}
        </div>
      )}

      {/* 전체 알레르기 성분 표시 */}
      {item.allergenNames.length > 0 && (
        <p className="ml-6 mt-1 text-[11px] text-muted-foreground">
          포함: {item.allergenNames.join(", ")}
        </p>
      )}
    </div>
  )
}

// ===== 주간 요약 =====
function WeekSummary({ weekData }: { weekData: WeekDay[] }) {
  const totalDanger = weekData.reduce(
    (acc, day) => acc + day.meals.reduce(
      (a, meal) => a + meal.menu.filter(m => m.status === "danger").length, 0
    ), 0
  )
  const totalCaution = weekData.reduce(
    (acc, day) => acc + day.meals.reduce(
      (a, meal) => a + meal.menu.filter(m => m.status === "caution").length, 0
    ), 0
  )
  const daysWithMeals = weekData.filter(d => d.meals.length > 0).length
  const dangerDays = weekData.filter(d =>
    d.meals.some(m => m.menu.some(item => item.status === "danger"))
  ).length

  return (
    <Card className={
      totalDanger > 0 ? "border-red-200 bg-red-50/50" :
      totalCaution > 0 ? "border-yellow-200 bg-yellow-50/50" :
      "border-green-200 bg-green-50/50"
    }>
      <CardContent className="p-4">
        <p className="mb-2 text-sm font-semibold">이번 주 요약</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{daysWithMeals}</p>
            <p className="text-[11px] text-muted-foreground">급식일</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${totalDanger > 0 ? "text-red-600" : "text-green-600"}`}>
              {dangerDays}
            </p>
            <p className="text-[11px] text-muted-foreground">주의일</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${totalCaution > 0 ? "text-yellow-600" : "text-green-600"}`}>
              {totalCaution}
            </p>
            <p className="text-[11px] text-muted-foreground">교차오염</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===== 주간 일별 카드 =====
function WeekDayCard({ day, isToday, showOrigin, setShowOrigin }: {
  day: WeekDay
  isToday: boolean
  showOrigin: boolean
  setShowOrigin: (v: boolean) => void
}) {
  const [expanded, setExpanded] = useState(isToday)

  const hasMeals = day.meals.length > 0
  const allMenuItems = hasMeals ? day.meals.flatMap(m => m.menu) : []
  const dangerCount = allMenuItems.filter(m => m.status === "danger").length
  const cautionCount = allMenuItems.filter(m => m.status === "caution").length

  return (
    <Card className={`transition-all ${
      isToday ? "ring-2 ring-primary/30" : ""
    } ${
      dangerCount > 0 ? "border-red-200" :
      cautionCount > 0 ? "border-yellow-200" : ""
    }`}>
      <CardContent className="p-0">
        {/* 요일 헤더 (클릭으로 토글) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between p-3 text-left"
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
              {formatShortDate(day.date)}
              {isToday && <span className="ml-1 text-[10px] text-primary">(오늘)</span>}
            </span>
            {!hasMeals && (
              <span className="text-xs text-muted-foreground">급식 없음</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {dangerCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                위험 {dangerCount}
              </Badge>
            )}
            {cautionCount > 0 && (
              <Badge className="bg-yellow-100 text-[10px] text-yellow-800">
                주의 {cautionCount}
              </Badge>
            )}
            {hasMeals && dangerCount === 0 && cautionCount === 0 && (
              <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">
                안전
              </Badge>
            )}
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </button>

        {/* 확장된 메뉴 */}
        {expanded && hasMeals && (
          <div className="border-t px-3 pb-3 pt-2">
            {day.meals.map((meal, mi) => (
              <div key={mi} className={mi > 0 ? "mt-3 border-t pt-3" : ""}>
                <div className="mb-2 flex items-center gap-2">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs font-semibold">{meal.mealTypeName}</span>
                  {meal.calInfo && (
                    <span className="text-[10px] text-muted-foreground">{meal.calInfo}</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {meal.menu.map((item, j) => (
                    <MenuItemRow key={j} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
