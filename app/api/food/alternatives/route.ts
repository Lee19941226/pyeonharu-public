import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productName = searchParams.get("name");
  const allergens = searchParams.get("allergens"); // "우유,계란" 형태
  const code = searchParams.get("code");

  if (!productName) {
    return NextResponse.json({ error: "제품명 필요" }, { status: 400 });
  }

  const supabase = await createClient();
  const userAllergenList = allergens
    ? allergens.split(",").map((a) => a.trim())
    : [];

  try {
    // ==========================================
    // 0단계: safe_alternatives 검증 대체품 먼저
    // ==========================================
    let dbAlternatives: any[] = [];

    if (userAllergenList.length > 0) {
      const { data: safeData } = await supabase
        .from("safe_alternatives")
        .select("product_name, manufacturer, category, emoji, food_code")
        .in("allergen", userAllergenList)
        .eq("is_verified", true)
        .limit(3);

      if (safeData && safeData.length > 0) {
        dbAlternatives = safeData.map((p) => ({
          barcode: p.food_code || null,
          productName: p.product_name,
          manufacturer: p.manufacturer || "",
          allergens: [],
          category: p.category,
          reason: `${p.emoji} ${userAllergenList[0]} 없는 검증된 안전 제품`,
          dataSource: "db",
        }));
      }
    }

    // ==========================================
    // 1단계: safe_alternatives 부족하면 food_search_cache 보완
    // ==========================================
    if (dbAlternatives.length < 3) {
      const keyword = productName
        .replace(/\(.*?\)/g, "")
        .trim()
        .slice(0, 4);

      const existingNames = dbAlternatives.map((a) => a.productName);

      const { data: dbProducts } = await supabase
        .from("food_search_cache")
        .select("food_code, food_name, manufacturer, allergens, data_source")
        .ilike("food_name", `%${keyword}%`)
        .neq("food_code", code || "")
        .limit(30);

      if (dbProducts && dbProducts.length > 0) {
        const cacheAlternatives = dbProducts
          .filter((p) => {
            if (existingNames.includes(p.food_name)) return false; // 중복 제거
            const pAllergens: string[] = p.allergens || [];
            return !pAllergens.some((pa) =>
              userAllergenList.some((ua) => pa.includes(ua) || ua.includes(pa)),
            );
          })
          .slice(0, 3 - dbAlternatives.length)
          .map((p) => ({
            barcode: p.food_code,
            productName: p.food_name,
            manufacturer: p.manufacturer || "",
            allergens: p.allergens || [],
            category: "유사 제품",
            reason: "동일 계열 안전 제품",
            dataSource: p.data_source,
          }));

        dbAlternatives = [...dbAlternatives, ...cacheAlternatives];
      }
    }

    // DB에서 3개 찾으면 AI 스킵
    if (dbAlternatives.length >= 3) {
      return NextResponse.json({ success: true, alternatives: dbAlternatives });
    }

    // ==========================================
    // 2단계: AI로 나머지 채우기
    // ==========================================
    const needed = 3 - dbAlternatives.length;
    const excludeNames = dbAlternatives.map((a) => a.productName);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const allergenStr =
      userAllergenList.length > 0 ? userAllergenList.join(", ") : "없음";

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `"${productName}"과 비슷한 한국 실제 제품 ${needed}가지를 추천해주세요.

**필수 조건:**
- 반드시 실제로 한국 마트에서 판매되는 제품
- 제품명 100% 한국어
- 아래 알레르기 성분 제외: ${allergenStr}
- 제외할 제품: ${excludeNames.join(", ") || "없음"}

**카테고리 맞춰서 추천:**
- 라면이면 라면 계열, 과자면 과자 계열, 음료면 음료 계열

JSON만 반환 (다른 텍스트 없이):
[
  {
    "productName": "실제 한국 제품명",
    "manufacturer": "제조사",
    "allergens": ["포함 알레르기"],
    "reason": "이 제품을 추천하는 이유 한 줄"
  }
]`,
        },
      ],
    });

    const raw = aiResponse.choices[0].message.content || "[]";
    const clean = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let aiAlternatives: any[] = [];
    try {
      const parsed = JSON.parse(clean);
      aiAlternatives = parsed
        .filter((alt: any) => {
          if (!alt.productName) return false;
          // 비한국어 필터
          const nonKorean = /[a-zA-Z\u4E00-\u9FFF]/;
          return !nonKorean.test(alt.productName);
        })
        .map((alt: any) => ({
          barcode: null, // AI 추천은 바코드 없음
          productName: alt.productName,
          manufacturer: alt.manufacturer || "",
          allergens: alt.allergens || [],
          category: "AI 추천",
          reason: alt.reason || "알레르기 없는 유사 제품",
          dataSource: "ai",
        }));
    } catch (e) {
      console.error("AI 대체품 파싱 실패:", e);
    }

    const finalAlternatives = [...dbAlternatives, ...aiAlternatives].slice(
      0,
      3,
    );

    return NextResponse.json({
      success: true,
      alternatives: finalAlternatives,
    });
  } catch (error) {
    console.error("대체품 추천 오류:", error);
    return NextResponse.json({ success: false, alternatives: [] });
  }
}
