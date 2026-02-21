"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Sparkles, RefreshCw, ChefHat, Store, Clock, Flame,
  ChevronDown, ChevronUp, ExternalLink, MapPin, Loader2,
  UtensilsCrossed, AlertTriangle, Bike, X
} from "lucide-react"

interface Recipe {
  time: string
  difficulty: string
  ingredients: string[]
  steps: string[]
}

interface Recommendation {
  name: string
  emoji: string
  estimatedCal: number
  reason: string
  deliveryKeyword: string
  recipe: Recipe
}

interface MealRecommendData {
  mealType: string
  recommendations: Recommendation[]
  nutritionTip: string
  context: {
    todayCalories: number
    targetCalories: number
    remainingCalories: number
    allergens: string[]
    todayMeals: string[]
  }
}

export default function MealRecommend() {
  const [data, setData] = useState<MealRecommendData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [showRecipe, setShowRecipe] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  const fetchRecommend = useCallback(async () => {
    setLoading(true)
    setError("")
    setExpandedIdx(null)
    setShowRecipe(null)
    try {
      const res = await fetch("/api/meal-recommend")
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "추천 실패")
      }
      const result = await res.json()
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // 비로그인이면 표시 안 함
  if (isLoggedIn === false) return null
  if (isLoggedIn === null) return null

  const difficultyColor: Record<string, string> = {
    "쉬움": "text-green-600 bg-green-50",
    "보통": "text-amber-600 bg-amber-50",
    "어려움": "text-red-600 bg-red-50",
  }

  // 배달앱 딥링크
  const deliveryLinks = (keyword: string) => [
    { name: "배달의민족", url: `https://www.baemin.com/search?keyword=${encodeURIComponent(keyword)}`, color: "bg-[#2AC1BC]" },
    { name: "요기요", url: `https://www.yogiyo.co.kr/mobile/#/search/${encodeURIComponent(keyword)}`, color: "bg-[#FA0050]" },
    { name: "쿠팡이츠", url: `https://www.coupangeats.com/search?keyword=${encodeURIComponent(keyword)}`, color: "bg-[#5D00E6]" },
  ]

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-amber-50/50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">AI 맞춤 메뉴 추천</h3>
            <p className="text-[10px] text-muted-foreground">내 알레르기·식단 기반</p>
          </div>
        </div>
        <button
          onClick={fetchRecommend}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {data ? "다시 추천" : "추천받기"}
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">오늘의 식단을 분석하고 있어요...</p>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div className="flex items-center gap-2 p-4">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* 초기 상태 */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center py-8 px-4 gap-2">
          <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground text-center">
            오늘 뭐 먹을지 고민될 때<br />AI가 알레르기·칼로리 맞춤 추천해드려요
          </p>
        </div>
      )}

      {/* 추천 결과 */}
      {data && !loading && (
        <div className="p-3 space-y-2">
          {/* 칼로리 요약 바 */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px]">
                <span>오늘 {data.context.todayCalories}kcal 섭취</span>
                <span className="font-medium">잔여 {data.context.remainingCalories}kcal</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-amber-400 transition-all"
                  style={{ width: `${Math.min((data.context.todayCalories / data.context.targetCalories) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 메뉴 카드 */}
          {data.recommendations.map((rec, i) => {
            const isExpanded = expandedIdx === i
            const isRecipeOpen = showRecipe === i

            return (
              <div key={i} className="rounded-xl border bg-background overflow-hidden">
                {/* 메뉴 헤더 */}
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <span className="text-2xl">{rec.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{rec.name}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{rec.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-orange-600">{rec.estimatedCal}kcal</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="border-t px-3 pb-3 space-y-3">
                    {/* 탭: 배달 / 직접 만들기 */}
                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={() => setShowRecipe(isRecipeOpen ? null : i)}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                          !isRecipeOpen ? "bg-primary text-white border-primary" : "hover:bg-muted"
                        }`}
                      >
                        <Store className="h-3.5 w-3.5" />배달 주문
                      </button>
                      <button
                        onClick={() => setShowRecipe(isRecipeOpen ? null : i)}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                          isRecipeOpen ? "bg-primary text-white border-primary" : "hover:bg-muted"
                        }`}
                      >
                        <ChefHat className="h-3.5 w-3.5" />직접 만들기
                      </button>
                    </div>

                    {/* 배달 앱 연동 */}
                    {!isRecipeOpen && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-muted-foreground">배달앱에서 바로 검색하세요</p>
                        <div className="flex gap-2">
                          {deliveryLinks(rec.deliveryKeyword).map((app) => (
                            <a
                              key={app.name}
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex-1 flex items-center justify-center gap-1 rounded-lg ${app.color} py-2.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90`}
                            >
                              <Bike className="h-3.5 w-3.5" />
                              {app.name}
                            </a>
                          ))}
                        </div>
                        {/* 근처 음식점 검색 링크 */}
                        <a
                          href={`/?tab=restaurant&q=${encodeURIComponent(rec.deliveryKeyword)}`}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:text-foreground hover:border-solid transition-all"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          근처 &apos;{rec.name}&apos; 음식점 찾기
                        </a>
                      </div>
                    )}

                    {/* 레시피 */}
                    {isRecipeOpen && rec.recipe && (
                      <div className="space-y-3">
                        {/* 메타 정보 */}
                        <div className="flex gap-2">
                          <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
                            <Clock className="h-3 w-3" />{rec.recipe.time}
                          </span>
                          <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${difficultyColor[rec.recipe.difficulty] || "bg-muted"}`}>
                            {rec.recipe.difficulty}
                          </span>
                        </div>

                        {/* 재료 */}
                        <div>
                          <p className="text-[11px] font-bold mb-1">📝 재료</p>
                          <div className="flex flex-wrap gap-1">
                            {rec.recipe.ingredients.map((ing, j) => (
                              <span key={j} className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px]">
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* 조리 순서 */}
                        <div>
                          <p className="text-[11px] font-bold mb-1">👨‍🍳 만드는 법</p>
                          <div className="space-y-1.5">
                            {rec.recipe.steps.map((step, j) => (
                              <div key={j} className="flex gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                                  {j + 1}
                                </span>
                                <p className="text-xs leading-relaxed">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 알레르기 경고 */}
                        {data.context.allergens.length > 0 && (
                          <div className="flex items-start gap-1.5 rounded-lg bg-green-50 border border-green-200 p-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-green-700">
                              이 레시피는 <b>{data.context.allergens.join(", ")}</b> 알레르기를 고려하여 추천되었습니다.
                              조리 시 교차오염에 주의하세요.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* 영양 팁 */}
          {data.nutritionTip && (
            <div className="rounded-lg bg-blue-50/50 border border-blue-100 px-3 py-2">
              <p className="text-[11px] text-blue-700">💡 {data.nutritionTip}</p>
            </div>
          )}

          {/* 면책 */}
          <p className="text-[9px] text-center text-muted-foreground/60 pt-1">
            AI 추천은 참고용입니다. 알레르기 반응이 우려되면 반드시 성분을 직접 확인하세요.
          </p>
        </div>
      )}
    </div>
  )
}
