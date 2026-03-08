import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isPyeonharuSchool, getSchoolForDate, SAMPLE_SCHOOLS_COUNT } from "@/lib/constants/pyeonharu-school"

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
const CROSS_CONTAMINATION_MAP: Record<string, string[]> = {
  "계란": ["닭고기"],
  "우유": ["쇠고기"],
  "게": ["새우", "조개류"],
  "새우": ["게", "조개류"],
  "조개류": ["게", "새우"],
  "땅콩": ["대두", "호두", "잣"],
  "호두": ["땅콩", "잣"],
  "잣": ["땅콩", "호두"],
  "대두": ["땅콩"],
  "밀": ["메밀"],
  "고등어": ["오징어"],
  "오징어": ["고등어"],
}

interface ParsedMenuItem {
  name: string
  allergenNumbers: string[]
  allergenNames: string[]
}

type CheckedMember =
  | { type: "unknown" }
  | { type: "self" }
  | { type: "member"; memberId: string; name: string; relation: string; avatarEmoji: string }

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
    const memberId = searchParams.get("memberId") || null

    if (!schoolCode || !officeCode) {
      return NextResponse.json({ error: "schoolCode와 officeCode가 필요합니다." }, { status: 400 })
    }

    const targetDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, "")

    // ── 편하루 고등학교: 날짜 기반 실제 학교로 매핑 ──
    const isPyeonharu = isPyeonharuSchool(schoolCode, officeCode)
    let actualSchoolCode = schoolCode
    let actualOfficeCode = officeCode
    if (isPyeonharu) {
      const realSchool = getSchoolForDate(targetDate)
      actualSchoolCode = realSchool.schoolCode
      actualOfficeCode = realSchool.officeCode
    }

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
    const { data: { user } } = await supabase.auth.getUser()

    // ── memberId 소유권 검증 및 checkedMember 구성 ──────────────────
    let checkedMember: CheckedMember = { type: "unknown" }

    if (user && !isPyeonharu) {
      if (memberId) {
        const { data: member } = await supabase
          .from("family_members")
          .select("id, name, relation, avatar_emoji")
          .eq("id", memberId)
          .eq("owner_id", user.id)
          .maybeSingle()

        if (!member) {
          return NextResponse.json({ error: "유효하지 않은 가족 구성원입니다." }, { status: 403 })
        }

        checkedMember = {
          type: "member",
          memberId: member.id,
          name: member.name,
          relation: member.relation,
          avatarEmoji: member.avatar_emoji,
        }
      } else {
        checkedMember = { type: "self" }
      }
    }

    // ── 이번 주 모드 ─────────────────────────────────────────────────
    if (mode === "week") {
      const weekDates = getWeekDates(targetDate)
      // 알레르기 1회만 조회 후 날짜 루프에서 재사용
      const allergenNames = isPyeonharu ? [] : await fetchAllergenNames(supabase, user, memberId)

      const weekMeals = await Promise.all(
        weekDates.map(d => fetchMealsForDate(supabase, actualSchoolCode, actualOfficeCode, d))
      )

      const weekResults = weekDates.map((d, i) => ({
        date: d,
        meals: matchAllergens(weekMeals[i], allergenNames),
      }))

      return NextResponse.json({ week: weekResults, baseDate: targetDate, checkedMember })
    }

    // ── 월간 모드 (1회 요청으로 한 달치 일괄 조회) ──────────────────
    if (mode === "month") {
      const y = Number(targetDate.slice(0, 4))
      const m = Number(targetDate.slice(4, 6))
      const daysInMonth = new Date(y, m, 0).getDate()

      // 1. DB 캐시에서 해당 월 전체 조회 (1회 쿼리)
      const monthStart = `${targetDate.slice(0, 6)}01`
      const monthEnd = `${targetDate.slice(0, 6)}${String(daysInMonth).padStart(2, "0")}`
      const { data: cachedAll } = await supabase
        .from("school_meals_cache")
        .select("*")
        .eq("school_code", actualSchoolCode)
        .gte("meal_date", monthStart)
        .lte("meal_date", monthEnd)

      // 캐시된 날짜 Set
      const cachedDates = new Set<string>()
      const cacheMap: Record<string, any[]> = {}
      if (cachedAll) {
        for (const c of cachedAll) {
          cachedDates.add(c.meal_date)
          if (!cacheMap[c.meal_date]) cacheMap[c.meal_date] = []
          cacheMap[c.meal_date].push({
            mealType: c.meal_type,
            mealTypeName: c.meal_type === "1" ? "조식" : c.meal_type === "2" ? "중식" : "석식",
            menu: c.menu_json,
            calInfo: c.cal_info,
            ntrInfo: c.ntr_info,
            originInfo: c.origin_info,
          })
        }
      }

      // 2. 캐시 미스 날짜만 나이스 API 호출
      const missingDates: string[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetDate.slice(0, 6)}${String(d).padStart(2, "0")}`
        if (!cachedDates.has(dateStr)) missingDates.push(dateStr)
      }

      // 나이스 API는 날짜 범위 조회 지원 → 1회 호출로 미스 전체 커버
      if (missingDates.length > 0) {
        const apiKey = process.env.NEIS_API_KEY || ""
        const url = new URL("https://open.neis.go.kr/hub/mealServiceDietInfo")
        url.searchParams.append("Type", "json")
        url.searchParams.append("pIndex", "1")
        url.searchParams.append("pSize", "100")
        url.searchParams.append("ATPT_OFCDC_SC_CODE", actualOfficeCode)
        url.searchParams.append("SD_SCHUL_CODE", actualSchoolCode)
        url.searchParams.append("MLSV_FROM_YMD", monthStart)
        url.searchParams.append("MLSV_TO_YMD", monthEnd)
        if (apiKey) url.searchParams.append("KEY", apiKey)

        try {
          const res = await fetch(url.toString())
          const data = await res.json()
          const rows = data?.mealServiceDietInfo?.[1]?.row || []

          for (const r of rows) {
            const mealDate = r.MLSV_YMD
            if (cachedDates.has(mealDate)) continue

            const rawDish = r.DDISH_NM || ""
            const menuItems = rawDish.split(/<br\s*\/?>/gi).filter((s: string) => s.trim())
            const parsedMenu = menuItems.map(parseMenuItem)

            const meal = {
              mealType: r.MMEAL_SC_CODE,
              mealTypeName: r.MMEAL_SC_NM,
              menu: parsedMenu,
              calInfo: r.CAL_INFO || "",
              ntrInfo: r.NTR_INFO || "",
              originInfo: r.ORPLC_INFO || "",
            }

            if (!cacheMap[mealDate]) cacheMap[mealDate] = []
            cacheMap[mealDate].push(meal)

            // 캐시 저장 (비동기)
            supabase.from("school_meals_cache").upsert({
              school_code: actualSchoolCode,
              meal_date: mealDate,
              meal_type: meal.mealType,
              menu_json: meal.menu,
              cal_info: meal.calInfo,
              ntr_info: meal.ntrInfo,
              origin_info: meal.originInfo,
            }, { onConflict: "school_code,meal_date,meal_type" }).then(() => {})
          }
        } catch (e) {
          console.error("[Meals] Month NEIS fetch error:", e)
        }
      }

      // 3. 알레르기 매칭 + 결과 조립
      // 알레르기 1회만 조회 후 날짜 루프에서 재사용
      const allergenNames = isPyeonharu ? [] : await fetchAllergenNames(supabase, user, memberId)
      const monthResults: { date: string; meals: any[] }[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetDate.slice(0, 6)}${String(d).padStart(2, "0")}`
        const dayMeals = cacheMap[dateStr] || []
        if (dayMeals.length > 0) {
          const matched = matchAllergens(dayMeals, allergenNames)
          monthResults.push({ date: dateStr, meals: matched })
        }
      }

      return NextResponse.json({ month: monthResults, baseDate: targetDate, checkedMember })
    }

    // ── 단일 날짜 모드 ───────────────────────────────────────────────
    if (isPyeonharu) {
      // 편하루: 모든 학교 시도 → 없으면 과거 날짜로 최대 30일 전까지 탐색
      const result = await fetchPyeonharuMeals(supabase, targetDate)
      if (result) {
        const matchedMeals = matchAllergens(result.meals, [])
        return NextResponse.json({
          meals: matchedMeals,
          date: targetDate,
          actualDate: result.actualDate,
          cached: result.cached,
          checkedMember,
        })
      }
      // 30일 전까지 전부 없음 (거의 불가능)
      return NextResponse.json({
        meals: [],
        date: targetDate,
        message: "급식 정보를 찾을 수 없습니다.",
        checkedMember,
      })
    }

    // ── 일반 학교 단일 날짜 ──────────────────────────────────────────
    // 1. 캐시 확인
    const { data: cached } = await supabase
      .from("school_meals_cache")
      .select("*")
      .eq("school_code", actualSchoolCode)
      .eq("meal_date", targetDate)

    if (cached && cached.length > 0) {
      console.log("[Meals] Cache hit:", actualSchoolCode, targetDate)

      const meals = cached.map((c: any) => ({
        mealType: c.meal_type,
        mealTypeName: c.meal_type === "1" ? "조식" : c.meal_type === "2" ? "중식" : "석식",
        menu: c.menu_json,
        calInfo: c.cal_info,
        ntrInfo: c.ntr_info,
        originInfo: c.origin_info,
      }))

      const allergenNames = await fetchAllergenNames(supabase, user, memberId)
      const matchedMeals = matchAllergens(meals, allergenNames)
      return NextResponse.json({ meals: matchedMeals, date: targetDate, cached: true, checkedMember })
    }

    // 2. 나이스 API 호출
    const meals = await fetchFromNeis(actualSchoolCode, actualOfficeCode, targetDate)

    if (meals.length === 0) {
      return NextResponse.json({
        meals: [],
        date: targetDate,
        message: "해당 날짜의 급식 정보가 없습니다.",
        checkedMember,
      })
    }

    // 3. 캐시 저장 (병렬)
    await Promise.all(
      meals.map((meal: any) =>
        supabase.from("school_meals_cache").upsert({
          school_code: actualSchoolCode,
          meal_date: targetDate,
          meal_type: meal.mealType,
          menu_json: meal.menu,
          cal_info: meal.calInfo,
          ntr_info: meal.ntrInfo,
          origin_info: meal.originInfo,
        }, { onConflict: "school_code,meal_date,meal_type" })
      )
    );

    // 4. 알레르기 매칭
    const allergenNames = await fetchAllergenNames(supabase, user, memberId)
    const matchedMeals = matchAllergens(meals, allergenNames)

    return NextResponse.json({ meals: matchedMeals, date: targetDate, cached: false, checkedMember })
  } catch (error) {
    console.error("[Meals] Error:", error)
    return NextResponse.json({ error: "급식 정보 조회에 실패했습니다." }, { status: 500 })
  }
}

