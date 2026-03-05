import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 나이스 학교 검색 API
// https://open.neis.go.kr/hub/schoolInfo
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q") || ""

    if (!query || query.length < 2) {
      return NextResponse.json({ schools: [], message: "검색어를 2글자 이상 입력하세요." })
    }

    // Rate limit 체크
    const headersList = req.headers
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown"

    const rateLimitKey = `school:ip:${ipAddress}`
    const now = new Date()
    const windowStart = new Date(now.getTime() - 60 * 1000)

    const supabaseForRate = await createClient()
    const { count: recentCount } = await supabaseForRate
      .from("restaurant_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", rateLimitKey)
      .gte("searched_at", windowStart.toISOString())

    if ((recentCount || 0) >= 20) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": "60" } },
      )
    }

    // 비동기로 기록 (응답 대기 안 함)
    supabaseForRate
      .from("restaurant_rate_limits")
      .insert({ identifier: rateLimitKey, searched_at: now.toISOString() })
      .then(({ error }) => {
        if (error) console.error("rate limit 기록 실패:", error)
      })

    const apiKey = process.env.NEIS_API_KEY || ""
    const url = new URL("https://open.neis.go.kr/hub/schoolInfo")
    url.searchParams.append("Type", "json")
    url.searchParams.append("pIndex", "1")
    url.searchParams.append("pSize", "20")
    url.searchParams.append("SCHUL_NM", query)
    if (apiKey) {
      url.searchParams.append("KEY", apiKey)
    }

    console.log("[School Search] query:", query)

    const res = await fetch(url.toString())
    const data = await res.json()

    // 나이스 API 응답 구조: { schoolInfo: [{ head: [...] }, { row: [...] }] }
    const rows = data?.schoolInfo?.[1]?.row || []

    const schools = rows.map((r: Record<string, string>) => ({
      schoolCode: r.SD_SCHUL_CODE,    // 표준학교코드
      officeCode: r.ATPT_OFCDC_SC_CODE, // 시도교육청코드
      officeName: r.ATPT_OFCDC_SC_NM,   // 시도교육청명
      schoolName: r.SCHUL_NM,          // 학교명
      schoolType: r.SCHUL_KND_SC_NM,   // 학교종류 (초등학교/중학교/고등학교)
      address: r.ORG_RDNMA,            // 도로명주소
      phone: r.ORG_TELNO,              // 전화번호
    }))

    return NextResponse.json({ schools })
  } catch (error) {
    console.error("[School Search] Error:", error)
    return NextResponse.json({ schools: [], error: "학교 검색에 실패했습니다." }, { status: 500 })
  }
}
