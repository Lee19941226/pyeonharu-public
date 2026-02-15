import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { restaurantName, category, userAllergens } = body

    if (!restaurantName || !userAllergens || userAllergens.length === 0) {
      return NextResponse.json(
        { error: "음식점 이름과 알레르기 정보가 필요합니다." },
        { status: 400 }
      )
    }

    const prompt = `당신은 한국 음식점 메뉴 및 알레르기 전문가입니다.
다음 음식점의 일반적인 대표 메뉴를 5~8개 추정하고, 각 메뉴에 포함될 가능성이 높은 알레르기 유발 성분을 분석해주세요.

음식점명: ${restaurantName}
카테고리: ${category || "알 수 없음"}
사용자 알레르기: ${userAllergens.join(", ")}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요:
{
  "riskLevel": "safe 또는 caution 또는 danger",
  "summary": "이 식당에서 주의할 점 한 줄 요약 (한국어)",
  "estimatedMenus": [
    {
      "name": "메뉴명",
      "allergens": ["포함된 알레르기 성분"],
      "matchedUserAllergens": ["사용자 알레르기와 일치하는 성분"],
      "risk": "safe 또는 caution 또는 danger"
    }
  ],
  "safeOptions": ["사용자가 비교적 안전하게 먹을 수 있는 메뉴 추천"],
  "tips": "주문 시 도움이 될 팁 (한국어)"
}

규칙:
- riskLevel: 사용자 알레르기와 일치하는 메뉴가 많으면 danger, 일부면 caution, 없으면 safe
- matchedUserAllergens에는 사용자가 등록한 알레르기 중 해당 메뉴에 포함된 것만 넣기
- safeOptions는 사용자 알레르기가 없는 메뉴만 추천
- 추정이므로 확정적 표현 대신 "~가능성", "~포함될 수 있음" 등 사용`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    })

    const content = completion.choices[0]?.message?.content || ""

    // JSON 파싱
    let result
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      result = JSON.parse(cleaned)
    } catch {
      console.error("[Restaurant Analyze] JSON 파싱 실패:", content)
      return NextResponse.json(
        { error: "AI 분석 결과를 처리할 수 없습니다." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis: {
        ...result,
        disclaimer: "AI가 추정한 정보입니다. 실제 메뉴와 성분은 매장에 직접 확인하세요.",
      },
    })
  } catch (error) {
    console.error("[Restaurant Analyze] Error:", error)
    return NextResponse.json(
      { error: "AI 분석 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
