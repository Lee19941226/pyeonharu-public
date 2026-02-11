"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ShieldCheck, ShieldAlert, TrendingUp, TrendingDown,
  BarChart3, Star, ChevronLeft, ChevronRight, AlertTriangle,
  Search, Loader2, Minus,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface WeeklyReport {
  period: { start: string; end: string; weeksAgo: number }
  summary: { totalScans: number; safeScans: number; dangerScans: number; safeRate: number }
  comparison: { prevTotalScans: number; prevDangerScans: number; scanChange: number; dangerChange: number }
  dangerFoods: { foodCode: string; foodName: string; manufacturer: string; detectedAllergens: string[]; scannedAt: string }[]
  topFoods: { foodCode: string; foodName: string; manufacturer: string; count: number; isSafe: boolean }[]
  newFavorites: { food_code: string; food_name: string; manufacturer: string; is_safe: boolean; created_at: string }[]
  dailyStats: { date: string; total: number; safe: number; danger: number }[]
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${DAY_NAMES[d.getDay()]})`
}

export default function ReportsPage() {
  const router = useRouter()
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [weeksAgo, setWeeksAgo] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (!user) setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    if (user) loadReport()
  }, [user, weeksAgo])

  const loadReport = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reports/weekly?weeksAgo=${weeksAgo}`)
      const data = await res.json()
      if (!data.error) setReport(data)
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }

  if (!isLoading && !user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">로그인하고 주간 리포트를 확인하세요</p>
          <Button onClick={() => router.push("/login")}>로그인</Button>
        </main>
        <MobileNav />
      </div>
    )
  }

  const maxBar = report ? Math.max(...report.dailyStats.map(d => d.total), 1) : 1

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-4">

            {/* 헤더 + 주간 네비 */}
            <div>
              <h1 className="text-xl font-bold">📊 주간 안전 리포트</h1>
              <div className="mt-2 flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeeksAgo(w => w + 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {report && (
                  <p className="text-sm text-muted-foreground">
                    {formatDateFull(report.period.start)} ~ {formatDateFull(report.period.end)}
                    {weeksAgo === 0 && <Badge variant="secondary" className="ml-2 text-[10px]">이번 주</Badge>}
                  </p>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeeksAgo(w => Math.max(0, w - 1))} disabled={weeksAgo === 0}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
              </div>
            ) : !report ? (
              <p className="py-16 text-center text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
            ) : (
              <>
                {/* 요약 카드 */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="border shadow-none">
                    <CardContent className="p-4 text-center">
                      <Search className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                      <p className="text-2xl font-bold">{report.summary.totalScans}</p>
                      <p className="text-[11px] text-muted-foreground">총 스캔</p>
                      <ChangeIndicator value={report.comparison.scanChange} />
                    </CardContent>
                  </Card>
                  <Card className="border shadow-none">
                    <CardContent className="p-4 text-center">
                      <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-green-500" />
                      <p className="text-2xl font-bold text-green-600">{report.summary.safeRate}%</p>
                      <p className="text-[11px] text-muted-foreground">안전 비율</p>
                      <p className="text-[10px] text-muted-foreground">{report.summary.safeScans}개 안전</p>
                    </CardContent>
                  </Card>
                  <Card className="border shadow-none">
                    <CardContent className="p-4 text-center">
                      <ShieldAlert className="mx-auto mb-1 h-5 w-5 text-red-500" />
                      <p className="text-2xl font-bold text-red-600">{report.summary.dangerScans}</p>
                      <p className="text-[11px] text-muted-foreground">위험 감지</p>
                      <ChangeIndicator value={report.comparison.dangerChange} invert />
                    </CardContent>
                  </Card>
                </div>

                {/* 일별 차트 */}
                <Card className="border shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">일별 스캔 현황</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
                      {report.dailyStats.map((day, i) => {
                        const barH = day.total > 0 ? Math.max((day.total / maxBar) * 100, 8) : 4
                        const isToday = day.date === new Date().toISOString().slice(0, 10)
                        return (
                          <div key={i} className="flex flex-1 flex-col items-center gap-1">
                            <span className="text-[10px] font-medium">{day.total > 0 ? day.total : ""}</span>
                            <div className="relative w-full flex flex-col items-center">
                              {day.danger > 0 && (
                                <div
                                  className="w-full max-w-[28px] rounded-t bg-red-400"
                                  style={{ height: (day.danger / maxBar) * 100 }}
                                />
                              )}
                              <div
                                className={`w-full max-w-[28px] ${day.danger > 0 ? "" : "rounded-t"} rounded-b ${day.total === 0 ? "bg-muted" : "bg-green-400"}`}
                                style={{ height: day.total === 0 ? 4 : ((day.safe) / maxBar) * 100 }}
                              />
                            </div>
                            <span className={`text-[10px] ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                              {formatDate(day.date)}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {DAY_NAMES[new Date(day.date + "T00:00:00").getDay()]}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green-400" /> 안전</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-400" /> 위험</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 위험 감지 식품 */}
                {report.dangerFoods.length > 0 && (
                  <Card className="border border-red-200 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        위험 감지 식품
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {report.dangerFoods.map((food, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between rounded-lg border border-red-100 bg-red-50/50 p-3 cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => router.push(`/food/result/${food.foodCode}`)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{food.foodName}</p>
                            {food.manufacturer && (
                              <p className="text-[11px] text-muted-foreground">{food.manufacturer}</p>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {food.detectedAllergens.map((a, j) => (
                                <Badge key={j} variant="destructive" className="text-[10px]">{a}</Badge>
                              ))}
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground ml-2">
                            {new Date(food.scannedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Top 5 식품 */}
                {report.topFoods.length > 0 && (
                  <Card className="border shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">🔍 가장 많이 확인한 식품</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {report.topFoods.map((food, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => router.push(`/food/result/${food.foodCode}`)}
                        >
                          <span className="text-sm font-bold text-primary/60 w-5 text-center">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{food.foodName}</p>
                            {food.manufacturer && (
                              <p className="text-[11px] text-muted-foreground">{food.manufacturer}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {food.isSafe ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                            )}
                            <span className="text-xs text-muted-foreground">{food.count}회</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 새로 추가된 안전 식품 */}
                {report.newFavorites.length > 0 && (
                  <Card className="border shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Star className="h-4 w-4 text-yellow-500" />
                        이번 주 새로 추가된 즐겨찾기
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {report.newFavorites.map((food, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => router.push(`/food/result/${food.food_code}`)}
                        >
                          {food.is_safe ? (
                            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{food.food_name}</p>
                            {food.manufacturer && (
                              <p className="text-[11px] text-muted-foreground">{food.manufacturer}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 데이터 없을 때 */}
                {report.summary.totalScans === 0 && (
                  <Card className="border-dashed shadow-none">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                      <Search className="mb-3 h-12 w-12 text-muted-foreground/30" />
                      <p className="text-sm font-medium">이번 주 스캔 기록이 없습니다</p>
                      <p className="text-xs text-muted-foreground mt-1">식품을 검색하거나 바코드를 스캔하면 여기에 기록됩니다</p>
                      <Button size="sm" className="mt-4" onClick={() => router.push("/food")}>
                        식품 검색하기
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

// 변화량 표시 컴포넌트
function ChangeIndicator({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) {
    return <span className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="h-2.5 w-2.5" />변화 없음</span>
  }

  const isPositive = value > 0
  // invert: 위험 감지에서는 증가가 나쁜 것
  const isGood = invert ? !isPositive : isPositive

  return (
    <span className={`flex items-center justify-center gap-0.5 text-[10px] ${isGood ? "text-green-600" : "text-red-600"}`}>
      {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {isPositive ? "+" : ""}{value} vs 지난주
    </span>
  )
}
