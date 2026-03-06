import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"
import { checkApiRateLimit } from "@/lib/utils/api-rate-limit"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { restaurantName, category, address, userAllergens } = body

    if (!restaurantName || !userAllergens || userAllergens.length === 0) {
      return NextResponse.json(
        { error: "음식점 이름과 알레르기 정보가 필요합니다." },
        { status: 400 }
      )
    }

    // Rate limit 체크 (OpenAI 호출 직전)
    const rateResult = await checkApiRateLimit({
      prefix: "rest",
      userId: user.id,
      dailyLimitLogin: 10,
      dailyLimitAnon: 0,
    })
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "일일 음식점 분석 한도(10회)를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      )
    }

    const prompt = `당신은 한국 음식점 리뷰와 메뉴 정보에 매우 해박한 전문가입니다.

아래 음식점에 대해 실제로 알고 있는 정보(네이버, 카카오맵, 블로그 리뷰, 배달앱 등)를 바탕으로 분석해주세요.
만약 정확히 모른다면, 상호명과 카테고리를 바탕으로 최대한 현실적으로 추정해주세요.

음식점명: ${restaurantName}
주소: ${address || "정보 없음"}
카테고리: ${category || "알 수 없음"}
사용자 알레르기: ${userAllergens.join(", ")}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요:
{
  "riskLevel": "safe 또는 caution 또는 danger",
  "summary": "이 식당에 대한 한 줄 소개 (특징, 분위기, 대표 메뉴 등)",
  "popularity": "높음 또는 보통 또는 낮음 또는 알 수 없음",
  "popularityNote": "유명도에 대한 간단한 설명",
  "reviewAnalysis": {
    "topKeywords": ["가장 많이 언급되는 리뷰 키워드 5~8개 (예: 가성비, 양많음, 친절, 맛있음, 주차편함 등)"],
    "positiveReviews": ["대표적인 긍정 리뷰 요약 3~5개 (예: '가성비가 좋고 양이 푸짐하다', '사장님이 친절하다')"],
    "negativeReviews": ["대표적인 부정 리뷰 요약 2~4개 (예: '웨이팅이 길다', '주차가 불편하다')"],
    "overallSentiment": "전반적 리뷰 분위기 한 줄 요약"
  },
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
  "tips": "이 음식점에서 알레르기가 있는 사용자가 주문할 때 도움이 될 팁",
  "overallReview": "이 음식점에 대한 전반적인 평가 한두 줄 (맛, 분위기, 가성비 등)"
}

규칙:
- reviewAnalysis의 topKeywords는 실제 리뷰에서 자주 등장하는 키워드를 추정
- positiveReviews와 negativeReviews는 실제 리뷰 톤을 반영한 자연스러운 문장
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
      max_tokens: 2000,
    })

    const content = completion.choices[0]?.message?.content || ""

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
