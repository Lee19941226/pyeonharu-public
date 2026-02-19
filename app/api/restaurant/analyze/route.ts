import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { restaurantName, category, address, userAllergens } = body

    if (!restaurantName || !userAllergens || userAllergens.length === 0) {
      return NextResponse.json(
        { error: "음식점 이름과 알레르기 정보가 필요합니다." },
        { status: 400 }
      )
    }

    const prompt = `당신은 한국 음식점 정보에 매우 해박한 전문가입니다.

아래 음식점에 대해 실제로 알고 있는 정보를 바탕으로 분석해주세요.
만약 해당 음식점을 정확히 모른다면, 상호명과 카테고리를 바탕으로 최대한 현실적으로 추정해주세요.

음식점명: ${restaurantName}
주소: ${address || "정보 없음"}
카테고리: ${category || "알 수 없음"}
사용자 알레르기: ${userAllergens.join(", ")}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요:
{
  "riskLevel": "safe 또는 caution 또는 danger",
  "summary": "이 식당에 대한 한 줄 설명 (한국어, 특징이나 유명한 점 포함)",
  "popularity": "높음 또는 보통 또는 낮음 또는 알 수 없음",
  "popularityNote": "유명도에 대한 간단한 설명 (예: '군포 산본 지역 맛집', '체인점', '동네 단골집' 등)",
  "estimatedMenus": [
    {
      "name": "실제 메뉴명 또는 추정 메뉴명",
      "price": "가격 (알면 작성, 모르면 빈 문자열)",
      "allergens": ["포함된 알레르기 성분"],
      "matchedUserAllergens": ["사용자 알레르기와 일치하는 성분"],
      "risk": "safe 또는 caution 또는 danger"
    }
  ],
  "safeOptions": ["사용자가 비교적 안전하게 먹을 수 있는 메뉴 추천"],
  "tips": "이 음식점에서 알레르기가 있는 사용자가 주문할 때 도움이 될 구체적인 팁 (한국어)",
  "overallReview": "이 음식점에 대한 전반적인 평가 한두 줄 (맛, 분위기, 가성비 등)"
}

규칙:
- 실제로 아는 음식점이면 실제 메뉴와 가격을 알려주세요
- 모르는 음식점이면 상호명/카테고리 기반으로 현실적인 메뉴를 5~8개 추정하세요
- riskLevel: 사용자 알레르기와 일치하는 메뉴가 많으면 danger, 일부면 caution, 없으면 safe
- matchedUserAllergens에는 사용자가 등록한 알레르기 중 해당 메뉴에 포함된 것만 넣기
- estimatedMenus는 5~8개
- safeOptions는 사용자 알레르기가 없는 메뉴만 추천`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
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
