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

    // 2. 오늘 식단 기록
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todayMeals } = await supabase
      .from("diet_entries")
      .select("food_name, estimated_cal, emoji, recorded_at")
      .eq("user_id", user.id)
      .gte("recorded_at", todayStart.toISOString())
      .order("recorded_at", { ascending: true })

    // 3. 최근 3일 식단 (반복 방지용)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { data: recentMeals } = await supabase
      .from("diet_entries")
      .select("food_name, estimated_cal")
      .eq("user_id", user.id)
      .gte("recorded_at", threeDaysAgo.toISOString())
      .order("recorded_at", { ascending: false })
      .limit(30)

    // 4. BMR 정보
    const { data: profile } = await supabase
      .from("profiles")
      .select("bmr, height, weight, age, gender")
      .eq("id", user.id)
      .single()

    const bmr = profile?.bmr || 2000
    const todayCalories = (todayMeals || []).reduce((sum, m) => sum + (m.estimated_cal || 0), 0)
    const remainingCal = Math.max(bmr - todayCalories, 300)

    // 5. 현재 시간 기반 식사 타입
    const hour = new Date().getHours()
    let mealType = "저녁"
    if (hour < 10) mealType = "아침"
    else if (hour < 15) mealType = "점심"
    else if (hour < 18) mealType = "간식"

    const recentFoodNames = [...new Set((recentMeals || []).map(m => m.food_name))].slice(0, 15)
    const todayFoodNames = (todayMeals || []).map(m => `${m.emoji || "🍽️"} ${m.food_name} (${m.estimated_cal}kcal)`)

    // 6. GPT-4o 추천
    const prompt = `사용자 정보:
- 알레르기: ${allergenList.length > 0 ? allergenList.join(", ") : "없음"}
- 오늘 먹은 것: ${todayFoodNames.length > 0 ? todayFoodNames.join(", ") : "아직 없음"}
- 오늘 섭취 칼로리: ${todayCalories}kcal / 목표: ${bmr}kcal
- 남은 칼로리: 약 ${remainingCal}kcal
- 최근 3일 먹은 음식: ${recentFoodNames.join(", ") || "기록 없음"}
- 현재 식사 시간: ${mealType}

다음 ${mealType} 메뉴를 3개 추천해주세요.

규칙:
1. 알레르기 식품은 절대 포함하지 마세요
2. 최근 3일 내 먹은 음식은 피해주세요
3. 남은 칼로리(${remainingCal}kcal)에 맞는 메뉴를 추천하세요
4. 한국에서 흔히 먹는 실용적인 메뉴로 추천하세요
5. 각 메뉴에 대해 배달 주문용 검색어와 간단 레시피를 포함하세요

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
{
  "mealType": "${mealType}",
  "recommendations": [
    {
      "name": "메뉴명",
      "emoji": "이모지",
      "estimatedCal": 숫자,
      "reason": "추천 이유 1줄",
      "deliveryKeyword": "배달앱 검색어",
      "recipe": {
        "time": "조리시간",
        "difficulty": "쉬움|보통|어려움",
        "ingredients": ["재료1", "재료2"],
        "steps": ["1단계", "2단계", "3단계"]
      }
    }
  ],
  "nutritionTip": "오늘 식단 기반 영양 팁 1줄"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "당신은 한국 식단 영양사입니다. 알레르기를 고려한 안전한 메뉴를 추천합니다. JSON으로만 응답하세요." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
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
