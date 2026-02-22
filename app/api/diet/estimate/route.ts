import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/diet/estimate — 음식 이름으로 AI 칼로리 추정
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const body = await req.json()
    const { food_name, grams } = body

    if (!food_name?.trim()) {
      return NextResponse.json({ error: "음식 이름을 입력해주세요." }, { status: 400 })
    }

    const gramsInfo = grams && parseInt(grams) > 0
      ? `${parseInt(grams)}g 기준으로`
      : "일반적인 1인분 기준으로"

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 한국 음식 영양 전문가입니다. 음식 이름과 양을 보고 칼로리를 추정합니다.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "estimated_cal": 추정 칼로리 (정수, kcal),
  "serving_desc": "기준 설명 (예: '1인분 약 300g', '1개 약 50g')",
  "emoji": "음식을 나타내는 이모지 1개"
}`
        },
        {
          role: "user",
          content: `"${food_name.trim()}" 음식의 칼로리를 ${gramsInfo} 추정해주세요.`
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content || ""

    let result
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      result = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: "AI 분석 결과를 처리할 수 없습니다." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      estimated_cal: result.estimated_cal || 0,
      serving_desc: result.serving_desc || "",
      emoji: result.emoji || "🍽️",
    })
  } catch (error) {
    console.error("[Diet Estimate] Error:", error)
    return NextResponse.json({ error: "AI 추정 중 오류가 발생했습니다." }, { status: 500 })
  }
}