// ── 편하루 급식 탐색: 모든 학교 × 과거 날짜 폴백 ─────────────────────
async function fetchPyeonharuMeals(supabase: any, targetDate: string) {
  const y = Number(targetDate.slice(0, 4))
  const m = Number(targetDate.slice(4, 6)) - 1
  const d = Number(targetDate.slice(6, 8))
  const baseDate = new Date(y, m, d)

  // 오늘 → 최대 30일 전까지 탐색
  for (let dayBack = 0; dayBack <= 30; dayBack++) {
    const tryDate = new Date(baseDate)
    tryDate.setDate(tryDate.getDate() - dayBack)
    const dateStr = `${tryDate.getFullYear()}${String(tryDate.getMonth() + 1).padStart(2, "0")}${String(tryDate.getDate()).padStart(2, "0")}`

    // 이 날짜에 대해 모든 학교 시도
    for (let offset = 0; offset < SAMPLE_SCHOOLS_COUNT; offset++) {
      const school = getSchoolForDate(dateStr, offset)

      // 캐시 먼저
      const { data: cached } = await supabase
        .from("school_meals_cache")
        .select("*")
        .eq("school_code", school.schoolCode)
        .eq("meal_date", dateStr)

      if (cached && cached.length > 0) {
        return {
          meals: cached.map((c: any) => ({
            mealType: c.meal_type,
            mealTypeName: c.meal_type === "1" ? "조식" : c.meal_type === "2" ? "중식" : "석식",
            menu: c.menu_json,
            calInfo: c.cal_info,
            ntrInfo: c.ntr_info,
            originInfo: c.origin_info,
          })),
          actualDate: dateStr,
          cached: true,
        }
      }

      // NEIS API
      try {
        const meals = await fetchFromNeis(school.schoolCode, school.officeCode, dateStr)
        if (meals.length > 0) {
          // 캐시 저장
          for (const meal of meals) {
            supabase.from("school_meals_cache").upsert({
              school_code: school.schoolCode,
              meal_date: dateStr,
              meal_type: meal.mealType,
              menu_json: meal.menu,
              cal_info: meal.calInfo,
              ntr_info: meal.ntrInfo,
              origin_info: meal.originInfo,
            }, { onConflict: "school_code,meal_date,meal_type" }).then(() => {})
          }
          return { meals, actualDate: dateStr, cached: false }
        }
      } catch {
        // 이 학교 실패 → 다음 학교
        continue
      }
    }
  }

  return null
}

