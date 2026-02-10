import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 나이스 알레르기 번호 → 알레르기명 매핑
// https://open.neis.go.kr 급식식단정보 기준
const NEIS_ALLERGEN_MAP: Record<string, string> = {
  "1": "난류",
  "2": "우유",
  "3": "메밀",
  "4": "땅콩",
  "5": "대두",
  "6": "밀",
  "7": "고등어",
  "8": "게",
  "9": "새우",
  "10": "돼지고기",
  "11": "복숭아",
  "12": "토마토",
  "13": "아황산류",
  "14": "호두",
  "15": "닭고기",
  "16": "쇠고기",
  "17": "오징어",
  "18": "조개류",
  "19": "잣",
}

interface ParsedMenuItem {
  name: string           // 메뉴명 (예: "닭살카레볶음")
  allergenNumbers: string[]  // 알레르기 번호 (예: ["2","5","6","13","15"])
  allergenNames: string[]    // 알레르기명 (예: ["우유","대두","밀","아황산류","닭고기"])
}

// "닭살카레볶음*2.5.6.13.15." 또는 "자장면 (1.5.6.10.13.16)" → { name, allergenNumbers, allergenNames }
function parseMenuItem(raw: string): ParsedMenuItem {
  const cleaned = raw.replace(/<br\s*\/?>/gi, "").trim()

  // 패턴1: 괄호 형태 "메뉴명 (숫자.숫자.숫자)" 또는 "메뉴명(숫자.숫자)"
  const parenMatch = cleaned.match(/^(.+?)\s*\(([\d]+(?:\.[\d]+)*\.?)\)\s*$/)
  if (parenMatch) {
    const name = parenMatch[1].replace(/\*$/, "").trim()
    const numbers = parenMatch[2].split(".").filter(n => n.trim() !== "")
    const names = numbers.map(n => NEIS_ALLERGEN_MAP[n] || `알수없음(${n})`).filter(Boolean)
    return { name, allergenNumbers: numbers, allergenNames: names }
  }

  // 패턴2: 붙어있는 형태 "메뉴명*숫자.숫자.숫자." 또는 "메뉴명숫자.숫자."
  const match = cleaned.match(/^(.+?)[\s*]*([\d]+(?:\.[\d]+)*\.?)$/)
  if (match) {
    const name = match[1].replace(/\*$/, "").trim()
    const numberStr = match[2]
    const numbers = numberStr.split(".").filter(n => n.trim() !== "")
    const names = numbers.map(n => NEIS_ALLERGEN_MAP[n] || `알수없음(${n})`).filter(Boolean)
    return { name, allergenNumbers: numbers, allergenNames: names }
  }

  return { name: cleaned, allergenNumbers: [], allergenNames: [] }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const schoolCode = searchParams.get("schoolCode") || ""
    const officeCode = searchParams.get("officeCode") || ""
    const date = searchParams.get("date") || ""  // YYYYMMDD

    if (!schoolCode || !officeCode) {
      return NextResponse.json({ error: "schoolCode와 officeCode가 필요합니다." }, { status: 400 })
    }

    // 날짜 기본값: 오늘
    const targetDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, "")

    const supabase = await createClient()

    // 1. 캐시 확인
    const { data: cached } = await supabase
      .from("school_meals_cache")
      .select("*")
      .eq("school_code", schoolCode)
      .eq("meal_date", targetDate)

    if (cached && cached.length > 0) {
      console.log("[Meals] Cache hit:", schoolCode, targetDate)

      // 사용자 알레르기 조회 후 매칭
      const meals = cached.map(c => ({
        mealType: c.meal_type,
        mealTypeName: c.meal_type === "1" ? "조식" : c.meal_type === "2" ? "중식" : "석식",
        menu: c.menu_json,
        calInfo: c.cal_info,
        ntrInfo: c.ntr_info,
        originInfo: c.origin_info,
      }))

      const matchedMeals = await matchUserAllergens(supabase, meals)
      return NextResponse.json({ meals: matchedMeals, date: targetDate, cached: true })
    }

    // 2. 나이스 API 호출
    const apiKey = process.env.NEIS_API_KEY || ""
    const url = new URL("https://open.neis.go.kr/hub/mealServiceDietInfo")
    url.searchParams.append("Type", "json")
    url.searchParams.append("pIndex", "1")
    url.searchParams.append("pSize", "10")
    url.searchParams.append("ATPT_OFCDC_SC_CODE", officeCode)
    url.searchParams.append("SD_SCHUL_CODE", schoolCode)
    url.searchParams.append("MLSV_YMD", targetDate)
    if (apiKey) {
      url.searchParams.append("KEY", apiKey)
    }

    console.log("[Meals] Fetching from NEIS:", schoolCode, targetDate)

    const res = await fetch(url.toString())
    const data = await res.json()

    const rows = data?.mealServiceDietInfo?.[1]?.row || []

    if (rows.length === 0) {
      return NextResponse.json({ meals: [], date: targetDate, message: "해당 날짜의 급식 정보가 없습니다." })
    }

    const meals = rows.map((r: Record<string, string>) => {
      const rawDish = r.DDISH_NM || ""
      const menuItems = rawDish.split(/<br\s*\/?>/gi).filter((s: string) => s.trim())
      const parsedMenu = menuItems.map(parseMenuItem)

      return {
        mealType: r.MMEAL_SC_CODE,
        mealTypeName: r.MMEAL_SC_NM,
        menu: parsedMenu,
        calInfo: r.CAL_INFO || "",
        ntrInfo: r.NTR_INFO || "",
        originInfo: r.ORPLC_INFO || "",
      }
    })

    // 3. 캐시 저장
    for (const meal of meals) {
      await supabase.from("school_meals_cache").upsert({
        school_code: schoolCode,
        meal_date: targetDate,
        meal_type: meal.mealType,
        menu_json: meal.menu,
        cal_info: meal.calInfo,
        ntr_info: meal.ntrInfo,
        origin_info: meal.originInfo,
      }, { onConflict: "school_code,meal_date,meal_type" })
    }

    // 4. 사용자 알레르기 매칭
    const matchedMeals = await matchUserAllergens(supabase, meals)

    return NextResponse.json({ meals: matchedMeals, date: targetDate, cached: false })
  } catch (error) {
    console.error("[Meals] Error:", error)
    return NextResponse.json({ error: "급식 정보 조회에 실패했습니다." }, { status: 500 })
  }
}

// 사용자 알레르기와 급식 메뉴 매칭
async function matchUserAllergens(supabase: any, meals: any[]) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // 비로그인: 알레르기 매칭 없이 반환
    return meals.map(meal => ({
      ...meal,
      menu: meal.menu.map((item: ParsedMenuItem) => ({
        ...item,
        status: "unknown" as const,
        matchedAllergens: [],
      })),
    }))
  }

  const { data: userAllergens } = await supabase
    .from("user_allergies")
    .select("allergen_name")
    .eq("user_id", user.id)

  const userAllergenNames = (userAllergens || []).map((a: { allergen_name: string }) => a.allergen_name)

  return meals.map(meal => ({
    ...meal,
    menu: meal.menu.map((item: ParsedMenuItem) => {
      const matched = item.allergenNames.filter(name =>
        userAllergenNames.some((ua: string) =>
          name.includes(ua) || ua.includes(name)
        )
      )
      return {
        ...item,
        status: matched.length > 0 ? "danger" : "safe",
        matchedAllergens: matched,
      }
    }),
  }))
}
