import { NextRequest, NextResponse } from "next/server"

// ?섏씠???숆탳 寃??API
// https://open.neis.go.kr/hub/schoolInfo
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q") || ""

    if (!query || query.length < 2) {
      return NextResponse.json({ schools: [], message: "寃?됱뼱瑜?2湲???댁긽 ?낅젰?섏꽭??" })
    }

    const apiKey = process.env.NEIS_API_KEY || ""
    const url = new URL("https://open.neis.go.kr/hub/schoolInfo")
    url.searchParams.append("Type", "json")
    url.searchParams.append("pIndex", "1")
    url.searchParams.append("pSize", "20")
    url.searchParams.append("SCHUL_NM", query)
    if (apiKey) {
      url.searchParams.append("KEY", apiKey)
    }


    const res = await fetch(url.toString())
    const data = await res.json()

    // ?섏씠??API ?묐떟 援ъ“: { schoolInfo: [{ head: [...] }, { row: [...] }] }
    const rows = data?.schoolInfo?.[1]?.row || []

    const schools = rows.map((r: Record<string, string>) => ({
      schoolCode: r.SD_SCHUL_CODE,    // ?쒖??숆탳肄붾뱶
      officeCode: r.ATPT_OFCDC_SC_CODE, // ?쒕룄援먯쑁泥?퐫??      officeName: r.ATPT_OFCDC_SC_NM,   // ?쒕룄援먯쑁泥?챸
      schoolName: r.SCHUL_NM,          // ?숆탳紐?      schoolType: r.SCHUL_KND_SC_NM,   // ?숆탳醫낅쪟 (珥덈벑?숆탳/以묓븰援?怨좊벑?숆탳)
      address: r.ORG_RDNMA,            // ?꾨줈紐낆＜??      phone: r.ORG_TELNO,              // ?꾪솕踰덊샇
    }))

    return NextResponse.json({ schools })
  } catch (error) {
    console.error("[School Search] Error:", error)
    return NextResponse.json({ schools: [], error: "?숆탳 寃?됱뿉 ?ㅽ뙣?덉뒿?덈떎." }, { status: 500 })
  }
}
