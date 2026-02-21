import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 })

    // 1. 사용자 알레르기
    const { data: allergies } = await supabase
      .from("user_allergies")
      .select("allergen_name, severity")
      .eq("user_id", user.id)

    const allergenList = (allergies || []).map(a => a.allergen_name)

    // 2. 오늘 식단 기록 — KST 기준 (기존 /api/diet/entries와 동일)
    const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0]
    const startOfDay = `${todayStr}T00:00:00+09:00`
    const endOfDay = `${todayStr}T23:59:59+09:00`

    const { data: todayMeals } = await supabase
      .from("diet_entries")
      .select("food_name, estimated_cal, emoji, recorded_at")
      .eq("user_id", user.id)
      .gte("recorded_at", startOfDay)
      .lte("recorded_at", endOfDay)
      .order("recorded_at", { ascending: true })

    // 3. 최근 3일 식단 (반복 방지) — KST 기준
    const threeDaysAgoDate = new Date(Date.now() + 9 * 60 * 60 * 1000)
    threeDaysAgoDate.setDate(threeDaysAgoDate.getDate() - 3)
    const threeDaysAgoStr = threeDaysAgoDate.toISOString().split("T")[0]

    const { data: recentMeals } = await supabase
      .from("diet_entries")
      .select("food_name, estimated_cal")
      .eq("user_id", user.id)
      .gte("recorded_at", `${threeDaysAgoStr}T00:00:00+09:00`)
      .order("recorded_at", { ascending: false })
      .limit(30)

    // 4. BMR
    const { data: profile } = await supabase
      .from("profiles")
      .select("bmr, height, weight, age, gender")
      .eq("id", user.id)
      .single()

    const bmr = profile?.bmr || 2000
    const todayCalories = (todayMeals || []).reduce((sum, m) => sum + (m.estimated_cal || 0), 0)
    const remainingCal = Math.max(bmr - todayCalories, 300)

    // 5. 식사 타입 (KST)
    const kstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getHours()
    let mealType = "저녁"
    if (kstHour < 10) mealType = "아침"
    else if (kstHour < 15) mealType = "점심"
    else if (kstHour < 18) mealType = "간식"

    const recentFoodNames = [...new Set((recentMeals || []).map(m => m.food_name))].slice(0, 15)
    const todayFoodNames = (todayMeals || []).map(m => `${m.emoji || "🍽️"} ${m.food_name} (${m.estimated_cal}kcal)`)

    // 6. GPT-4o-mini 추천
    const prompt = `사용자 정보:
- 알레르기: ${allergenList.length > 0 ? allergenList.join(", ") : "없음"}
- 오늘 먹은 것: ${todayFoodNames.length > 0 ? todayFoodNames.join(", ") : "아직 없음"}
- 오늘 섭취: ${todayCalories}kcal / 목표: ${bmr}kcal (잔여 ${remainingCal}kcal)
- 최근 3일: ${recentFoodNames.join(", ") || "기록 없음"}
- 식사: ${mealType}

다음 ${mealType} 메뉴 3개를 추천하세요.

규칙:
1. 알레르기 식품 절대 제외
2. 최근 3일 먹은 음식 피하기
3. 남은 칼로리(${remainingCal}kcal)에 맞추기
4. 오늘 영양 편중 보완 (탄수화물 위주면 단백질 추천 등)
5. 한국에서 흔한 실용적 메뉴

JSON만 응답 (코드블록 없이):
{
  "mealType": "${mealType}",
  "recommendations": [
    {
      "name": "메뉴명",
      "emoji": "이모지",
      "estimatedCal": 숫자,
      "reason": "영양 균형 기반 추천 이유 1줄",
      "deliveryKeyword": "배달앱 검색어"
    }
  ],
  "nutritionTip": "오늘 식단 영양 팁 1줄"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "한국 식단 영양사. 알레르기 고려 안전 메뉴 추천. JSON만 응답." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    let result: any
    try {
      const raw = (completion.choices[0]?.message?.content || "{}").replace(/```json\n?|```/g, "").trim()
      result = JSON.parse(raw)
    } catch {
      result = { mealType, recommendations: [], nutritionTip: "추천을 생성하지 못했습니다." }
    }

    return NextResponse.json({
      success: true,
      ...result,
      context: {
        todayCalories,
        targetCalories: bmr,
        remainingCalories: remainingCal,
        allergens: allergenList,
        todayMeals: todayFoodNames,
      }
    })
  } catch (error: any) {
    console.error("Meal recommend error:", error)
    return NextResponse.json({ error: error.message || "추천 실패" }, { status: 500 })
  }
}
