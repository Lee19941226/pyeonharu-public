import { NextRequest, NextResponse } from "next/server"

// ─── 진료과목코드 매핑 (AI 분석 결과 department → dgsbjtCd) ───
const DEPARTMENT_CODE_MAP: Record<string, string> = {
  // 내과 계열
  "내과": "01",
  "소화기내과": "01",
  "호흡기내과": "01",
  "순환기내과": "01",
  "내분비내과": "01",
  // 외과 계열
  "외과": "04",
  "일반외과": "04",
  // 정형외과
  "정형외과": "05",
  // 신경외과
  "신경외과": "06",
  // 흉부외과
  "흉부외과": "07",
  // 성형외과
  "성형외과": "08",
  // 신경과(신경내과)
  "신경과": "02",
  "신경내과": "02",
  // 정신건강의학과
  "정신건강의학과": "03",
  "정신과": "03",
  // 소아청소년과
  "소아청소년과": "11",
  "소아과": "11",
  // 안과
  "안과": "12",
  // 이비인후과
  "이비인후과": "13",
  // 피부과
  "피부과": "14",
  // 비뇨의학과(비뇨기과)
  "비뇨의학과": "15",
  "비뇨기과": "15",
  // 산부인과
  "산부인과": "10",
  // 영상의학과
  "영상의학과": "16",
  // 방사선종양학과
  "방사선종양학과": "17",
  // 병리과
  "병리과": "18",
  // 진단검사의학과
  "진단검사의학과": "19",
  // 재활의학과
  "재활의학과": "21",
  // 마취통증의학과
  "마취통증의학과": "20",
  // 가정의학과
  "가정의학과": "23",
  // 응급의학과
  "응급의학과": "24",
  // 치과
  "치과": "49",
  "치의과": "49",
  // 한의원
  "한의원": "80",
  "한방내과": "81",
  "한의학과": "80",
  // 기타 - 코드 없이 전체 검색
  "통증의학과": "20",
  "감염내과": "01",
  "류마티스내과": "01",
  "알레르기내과": "01",
}

// ─── 거리 계산 (Haversine) ───
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // 지구 반지름 (m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

// ─── 현재 영업 여부 판단 (간이) ───
function checkIsOpen(): { isOpen: boolean; openTime: string; closeTime: string } {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0=일, 6=토

  if (day === 0) {
    return { isOpen: false, openTime: "휴진", closeTime: "휴진" }
  }
  if (day === 6) {
    return { isOpen: hour >= 9 && hour < 13, openTime: "09:00", closeTime: "13:00" }
  }
  return { isOpen: hour >= 9 && hour < 18, openTime: "09:00", closeTime: "18:00" }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const department = searchParams.get("department") || ""
  const radius = searchParams.get("radius") || "3000" // 기본 3km

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat, lng 파라미터가 필요합니다." }, { status: 400 })
  }

  const serviceKey = process.env.DATA_GO_KR_API_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: "공공데이터 API 키가 설정되지 않았습니다. (.env에 DATA_GO_KR_API_KEY 추가)" },
      { status: 500 }
    )
  }

  // 진료과목코드 매핑
  const dgsbjtCd = DEPARTMENT_CODE_MAP[department] || ""

  try {
    // 공공데이터 병원정보서비스 - 병원기본목록 API
    // ★ serviceKey는 URLSearchParams에 넣으면 +/= 가 인코딩되어 인증 실패
    //    → serviceKey만 수동으로 붙이고 나머지는 URLSearchParams 사용
    const otherParams = new URLSearchParams({
      numOfRows: "30",
      pageNo: "1",
      _type: "json",
      xPos: lng, // 주의: xPos = 경도(lng), yPos = 위도(lat)
      yPos: lat,
      radius,
      ...(dgsbjtCd ? { dgsbjtCd } : {}),
    })

    const apiUrl = `https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?serviceKey=${serviceKey}&${otherParams.toString()}`

    console.log("[hospitals API] 요청 URL:", apiUrl.replace(serviceKey, "KEY_HIDDEN"))

    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // 5분 캐시
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[hospitals API] 공공데이터 응답 오류:", response.status, errorText.slice(0, 300))
      return NextResponse.json(
        { error: "공공데이터 API 호출 실패", detail: errorText.slice(0, 200), hospitals: [] },
        { status: 502 }
      )
    }

    // 응답이 XML일 수 있음 (에러 시)
    const contentType = response.headers.get("content-type") || ""
    let data: any

    if (contentType.includes("json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      console.error("[hospitals API] JSON이 아닌 응답:", text.slice(0, 300))
      return NextResponse.json(
        { error: "공공데이터 API가 JSON이 아닌 응답 반환", detail: text.slice(0, 200), hospitals: [] },
        { status: 502 }
      )
    }

    // 응답 구조: data.response.body.items.item (배열 또는 단일 객체)
    const body = data?.response?.body
    if (!body) {
      console.error("[hospitals API] 응답 body 없음:", JSON.stringify(data).slice(0, 500))
      return NextResponse.json({ hospitals: [], total: 0 })
    }

    let items = body.items?.item
    if (!items) {
      return NextResponse.json({ hospitals: [], total: 0 })
    }
    // 단일 객체인 경우 배열로 변환
    if (!Array.isArray(items)) {
      items = [items]
    }

    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    const { isOpen, openTime, closeTime } = checkIsOpen()

    // 병원 데이터 가공
    const hospitals = items
      .filter((item: any) => item.YPos && item.XPos) // 좌표 있는 것만
      .map((item: any, idx: number) => {
        const hLat = parseFloat(item.YPos)
        const hLng = parseFloat(item.XPos)
        const dist = calcDistance(userLat, userLng, hLat, hLng)

        return {
          id: item.ykiho || `h-${idx}`,
          name: item.yadmNm || "이름 없음",
          department: department || item.clCdNm || "일반",
          address: item.addr || "",
          distance: formatDistance(dist),
          distanceMeters: dist,
          phone: item.telno || "",
          openTime,
          closeTime,
          isOpen,
          isAiRecommended: idx === 0, // 가장 가까운 병원을 AI 추천으로
          lat: hLat,
          lng: hLng,
          clCdNm: item.clCdNm || "", // 종별코드명 (의원, 병원, 종합병원 등)
        }
      })
      .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters) // 거리순 정렬
      .slice(0, 10) // 최대 10개

    // 첫 번째를 AI 추천으로 표시 (거리순 정렬 후)
    if (hospitals.length > 0) {
      hospitals[0].isAiRecommended = true
    }

    return NextResponse.json({
      hospitals,
      total: body.totalCount || hospitals.length,
    })
  } catch (err: any) {
    console.error("[hospitals API] 에러:", err)
    return NextResponse.json(
      { error: "병원 검색 중 오류가 발생했습니다.", hospitals: [] },
      { status: 500 }
    )
  }
}
