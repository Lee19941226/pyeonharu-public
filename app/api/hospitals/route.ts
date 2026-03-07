import { NextRequest, NextResponse } from "next/server"

// ─── 위경도 → 시도코드 매핑 ───
// HIRA API는 위경도 직접 검색을 지원하지 않으므로
// 위경도로부터 가장 가까운 시도를 추정하여 검색합니다
const SIDO_CENTERS: Record<string, { lat: number; lng: number; code: string }> = {
  서울: { lat: 37.5665, lng: 126.978, code: "110000" },
  부산: { lat: 35.1796, lng: 129.0756, code: "210000" },
  대구: { lat: 35.8714, lng: 128.6014, code: "220000" },
  인천: { lat: 37.4563, lng: 126.7052, code: "230000" },
  광주: { lat: 35.1595, lng: 126.8526, code: "240000" },
  대전: { lat: 36.3504, lng: 127.3845, code: "250000" },
  울산: { lat: 35.5384, lng: 129.3114, code: "260000" },
  세종: { lat: 36.48, lng: 127.259, code: "290000" },
  경기: { lat: 37.275, lng: 127.0094, code: "310000" },
  강원: { lat: 37.8228, lng: 128.1555, code: "320000" },
  충북: { lat: 36.6357, lng: 127.4913, code: "330000" },
  충남: { lat: 36.6588, lng: 126.6728, code: "340000" },
  전북: { lat: 35.8203, lng: 127.1088, code: "350000" },
  전남: { lat: 34.8161, lng: 126.4629, code: "360000" },
  경북: { lat: 36.576, lng: 128.506, code: "370000" },
  경남: { lat: 35.2384, lng: 128.6924, code: "380000" },
  제주: { lat: 33.4996, lng: 126.5312, code: "390000" },
}

function getSidoCdByLocation(lat: number, lng: number): string[] {
  // 거리순으로 정렬 → 가장 가까운 2개 시도 반환 (경계 지역 커버)
  const sorted = Object.entries(SIDO_CENTERS)
    .map(([name, center]) => ({
      name,
      code: center.code,
      dist: Math.sqrt(Math.pow(lat - center.lat, 2) + Math.pow(lng - center.lng, 2)),
    }))
    .sort((a, b) => a.dist - b.dist)

  // 첫 번째 시도만 사용 (API 호출 최소화)
  // 경계 지역에서 누락되면 2개까지 확장 가능
  return [sorted[0].code]
}

// ─── Haversine 거리 계산 (km) ───
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── XML 파싱 헬퍼 ───
function getXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return match ? match[1].trim() : ""
}

// ─── GET /api/hospitals ───
// 파라미터: lat, lng, radius(m), department, numOfRows
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get("lat") ?? "")
  const lng = parseFloat(searchParams.get("lng") ?? "")
  const radiusM = parseInt(searchParams.get("radius") || "3000")
  const department = searchParams.get("department") || ""
  const numOfRows = searchParams.get("numOfRows") || "1000"

  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    return NextResponse.json(
      { error: "lat, lng 파라미터가 필요합니다." },
      { status: 400 }
    )
  }
  if (isNaN(radiusM) || radiusM < 100 || radiusM > 5000) {
    return NextResponse.json(
      { error: "radius는 100~5000m 범위여야 합니다." },
      { status: 400 }
    )
  }

  try {
    const serviceKey = process.env.DATA_GO_KR_API_KEY
    if (!serviceKey) {
      return NextResponse.json(
        { error: "API 키가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    // 1) 위경도 → 시도코드
    const sidoCodes = getSidoCdByLocation(lat, lng)
    const radiusKm = radiusM / 1000

    const allHospitals: any[] = []

    // 2) 각 시도에 대해 API 호출
    for (const sidoCd of sidoCodes) {
      const url = `https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?serviceKey=${serviceKey}&numOfRows=${numOfRows}&pageNo=1&sidoCd=${sidoCd}`

      console.log(`[Hospitals API] Fetching sidoCd=${sidoCd}...`)
      const response = await fetch(url)
      const text = await response.text()

      // XML 에러 체크
      if (text.includes("<returnReasonCode>")) {
        const errCode = getXmlValue(text, "returnReasonCode")
        const errMsg = getXmlValue(text, "returnAuthMsg")
        console.error(`[Hospitals API] Error: ${errCode} - ${errMsg}`)
        continue
      }

      // XML 파싱
      const itemRegex = /<item>([\s\S]*?)<\/item>/g
      let match
      while ((match = itemRegex.exec(text)) !== null) {
        const item = match[1]

        // ★ HIRA API 좌표: YPos=위도, XPos=경도
        const hLat = parseFloat(getXmlValue(item, "YPos")) || 0
        const hLng = parseFloat(getXmlValue(item, "XPos")) || 0

        // 좌표 없으면 스킵
        if (!hLat || !hLng) continue

        // 3) 거리 필터링
        const dist = haversine(lat, lng, hLat, hLng)
        if (dist > radiusKm) continue

        const name = getXmlValue(item, "yadmNm")
        const clCdNm = getXmlValue(item, "clCdNm") // 종별코드명 (의원, 병원, 종합병원 등)

        if (!name) continue

        allHospitals.push({
          id: getXmlValue(item, "ykiho"),
          name,
          address: getXmlValue(item, "addr"),
          phone: getXmlValue(item, "telno"),
          clCdNm,
          sidoCdNm: getXmlValue(item, "sidoCdNm"),
          sgguCdNm: getXmlValue(item, "sgguCdNm"),
          emdongNm: getXmlValue(item, "emdongNm"),
          department: clCdNm, // 진료과 표시용
          lat: hLat,
          lng: hLng,
          distance: `${dist < 1 ? Math.round(dist * 1000) + "m" : dist.toFixed(1) + "km"}`,
          distanceNum: dist,
          drTotCnt: parseInt(getXmlValue(item, "drTotCnt")) || 0,
          isAiRecommended: false,
        })
      }
    }

    // 4) 거리순 정렬
    allHospitals.sort((a, b) => a.distanceNum - b.distanceNum)

    // 5) department 키워드 매칭 (AI 분석 결과에서 추천 시)
    if (department) {
      // 진료과 키워드로 AI 추천 마킹
      const deptLower = department.toLowerCase()
      allHospitals.forEach((h) => {
        const clLower = (h.clCdNm || "").toLowerCase()
        if (
          clLower.includes(deptLower) ||
          deptLower.includes("이비인후") && clLower.includes("이비인후") ||
          deptLower.includes("내과") && clLower.includes("내과") ||
          deptLower.includes("정형") && clLower.includes("정형") ||
          deptLower.includes("피부") && clLower.includes("피부") ||
          deptLower.includes("소아") && clLower.includes("소아") ||
          deptLower.includes("안과") && clLower.includes("안과") ||
          deptLower.includes("치과") && clLower.includes("치과")
        ) {
          h.isAiRecommended = true
        }
      })
      // AI 추천된 병원을 상단으로
      allHospitals.sort((a, b) => {
        if (a.isAiRecommended && !b.isAiRecommended) return -1
        if (!a.isAiRecommended && b.isAiRecommended) return 1
        return a.distanceNum - b.distanceNum
      })
    }

    // 최대 50개 반환
    const result = allHospitals.slice(0, 50)

    console.log(`[Hospitals API] Found ${result.length} hospitals within ${radiusKm}km`)

    return NextResponse.json({
      success: true,
      hospitals: result,
      totalCount: result.length,
    })
  } catch (error) {
    console.error("[Hospitals API] Error:", error)
    return NextResponse.json(
      { error: "병원 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
