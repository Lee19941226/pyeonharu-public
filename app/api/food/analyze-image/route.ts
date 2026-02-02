import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    // OpenAI Vision API로 이미지 분석
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `다음 이미지는 식품 포장지의 성분표입니다. 
              다음 정보를 추출해주세요:
              1. 제품명
              2. 제조사
              3. 전체 성분 (쉼표로 구분)
              4. 알레르기 유발 성분
              
              JSON 형식으로 반환:
              {
                "productName": "제품명",
                "manufacturer": "제조사",
                "ingredients": ["성분1", "성분2", ...],
                "allergens": ["알레르기성분1", ...]
              }`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);

    // 식약처 API로 추가 정보 조회
    const foodApiUrl = new URL(
      "https://apis.data.go.kr/1471000/FoodNtrIrdntInfoService1/getFoodNtrItdntList1",
    );
    foodApiUrl.searchParams.append(
      "serviceKey",
      process.env.FOOD_API_KEY || "",
    );
    foodApiUrl.searchParams.append("PRDLST_NM", result.productName);
    foodApiUrl.searchParams.append("type", "json");

    const foodResponse = await fetch(foodApiUrl.toString());
    const foodData = await foodResponse.json();

    // 사용자 알레르기 정보 조회
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userAllergens: string[] = [];
    if (user) {
      const { data } = await supabase
        .from("user_allergies")
        .select("allergen_name")
        .eq("user_id", user.id);

      if (data) {
        userAllergens = data.map((item) => item.allergen_name);
      }
    }

    // 알레르기 매칭
    const detectedAllergens = result.allergens.filter((allergen: string) =>
      userAllergens.some(
        (userAllergen) =>
          allergen.includes(userAllergen) || userAllergen.includes(allergen),
      ),
    );

    return NextResponse.json({
      success: true,
      data: {
        foodCode: foodData.body?.items?.[0]?.PRDLST_CD || "unknown",
        productName: result.productName,
        manufacturer: result.manufacturer,
        ingredients: result.ingredients,
        allergens: result.allergens,
        detectedAllergens,
        hasAllergen: detectedAllergens.length > 0,
      },
    });
  } catch (error) {
    console.error("Image analysis error:", error);
    return NextResponse.json(
      { success: false, error: "이미지 분석 실패" },
      { status: 500 },
    );
  }
}
