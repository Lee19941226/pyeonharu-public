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
  status: "safe" | "danger" | "unknown"
  matchedAllergens: string[]
}

interface Meal {
  mealType: string
  mealTypeName: string
  menu: MenuItem[]
  calInfo: string
  ntrInfo: string
  originInfo: string
}

function formatDate(dateStr: string) {
  const y = dateStr.slice(0, 4)
  const m = dateStr.slice(4, 6)
  const d = dateStr.slice(6, 8)
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const days = ["일", "월", "화", "수", "목", "금", "토"]
  return `${y}년 ${Number(m)}월 ${Number(d)}일 (${days[date.getDay()]})`
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

export default function SchoolMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  // id 형식: "B10-7010918" (officeCode-schoolCode)
  const parts = id.split("-")
  const officeCode = parts[0] || ""
  const schoolCode = parts.slice(1).join("-") || ""

  const [meals, setMeals] = useState<Meal[]>([])
  const [date, setDate] = useState(getToday())
  const [isLoading, setIsLoading] = useState(true)
  const [schoolName, setSchoolName] = useState("")
  const [noData, setNoData] = useState(false)
  const [showOrigin, setShowOrigin] = useState(false)

  useEffect(() => {
    loadMeals()
  }, [date])

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

  // 학교명 가져오기 (등록된 학교면 DB에서, 아니면 검색)
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
      // fallback: 학교코드로 표시
      setSchoolName(`학교 (${schoolCode})`)
    }
    fetchSchoolName()
  }, [schoolCode])

  const totalDanger = meals.reduce(
    (acc, meal) => acc + meal.menu.filter(m => m.status === "danger").length,
    0
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">

            {/* 뒤로가기 + 학교명 */}
            <div className="mb-4 flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.push("/school")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">{schoolName}</h1>
                <p className="text-xs text-muted-foreground">급식 알레르기 체크</p>
              </div>
            </div>

            {/* 날짜 선택 */}
            <Card className="mb-4">
              <CardContent className="flex items-center justify-between p-3">
                <Button variant="ghost" size="icon" onClick={() => setDate(d => shiftDate(d, -1))}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(date)}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setDate(d => shiftDate(d, 1))}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  {date !== getToday() && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setDate(getToday())}>
                      오늘
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 안전 요약 */}
            {!isLoading && meals.length > 0 && (
              <Card className={`mb-4 border-2 ${totalDanger > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  {totalDanger > 0 ? (
                    <>
                      <ShieldAlert className="h-8 w-8 shrink-0 text-red-500" />
                      <div>
                        <p className="font-bold text-red-700">주의가 필요한 메뉴가 있어요!</p>
                        <p className="text-sm text-red-600">
                          내 알레르기 성분이 포함된 메뉴 {totalDanger}개
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-8 w-8 shrink-0 text-green-500" />
                      <div>
                        <p className="font-bold text-green-700">오늘 급식은 안전해요!</p>
                        <p className="text-sm text-green-600">
                          내 알레르기 성분이 포함된 메뉴가 없습니다
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 급식 내용 */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : noData ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <UtensilsCrossed className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">급식 정보가 없습니다</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    해당 날짜에 급식이 없거나, 아직 등록되지 않았어요
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {meals.map((meal, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      {/* 식사 헤더 */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{meal.mealTypeName}</Badge>
                          {meal.calInfo && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Flame className="h-3 w-3" />
                              {meal.calInfo}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 메뉴 리스트 */}
                      <div className="space-y-2">
                        {meal.menu.map((item, j) => (
                          <div
                            key={j}
                            className={`flex items-start justify-between rounded-lg p-2 ${
                              item.status === "danger"
                                ? "bg-red-50 border border-red-200"
                                : item.status === "safe"
                                ? "bg-white"
                                : "bg-gray-50"
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {item.status === "danger" ? (
                                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                                ) : item.status === "safe" ? (
                                  <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-gray-400" />
                                )}
                                <span className={`text-sm font-medium ${
                                  item.status === "danger" ? "text-red-700" : ""
                                }`}>
                                  {item.name}
                                </span>
                              </div>

                              {/* 위험 알레르기 표시 */}
                              {item.status === "danger" && item.matchedAllergens.length > 0 && (
                                <div className="ml-6 mt-1 flex flex-wrap gap-1">
                                  {item.matchedAllergens.map((a, k) => (
                                    <Badge key={k} variant="destructive" className="text-[10px]">
                                      {a}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* 전체 알레르기 표시 */}
                              {item.allergenNames.length > 0 && (
                                <p className="ml-6 mt-1 text-[11px] text-muted-foreground">
                                  포함: {item.allergenNames.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 원산지 토글 */}
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
