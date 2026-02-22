import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }
    const { query } = await req.json();

    console.log("🔍 AI 텍스트 분석:", query);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `당신은 식품 정보 전문가입니다. 
"${query}"라는 제품에 대해 다음 정보를 추론하여 JSON으로 반환하세요:

1. productName: 제품명
2. manufacturer: 추정 제조사 (모르면 "")
3. ingredients: 일반적으로 들어가는 주요 원재료 5-10가지 (배열)
4. allergens: 포함 가능한 알레르기 유발 물질 (배열)
   - 한국 식약처 22가지: 계란, 우유, 밀, 메밀, 땅콩, 대두, 호두, 잣, 견과류, 갑각류, 새우, 게, 고등어, 오징어, 조개류, 생선, 복숭아, 토마토, 돼지고기, 쇠고기, 닭고기, 아황산류

반드시 JSON만 반환하세요.

예시:
{
  "productName": "빙그레 바나나맛 우유",
  "manufacturer": "빙그레",
  "ingredients": ["원유", "설탕", "바나나농축액", "합성착향료", "안정제"],
  "allergens": ["우유"]
}`,
        },
      ],
      max_tokens: 1000,
    });

    const aiResult = response.choices[0].message.content || "{}";
    const cleanJson = aiResult
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const analysisData = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      productName: analysisData.productName,
      manufacturer: analysisData.manufacturer || "",
      detectedIngredients: analysisData.ingredients || [],
      allergens: analysisData.allergens || [],
      dataSource: "ai-text",
    });
  } catch (error) {
    console.error("AI 텍스트 분석 오류:", error);
    return NextResponse.json(
      { success: false, error: "분석 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
