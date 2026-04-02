import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { checkApiRateLimit } from "@/lib/utils/api-rate-limit";
import { parseJsonArraySafe } from "@/lib/utils/ai-safety";
import { apiError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productName = searchParams.get("name");
  const allergens = searchParams.get("allergens");
  const code = searchParams.get("code");

  if (!productName || !productName.trim()) {
    return apiError(400, "INVALID_PRODUCT_NAME", "제품명 필요");
  }

  const normalizedProductName = String(productName).trim();
  if (normalizedProductName.length > 80) {
    return apiError(400, "INVALID_PRODUCT_NAME", "제품명은 80자 이하로 입력해주세요.");
  }

  const supabase = await createClient();
  const userAllergenList = allergens
    ? allergens
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0 && a.length <= 30)
        .slice(0, 22)
    : [];

  try {
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

    if (dbAlternatives.length < 3) {
      const keyword = normalizedProductName
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
            if (existingNames.includes(p.food_name)) return false;
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

    if (dbAlternatives.length >= 3) {
      return NextResponse.json({ success: true, alternatives: dbAlternatives });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rateResult = await checkApiRateLimit({
      prefix: "alt",
      userId: user?.id || null,
      dailyLimitLogin: 20,
      dailyLimitAnon: 10,
    });
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "일일 대체품 추천 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 },
      );
    }

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
          content: `"${normalizedProductName}"과 비슷한 한국 실제 제품 ${needed}가지를 추천해주세요.

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

    let aiAlternatives: any[] = [];
    const parsed = parseJsonArraySafe<Record<string, unknown>>(raw) || [];

    aiAlternatives = parsed
      .filter((alt) => {
        const name = String(alt.productName || "").trim();
        if (!name) return false;
        const nonKorean = /[a-zA-Z\u4E00-\u9FFF]/;
        return !nonKorean.test(name);
      })
      .map((alt) => ({
        barcode: null,
        productName: String(alt.productName || "").trim(),
        manufacturer: String(alt.manufacturer || "").trim(),
        allergens: Array.isArray(alt.allergens)
          ? alt.allergens.map((a) => String(a).trim()).filter(Boolean)
          : [],
        category: "AI 추천",
        reason: String(alt.reason || "").trim() || "알레르기 없는 유사 제품",
        dataSource: "ai",
      }));

    const finalAlternatives = [...dbAlternatives, ...aiAlternatives].slice(0, 3);

    return NextResponse.json({
      success: true,
      alternatives: finalAlternatives,
    });
  } catch (error) {
    console.error("[food/alternatives] error:", error);
    return NextResponse.json(
      { error: "대체품 추천 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}



