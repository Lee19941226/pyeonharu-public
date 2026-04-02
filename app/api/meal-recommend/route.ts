import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import OpenAI from "openai";
import { checkOpenAIRateLimit } from "@/lib/utils/openai-rate-limit";
import { parseJsonObjectSafe } from "@/lib/utils/ai-safety";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getFallbackMealRecommend(mealType: string) {
  return {
    mealType,
    analysis: { calorieSituation: "", weeklyPattern: "", nutritionGap: "" },
    recommendations: [],
    nutritionTip: "추천을 생성하지 못했습니다.",
  };
}

function normalizeMealRecommendResult(
  parsed: Record<string, unknown>,
  mealType: string,
) {
  const analysisRaw =
    parsed.analysis && typeof parsed.analysis === "object"
      ? (parsed.analysis as Record<string, unknown>)
      : {};

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const rec = item as Record<string, unknown>;
          const name = String(rec.name || "").trim();
          if (!name) return null;
          const estimatedCalRaw = Number(rec.estimatedCal);
          return {
            name,
            emoji: String(rec.emoji || "🍽️").trim() || "🍽️",
            estimatedCal: Number.isFinite(estimatedCalRaw)
              ? Math.max(0, Math.min(2000, Math.round(estimatedCalRaw)))
              : 0,
            reasoning:
              rec.reasoning && typeof rec.reasoning === "object"
                ? rec.reasoning
                : {},
            deliveryKeyword: String(rec.deliveryKeyword || "").trim(),
          };
        })
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    mealType: String(parsed.mealType || mealType).trim() || mealType,
    analysis: {
      calorieSituation: String(analysisRaw.calorieSituation || "").trim(),
      weeklyPattern: String(analysisRaw.weeklyPattern || "").trim(),
      nutritionGap: String(analysisRaw.nutritionGap || "").trim(),
    },
    recommendations,
    nutritionTip: String(parsed.nutritionTip || "").trim() || "추천을 생성하지 못했습니다.",
  };
}

