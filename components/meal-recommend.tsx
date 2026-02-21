"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Sparkles, Store, Flame, Youtube, TrendingDown, TrendingUp,
  ChevronDown, ChevronUp, Loader2, BarChart3,
  UtensilsCrossed, AlertTriangle, Bike, Salad, Scale, Shuffle
} from "lucide-react"

interface Reasoning {
  taste: string
  calorie: string
  nutrition: string
  variety: string
}

interface Recommendation {
  name: string
  emoji: string
  estimatedCal: number
  reasoning: Reasoning
  deliveryKeyword: string
}

interface Analysis {
  calorieSituation: string
  weeklyPattern: string
  nutritionGap: string
}

interface MealRecommendData {
  mealType: string
  analysis: Analysis
  recommendations: Recommendation[]
  nutritionTip: string
  context: {
    todayCalories: number
    targetCalories: number
    remainingCalories: number
    allergens: string[]
    todayMeals: string[]
    weeklyAvgCal: number
    weeklyOverDays: number
    weeklyTopFoods: string[]
  }
}

export default function MealRecommend() {
  const [data, setData] = useState<MealRecommendData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const [todayCal, setTodayCal] = useState(0)
  const [bmr, setBmr] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
      if (user) loadTodayCalories()
    })
  }, [])

  const loadTodayCalories = async () => {
    try {
      const today = new Date().toLocaleDateString("en-CA")
      const res = await fetch(`/api/diet/entries?date=${today}`)
      const d = await res.json()
      if (d.success) { setTodayCal(d.totalCal); setBmr(d.bmr || 0) }
    } catch {}
  }

  const fetchRecommend = useCallback(async () => {
    setLoading(true); setError(""); setExpandedIdx(null)
    try {
      const res = await fetch("/api/meal-recommend")
      if (!res.ok) throw new Error((await res.json()).error || "추천 실패")
      const result = await res.json()
      setData(result)
      if (result.context) {
        setTodayCal(result.context.todayCalories)
        setBmr(result.context.targetCalories)
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  if (isLoggedIn === false || isLoggedIn === null) return null

  const remainingCal = bmr > 0 ? Math.max(bmr - todayCal, 0) : 0
  const calPercent = bmr > 0 ? Math.min((todayCal / bmr) * 100, 100) : 0
  const isOver = bmr > 0 && todayCal > bmr

  const deliveryLinks = (keyword: string) => [
    { name: "배민", url: `https://www.baemin.com/search?keyword=${encodeURIComponent(keyword)}`, color: "bg-[#2AC1BC]" },
    { name: "요기요", url: `https://www.yogiyo.co.kr/mobile/#/search/${encodeURIComponent(keyword)}`, color: "bg-[#FA0050]" },
    { name: "쿠팡이츠", url: `https://www.coupangeats.com/search?keyword=${encodeURIComponent(keyword)}`, color: "bg-[#5D00E6]" },
  ]

  const youtubeUrl = (name: string) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " 레시피")}`

  // 근거 아이콘+라벨 매핑
  const reasonMeta: Record<keyof Reasoning, { icon: typeof Flame; label: string; color: string }> = {
    taste:     { icon: UtensilsCrossed, label: "입맛",   color: "text-amber-600 bg-amber-50" },
    calorie:   { icon: Scale,           label: "칼로리", color: "text-red-600 bg-red-50" },
    nutrition: { icon: Salad,           label: "영양",   color: "text-green-600 bg-green-50" },
    variety:   { icon: Shuffle,         label: "다양성", color: "text-blue-600 bg-blue-50" },
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gradient-to-r from-primary/5 to-amber-50/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-bold">AI 맞춤 메뉴 추천</h3>
            <p className="text-[9px] text-muted-foreground">알레르기·식단·영양 분석</p>
          </div>
        </div>
        <button
          onClick={fetchRecommend}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {data ? "다시 추천" : "추천받기"}
        </button>
      </div>

      {/* 칼로리 바 (항상) */}
      {bmr > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <Flame className="h-3 w-3 text-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[10px]">
              <span>오늘 {todayCal.toLocaleString()}kcal</span>
              <span className={`font-medium ${isOver ? "text-red-600" : ""}`}>
                {isOver ? `${(todayCal - bmr).toLocaleString()}kcal 초과` : `잔여 ${remainingCal.toLocaleString()}kcal`}
              </span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? "bg-red-400" : "bg-gradient-to-r from-green-400 to-amber-400"}`}
                style={{ width: `${Math.min(calPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-1.5">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-[10px] text-muted-foreground">식단·영양 패턴 분석 중...</p>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div className="flex items-center gap-2 p-3">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <p className="text-[10px] text-red-600">{error}</p>
        </div>
      )}

      {/* 초기 상태 */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center py-6 px-3 gap-1.5">
          <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-[10px] text-muted-foreground text-center">
            뭐 먹을지 고민될 때<br />AI가 근거 기반 맞춤 추천해드려요
          </p>
        </div>
      )}

      {/* ═══ 추천 결과 ═══ */}
      {data && !loading && (
        <div className="p-2 space-y-2">

          {/* 📊 분석 요약 */}
          {data.analysis && (
            <div className="rounded-xl bg-muted/40 p-2.5 space-y-1.5">
              <p className="text-[10px] font-bold flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-primary" /> 식단 분석
              </p>
              {data.analysis.calorieSituation && (
                <div className="flex items-start gap-1.5">
                  <Scale className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">{data.analysis.calorieSituation}</p>
                </div>
              )}
              {data.analysis.weeklyPattern && (
                <div className="flex items-start gap-1.5">
                  <BarChart3 className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">{data.analysis.weeklyPattern}</p>
                </div>
              )}
              {data.analysis.nutritionGap && (
                <div className="flex items-start gap-1.5">
                  <Salad className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">{data.analysis.nutritionGap}</p>
                </div>
              )}
            </div>
          )}

          {/* 🍽️ 메뉴 카드 */}
          {data.recommendations.map((rec, i) => {
            const isExpanded = expandedIdx === i

            return (
              <div key={i} className="rounded-xl border bg-background overflow-hidden">
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/30 transition-colors text-left"
                >
                  <span className="text-xl">{rec.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{rec.name}</p>
                    {/* 1줄 근거 미리보기 */}
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {rec.reasoning?.taste || rec.reasoning?.calorie || ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-medium text-orange-600">{rec.estimatedCal}kcal</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-2.5 pb-2.5 pt-2 space-y-2.5">
                    {/* 추천 근거 체인 */}
                    {rec.reasoning && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold">📋 추천 근거</p>
                        {(Object.entries(rec.reasoning) as [keyof Reasoning, string][]).map(([key, text]) => {
                          if (!text) return null
                          const meta = reasonMeta[key]
                          const Icon = meta.icon
                          return (
                            <div key={key} className="flex items-start gap-1.5">
                              <span className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-medium shrink-0 ${meta.color}`}>
                                <Icon className="h-2.5 w-2.5" />{meta.label}
                              </span>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{text}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* 구분선 */}
                    <div className="border-t" />

                    {/* 배달 주문 */}
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Store className="h-3 w-3" /> 배달 주문
                      </p>
                      <div className="flex gap-1.5">
                        {deliveryLinks(rec.deliveryKeyword).map((app) => (
                          <a
                            key={app.name}
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex-1 flex items-center justify-center gap-0.5 rounded-lg ${app.color} py-2 text-[10px] font-bold text-white hover:opacity-90 transition-opacity`}
                          >
                            <Bike className="h-3 w-3" />{app.name}
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* 유튜브 레시피 */}
                    <a
                      href={youtubeUrl(rec.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-[#FF0000] py-2 text-[11px] font-bold text-white hover:bg-[#CC0000] transition-colors"
                    >
                      <Youtube className="h-4 w-4" />
                      직접 만들기 — 유튜브 레시피
                    </a>

                    {/* 알레르기 */}
                    {data.context.allergens.length > 0 && (
                      <div className="flex items-start gap-1 rounded-lg bg-green-50 border border-green-200 p-1.5">
                        <AlertTriangle className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-green-700">
                          <b>{data.context.allergens.join(", ")}</b> 알레르기를 고려한 추천입니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* 영양 팁 */}
          {data.nutritionTip && (
            <div className="rounded-lg bg-blue-50/50 border border-blue-100 px-2 py-1.5">
              <p className="text-[10px] text-blue-700">💡 {data.nutritionTip}</p>
            </div>
          )}

          <p className="text-[8px] text-center text-muted-foreground/60">
            AI 추천은 참고용입니다. 알레르기 반응 우려 시 성분을 직접 확인하세요.
          </p>
        </div>
      )}
    </div>
  )
}
