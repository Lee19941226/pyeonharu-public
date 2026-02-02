import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { symptom } = await req.json()

    if (!symptom || typeof symptom !== "string" || !symptom.trim()) {
      return NextResponse.json(
        { error: "증상을 입력해주세요." },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const systemPrompt = `당신은 한국의 의료 안내 AI 어시스턴트입니다.
사용자가 입력한 증상을 분석하여 적합한 진료과를 추천해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "department": "추천 진료과명",
  "description": "해당 진료과를 추천하는 이유 (2~3문장)",
  "confidence": 신뢰도(50~95 사이 정수),
  "additionalAdvice": "추가 조언 (1~2문장)",
  "possibleDepartments": ["대안 진료과1", "대안 진료과2"]
}

진료과 목록: 내과, 외과, 정형외과, 신경과, 신경외과, 피부과, 비뇨기과, 산부인과, 소아청소년과, 안과, 이비인후과, 치과, 정신건강의학과, 재활의학과, 가정의학과, 응급의학과

규칙:
- 증상과 가장 관련 높은 진료과를 추천하세요
- confidence는 증상의 명확성에 따라 조절하세요
- 위험한 증상(가슴 통증, 호흡곤란, 심한 출혈 등)이면 응급의학과를 최우선 추천하고 즉시 병원 방문을 권고하세요
- 항상 "정확한 진단은 의료 전문가와 상담하세요"라는 취지의 문구를 additionalAdvice에 포함하세요`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `증상: ${symptom.trim()}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("OpenAI API error:", errorData)
      return NextResponse.json(
        { error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: "AI 응답을 받지 못했습니다." },
        { status: 502 }
      )
    }

    // JSON 파싱 (마크다운 코드블록 제거 후 파싱)
    const cleaned = content.replace(/```json\s?/g, "").replace(/```/g, "").trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Symptom analyze error:", error)
    return NextResponse.json(
      { error: "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    )
  }
}
