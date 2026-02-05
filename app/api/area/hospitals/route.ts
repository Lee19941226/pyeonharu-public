import { NextRequest, NextResponse } from "next/server"

// 지역코드 기반 병원 검색 API
// GET /api/area/hospitals?sidoCd=110000&pageNo=1&numOfRows=30

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sidoCd = searchParams.get("sidoCd")
  const pageNo = searchParams.get("pageNo") || "1"
  const numOfRows = searchParams.get("numOfRows") || "30"

  if (!sidoCd) {
    return NextResponse.json({ error: "sidoCd(시도코드)가 필요합니다." }, { status: 400 })
  }

  try {
    const serviceKey = process.env.DATA_GO_KR_API_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 })
    }

    const url = `http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?serviceKey=${serviceKey}&pageNo=${pageNo}&numOfRows=${numOfRows}&sidoCd=${sidoCd}`

    const response = await fetch(url)
    const text = await response.text()

    // XML 파싱
    const totalCountMatch = text.match(/<totalCount>(\d+)<\/totalCount>/)
    const totalCount = totalCountMatch ? parseInt(totalCountMatch[1]) : 0

    const hospitals: any[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1]
      
      const getValue = (tag: string) => {
        const m = item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
        return m ? m[1].trim() : ""
      }

      const hospital = {
        id: getValue("ykiho"),
        name: getValue("yadmNm"),
        address: getValue("addr"),
        phone: getValue("telno"),
        sidoCdNm: getValue("sidoCdNm"),
        sgguCdNm: getValue("sgguCdNm"),
        emdongNm: getValue("emdongNm"),
        clCdNm: getValue("clCdNm"),
        lat: parseFloat(getValue("YPos")) || 0,
        lng: parseFloat(getValue("XPos")) || 0,
        drTotCnt: parseInt(getValue("drTotCnt")) || 0,
      }

      if (hospital.name) {
        hospitals.push(hospital)
      }
    }

    return NextResponse.json({
      success: true,
      totalCount,
      pageNo: parseInt(pageNo),
      numOfRows: parseInt(numOfRows),
      hospitals,
    })
  } catch (error) {
    console.error("[Area Hospitals API] Error:", error)
    return NextResponse.json({ error: "병원 정보를 가져오는 중 오류가 발생했습니다." }, { status: 500 })
  }
}