// ── 나이스 API에서 급식 데이터 가져오기 ──────────────────────────────
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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  let res: Response
  try {
    res = await fetch(url.toString(), { signal: controller.signal })
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError"
    console.error("[Meals] NEIS fetch 실패:", isTimeout ? "타임아웃(10s)" : err?.message)
    throw new Error("급식 정보를 불러오지 못했습니다.")
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    console.error("[Meals] NEIS HTTP 오류:", res.status, res.statusText)
    throw new Error("급식 정보를 불러오지 못했습니다.")
  }

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

// ── 특정 날짜의 급식 가져오기 (캐시 → 나이스 API) ────────────────────
async function fetchMealsForDate(supabase: any, schoolCode: string, officeCode: string, targetDate: string) {
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

  const meals = await fetchFromNeis(schoolCode, officeCode, targetDate)

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

// ── 이번 주 월~금 날짜 배열 계산 ─────────────────────────────────────
function getWeekDates(baseDate: string): string[] {
  const y = Number(baseDate.slice(0, 4))
  const m = Number(baseDate.slice(4, 6)) - 1
  const d = Number(baseDate.slice(6, 8))
  const date = new Date(y, m, d)
  const dayOfWeek = date.getDay()

  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(y, m, d + mondayOffset)

  const dates: string[] = []
  for (let i = 0; i < 5; i++) {
    const target = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const ty = target.getFullYear()
    const tm = String(target.getMonth() + 1).padStart(2, "0")
    const td = String(target.getDate()).padStart(2, "0")
    dates.push(`${ty}${tm}${td}`)
  }

  return dates
}

// ── 알레르기 목록 조회 (1회만 호출, 루프 밖에서 재사용) ──────────────
// memberId 없음 → user_allergies (본인)
// memberId 있음 → family_member_allergies (해당 구성원)
async function fetchAllergenNames(
  supabase: any,
  user: any,
  memberId: string | null,
): Promise<string[]> {
  if (!user) return []

  if (memberId) {
    const { data } = await supabase
      .from("family_member_allergies")
      .select("allergen_name")
      .eq("member_id", memberId)

    return (data || []).map((a: { allergen_name: string }) => a.allergen_name)
  } else {
    const { data } = await supabase
      .from("user_allergies")
      .select("allergen_name")
      .eq("user_id", user.id)

    return (data || []).map((a: { allergen_name: string }) => a.allergen_name)
  }
}

// ── 알레르기 매칭 핵심 로직 (동기, allergenNames를 직접 받아 재사용) ──
function matchAllergens(meals: any[], allergenNames: string[]) {
  if (allergenNames.length === 0) {
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

  // 교차오염 대상 목록 생성
  const crossTargets: Set<string> = new Set()
  for (const ua of allergenNames) {
    const crossList = CROSS_CONTAMINATION_MAP[ua]
    if (crossList) {
      for (const cross of crossList) {
        if (!allergenNames.some((n: string) => n.includes(cross) || cross.includes(n))) {
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
        allergenNames.some((ua: string) =>
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