export async function GET(req: NextRequest) {
  // ✅ 인메모리 Rate Limit (보조)
  const rateCheck = checkOpenAIRateLimit("meal-recommend");
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ─── DB 기반 Rate Limit (로그인 1회/일, 비로그인 1회/일 IP 기반) ───
    let identifier: string;
    const dailyLimit = 1;

    if (user) {
      identifier = `meal:user:${user.id}`;
    } else {
      const headersList = await headers();
      const ip =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        "unknown";
      identifier = `meal:ip:${ip}`;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: dailyCount } = await supabase
      .from("image_analyze_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier)
      .gte("analyzed_at", todayStart.toISOString());

    if ((dailyCount || 0) >= dailyLimit) {
      return NextResponse.json(
        {
          error: user
            ? `오늘 메뉴 추천 한도(${dailyLimit}회)를 초과했습니다.`
            : `오늘 무료 추천 한도(${dailyLimit}회)를 초과했습니다. 로그인하시면 맞춤 추천을 받을 수 있어요.`,
        },
        { status: 429 },
      );
    }

    supabase
      .from("image_analyze_rate_limits")
      .insert({ identifier, analyzed_at: new Date().toISOString() })
      .then(() => {});

    // ─── 1~4. 사용자 데이터 (로그인 시만) ───
    let allergenList: string[] = [];
    let todayMeals: any[] = [];
    let weeklyMeals: any[] = [];
    let bmr = 2000;

    if (user) {
      const { data: allergies } = await supabase
        .from("user_allergies")
        .select("allergen_name, severity")
        .eq("user_id", user.id);
      allergenList = (allergies || []).map((a) => a.allergen_name);

      const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const startOfDay = `${todayStr}T00:00:00+09:00`;
      const endOfDay = `${todayStr}T23:59:59+09:00`;

      const { data: todayData } = await supabase
        .from("diet_entries")
        .select("food_name, estimated_cal, emoji, recorded_at")
        .eq("user_id", user.id)
        .gte("recorded_at", startOfDay)
        .lte("recorded_at", endOfDay)
        .order("recorded_at", { ascending: true });
      todayMeals = todayData || [];

      const weekAgo = new Date(Date.now() + 9 * 60 * 60 * 1000);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];

      const { data: weeklyData } = await supabase
        .from("diet_entries")
        .select("food_name, estimated_cal, recorded_at")
        .eq("user_id", user.id)
        .gte("recorded_at", `${weekAgoStr}T00:00:00+09:00`)
        .order("recorded_at", { ascending: false })
        .limit(100);
      weeklyMeals = weeklyData || [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("bmr, height, weight, age, gender")
        .eq("id", user.id)
        .single();
      bmr = profile?.bmr || 2000;
    }
    const todayCalories = todayMeals.reduce(
      (sum, m) => sum + (m.estimated_cal || 0),
      0,
    );
    const remainingCal = Math.max(bmr - todayCalories, 0);

    // ─── 5. 식사 타입 (KST) ───
    const kstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getHours();
    let mealType = "저녁";
    if (kstHour < 10) mealType = "아침";
    else if (kstHour < 15) mealType = "점심";
    else if (kstHour < 18) mealType = "간식";

    // ─── 6. 주간 분석 데이터 가공 ───
    const todayFoodNames = todayMeals.map(
      (m: any) => `${m.emoji || "🍽️"} ${m.food_name} (${m.estimated_cal}kcal)`,
    );
    const recentFoodNames = [
      ...new Set(weeklyMeals.map((m: any) => m.food_name)),
    ].slice(0, 20);

    // 주간 음식 빈도
    const foodFreq: Record<string, number> = {};
    weeklyMeals.forEach((m: any) => {
      foodFreq[m.food_name] = (foodFreq[m.food_name] || 0) + 1;
    });
    const topFoods = Object.entries(foodFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => `${name}(${count}회)`);

    // 주간 일별 칼로리
    const dailyCals: Record<string, number> = {};
    weeklyMeals.forEach((m: any) => {
      const kst = new Date(
        new Date(m.recorded_at).getTime() + 9 * 60 * 60 * 1000,
      );
      const key = kst.toISOString().split("T")[0];
      dailyCals[key] = (dailyCals[key] || 0) + (m.estimated_cal || 0);
    });
    const dailyCalArr = Object.entries(dailyCals).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const weekAvgCal =
      dailyCalArr.length > 0
        ? Math.round(
            dailyCalArr.reduce((s, [, c]) => s + c, 0) / dailyCalArr.length,
          )
        : 0;
    const overDays = dailyCalArr.filter(([, c]) => bmr > 0 && c > bmr).length;

    // ─── 7. 칼로리 상황 판단 ───
    const isOver = todayCalories > bmr;
    const remainingPercent = bmr > 0 ? (remainingCal / bmr) * 100 : 100;
    let calorieSituation = "";
    if (isOver) {
      calorieSituation = `목표 ${bmr}kcal 대비 ${todayCalories - bmr}kcal 초과 상태 → 100kcal 이하 초경량 옵션 필요`;
    } else if (remainingPercent >= 70) {
      calorieSituation = `아직 ${todayCalories}kcal만 섭취, 잔여 ${remainingCal}kcal로 여유 충분 → 든든한 본식사 추천`;
    } else if (remainingPercent >= 30) {
      calorieSituation = `${todayCalories}kcal 섭취, 잔여 ${remainingCal}kcal → 적당한 한 끼 추천`;
    } else {
      calorieSituation = `${todayCalories}kcal 섭취, 잔여 ${remainingCal}kcal로 적음 → 가벼운 식사 추천`;
    }

    // ─── 8. GPT-4o-mini 추천 (근거 체인 포함) ───
    const prompt = `당신은 한국 식단 영양사입니다. 아래 데이터를 분석하고, 각 근거를 명시한 메뉴 추천을 해주세요.

## 사용자 데이터

**알레르기**: ${allergenList.length > 0 ? allergenList.join(", ") : "없음"}

**오늘 섭취 내역**:
${todayFoodNames.length > 0 ? todayFoodNames.join("\n") : "아직 없음"}
- 합계: ${todayCalories}kcal / 목표: ${bmr}kcal / 잔여: ${remainingCal}kcal
- 상황 판단: ${calorieSituation}

**주간 패턴 (최근 7일)**:
- 자주 먹은 음식: ${topFoods.join(", ") || "기록 없음"}
- 일평균 칼로리: ${weekAvgCal}kcal
- 목표 초과 일수: ${overDays}일/7일
- 일별 칼로리: ${dailyCalArr.map(([d, c]) => `${d.slice(5)}:${c}kcal`).join(", ") || "없음"}

**현재**: ${mealType} 시간

## 칼로리 추정 기준
- **반드시 해당 음식 단품 1인분만** 추정. 밥+반찬+국 세트로 부풀리지 마세요.
- 참고: 잡곡밥 1공기 300kcal, 김치찌개 200kcal, 시금치나물 40kcal, 닭가슴살샐러드 300kcal, 비빔밥 500kcal, 라면 500kcal

## 추천 규칙
1. 알레르기 식품 절대 제외
2. 최근 7일 자주 먹은 음식 피하기 (다양성)
3. 남은 칼로리(${remainingCal}kcal)에 맞는 식사량 추천:
   - 잔여 칼로리가 목표의 70% 이상(많이 남음) → 든든한 정식/본식사 추천 (500~800kcal급)
   - 잔여 칼로리가 목표의 30~70% → 적당한 한 끼 추천 (300~500kcal급)
   - 잔여 칼로리가 목표의 30% 미만(적게 남음) → 가벼운 식사 추천 (100~300kcal급)
   - 칼로리 초과 상태 → 100kcal 이하 초경량 옵션 추천
4. 주간 영양 패턴의 편중 보완
5. 오늘 먹은 음식과 **보완적(반대)** 입맛 추천: 자극적→담백, 느끼→칼칼, 기름진→깔끔, 무거운→가벼운. "어울리는" 맛이 아니라 "다음에 땡기는" 맛을 추천
6. **반드시 최소 3개, 최대 5개** 메뉴를 추천하세요

## 응답 형식 (JSON만, 코드블록 없이)
{
  "mealType": "${mealType}",
  "analysis": {
    "calorieSituation": "오늘 칼로리 상황 1줄 (예: 아직 0kcal 섭취로 잔여 2000kcal, 든든한 본식사 추천 / 또는: 이미 1800kcal 섭취로 목표 초과, 가벼운 식사 필요)",
    "weeklyPattern": "주간 패턴 분석 1줄 (예: 햄버거·버거를 7일간 9회 섭취, 패스트푸드 편중 심각)",
    "nutritionGap": "부족한 영양소 1줄 (예: 식이섬유·비타민 부족, 단백질 과다)"
  },
  "recommendations": [
    {
      "name": "메뉴명",
      "emoji": "이모지",
      "estimatedCal": 숫자,
      "reasoning": {
        "taste": "오늘 먹은 것과 반대되는 입맛 근거. 사람은 자극적인 음식 후에는 담백한 맛이, 느끼한 음식 후에는 칼칼한 맛이, 기름진 음식 후에는 깔끔한 맛이 땡긴다. (예: 점심에 기름진 버거를 먹었으니 저녁은 깔끔한 한식이 땡길 시점입니다)",
        "calorie": "칼로리 근거 (예: 잔여 1620kcal로 여유 충분하므로 든든한 600kcal급 본식사 적합)",
        "nutrition": "주간 영양 근거 (예: 7일간 채소 섭취 거의 없어 식이섬유 보충 필요)",
        "variety": "다양성 근거 (예: 최근 한식을 안 먹었으므로 한식 추천)"
      },
      "deliveryKeyword": "배달앱 검색어"
    }
  ],
  "nutritionTip": "종합 영양 조언 1줄"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "한국 식단 영양사. 데이터 기반 근거를 명확히 제시하는 메뉴 추천. JSON만 응답.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 2500,
    });

    let result: any;
    try {
      const raw = (completion.choices[0]?.message?.content || "{}")
        .replace(/```json\n?|```/g, "")
        .trim();
      result = JSON.parse(raw);
    } catch {
      result = {
        mealType,
        analysis: { calorieSituation: "", weeklyPattern: "", nutritionGap: "" },
        recommendations: [],
        nutritionTip: "추천을 생성하지 못했습니다.",
      };
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
        weeklyAvgCal: weekAvgCal,
        weeklyOverDays: overDays,
        weeklyTopFoods: topFoods,
      },
    });
  } catch (error: any) {
    console.error("[meal-recommend]", error);
    return NextResponse.json(
      { error: "추천 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
