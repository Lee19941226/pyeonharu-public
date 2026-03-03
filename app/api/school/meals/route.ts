import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 나이스 알레르기 번호 → 알레르기명 매핑
const NEIS_ALLERGEN_MAP: Record<string, string> = {
  "1": "계란",
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

// 교차오염 가능성 매핑
// key: 사용자 알레르기, value: 교차오염 가능성이 있는 알레르기 성분들
const CROSS_CONTAMINATION_MAP: Record<string, string[]> = {
  "계란": ["닭고기"],           // 계란 알레르기 → 닭고기 교차반응
  "우유": ["쇠고기"],           // 우유 알레르기 → 쇠고기 교차반응
  "게": ["새우", "조개류"],      // 갑각류 교차반응
  "새우": ["게", "조개류"],      // 갑각류 교차반응
  "조개류": ["게", "새우"],      // 갑각류 교차반응
  "땅콩": ["대두", "호두", "잣"], // 견과류/콩류 교차반응
  "호두": ["땅콩", "잣"],        // 견과류 교차반응
  "잣": ["땅콩", "호두"],        // 견과류 교차반응
  "대두": ["땅콩"],             // 콩류 교차반응
  "밀": ["메밀"],               // 곡류 교차반응 (글루텐 관련)
  "고등어": ["오징어"],          // 해산물 교차반응
  "오징어": ["고등어"],          // 해산물 교차반응
}

interface ParsedMenuItem {
  name: string
  allergenNumbers: string[]
  allergenNames: string[]
}

// "닭살카레볶음*2.5.6.13.15." → { name, allergenNumbers, allergenNames }
function parseMenuItem(raw: string): ParsedMenuItem {
  const cleaned = raw.replace(/<br\s*\/?>/gi, "").trim()

  // 패턴1: 괄호 형태 "메뉴명 (숫자.숫자.숫자)"
  const parenMatch = cleaned.match(/^(.+?)\s*\(([\d]+(?:\.[\d]+)*\.?)\)\s*$/)
  if (parenMatch) {
    const name = parenMatch[1].replace(/\*$/, "").trim()
    const numbers = parenMatch[2].split(".").filter(n => n.trim() !== "")
    const names = numbers.map(n => NEIS_ALLERGEN_MAP[n] || `알수없음(${n})`).filter(Boolean)
    return { name, allergenNumbers: numbers, allergenNames: names }
  }

  // 패턴2: 붙어있는 형태 "메뉴명*숫자.숫자.숫자."
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
    const mode = searchParams.get("mode") || "day" // "day" | "week"

    if (!schoolCode || !officeCode) {
      return NextResponse.json({ error: "schoolCode와 officeCode가 필요합니다." }, { status: 400 })
    }

    const targetDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, "")

    if (date) {
      if (!/^\d{8}$/.test(date)) {
        return NextResponse.json(
          { error: "date 파라미터는 YYYYMMDD 형식의 8자리 숫자여야 합니다." },
          { status: 400 },
        )
      }
      const y = Number(date.slice(0, 4))
      const m = Number(date.slice(4, 6))
      const d = Number(date.slice(6, 8))
      const parsed = new Date(y, m - 1, d)
      if (
        parsed.getFullYear() !== y ||
        parsed.getMonth() + 1 !== m ||
        parsed.getDate() !== d
      ) {
        return NextResponse.json(
          { error: "유효하지 않은 날짜입니다." },
          { status: 400 },
        )
      }
    }

    const supabase = await createClient()

    // 이번 주 모드: 월~금 날짜 계산
    if (mode === "week") {
      const weekDates = getWeekDates(targetDate)
      const weekResults: { date: string; meals: any[] }[] = []

      for (const d of weekDates) {
        const dayMeals = await fetchMealsForDate(supabase, schoolCode, officeCode, d)
        const matched = await matchUserAllergens(supabase, dayMeals)
        weekResults.push({ date: d, meals: matched })
      }

      return NextResponse.json({ week: weekResults, baseDate: targetDate })
    }

    // 단일 날짜 모드 (기존)
    // 1. 캐시 확인
    const { data: cached } = await supabase
      .from("school_meals_cache")
      .select("*")
      .eq("school_code", schoolCode)
      .eq("meal_date", targetDate)

    if (cached && cached.length > 0) {
      console.log("[Meals] Cache hit:", schoolCode, targetDate)

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
    const meals = await fetchFromNeis(schoolCode, officeCode, targetDate)

    if (meals.length === 0) {
      return NextResponse.json({ meals: [], date: targetDate, message: "해당 날짜의 급식 정보가 없습니다." })
    }

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

// 나이스 API에서 급식 데이터 가져오기
async function fetchFromNeis(schoolCode: string, officeCode: string, targetDate: string) {
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

  return rows.map((r: Record<string, string>) => {
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
}

// 특정 날짜의 급식 가져오기 (캐시 → 나이스 API)
async function fetchMealsForDate(supabase: any, schoolCode: string, officeCode: string, targetDate: string) {
  // 캐시 확인
  const { data: cached } = await supabase
    .from("school_meals_cache")
    .select("*")
    .eq("school_code", schoolCode)
    .eq("meal_date", targetDate)

  if (cached && cached.length > 0) {
    return cached.map((c: any) => ({
      mealType: c.meal_type,
      mealTypeName: c.meal_type === "1" ? "조식" : c.meal_type === "2" ? "중식" : "석식",
      menu: c.menu_json,
      calInfo: c.cal_info,
      ntrInfo: c.ntr_info,
      originInfo: c.origin_info,
    }))
  }

  // 나이스 API
  const meals = await fetchFromNeis(schoolCode, officeCode, targetDate)

  // 캐시 저장
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

  return meals
}

// 이번 주 월~금 날짜 배열 계산
function getWeekDates(baseDate: string): string[] {
  const y = Number(baseDate.slice(0, 4))
  const m = Number(baseDate.slice(4, 6)) - 1
  const d = Number(baseDate.slice(6, 8))
  const date = new Date(y, m, d)
  const dayOfWeek = date.getDay() // 0=일, 1=월, ..., 6=토

  // 월요일 찾기
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(y, m, d + mondayOffset)

  const dates: string[] = []
  for (let i = 0; i < 5; i++) { // 월~금
    const target = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const ty = target.getFullYear()
    const tm = String(target.getMonth() + 1).padStart(2, "0")
    const td = String(target.getDate()).padStart(2, "0")
    dates.push(`${ty}${tm}${td}`)
  }

  return dates
}

// 사용자 알레르기와 급식 메뉴 매칭 (교차오염 포함)
async function matchUserAllergens(supabase: any, meals: any[]) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return meals.map(meal => ({
      ...meal,
      menu: meal.menu.map((item: ParsedMenuItem) => ({
        ...item,
        status: "unknown" as const,
        matchedAllergens: [],
        crossAllergens: [],
      })),
    }))
  }

  const { data: userAllergens } = await supabase
    .from("user_allergies")
    .select("allergen_name")
    .eq("user_id", user.id)

  const userAllergenNames = (userAllergens || []).map((a: { allergen_name: string }) => a.allergen_name)

  // 사용자 알레르기 기반 교차오염 대상 목록 생성
  const crossTargets: Set<string> = new Set()
  for (const ua of userAllergenNames) {
    const crossList = CROSS_CONTAMINATION_MAP[ua]
    if (crossList) {
      for (const cross of crossList) {
        // 이미 직접 알레르기인 것은 제외 (danger로 잡히므로)
        if (!userAllergenNames.some((n: string) => n.includes(cross) || cross.includes(n))) {
          crossTargets.add(cross)
        }
      }
    }
  }

  return meals.map(meal => ({
    ...meal,
    menu: meal.menu.map((item: ParsedMenuItem) => {
      // 1. 직접 매칭 (danger)
      const matched = item.allergenNames.filter(name =>
        userAllergenNames.some((ua: string) =>
          name.includes(ua) || ua.includes(name)
        )
      )

      if (matched.length > 0) {
        return {
          ...item,
          status: "danger" as const,
          matchedAllergens: matched,
          crossAllergens: [],
        }
      }

      // 2. 교차오염 매칭 (caution)
      const crossMatched = item.allergenNames.filter(name =>
        Array.from(crossTargets).some((ct: string) =>
          name.includes(ct) || ct.includes(name)
        )
      )

      if (crossMatched.length > 0) {
        return {
          ...item,
          status: "caution" as const,
          matchedAllergens: [],
          crossAllergens: crossMatched,
        }
      }

      // 3. 안전
      return {
        ...item,
        status: "safe" as const,
        matchedAllergens: [],
        crossAllergens: [],
      }
    }),
  }))
}
