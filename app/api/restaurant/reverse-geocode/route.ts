import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat, lng 파라미터가 필요합니다." }, { status: 400 })
  }

  const clientId = process.env.NAVER_MAP_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET

  console.log("[Reverse Geocode] clientId:", clientId ? "있음" : "없음", "clientSecret:", clientSecret ? "있음" : "없음")

  // 네이버 Reverse Geocoding API 사용
  if (clientId && clientSecret) {
    try {
      const naverUrl = `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&output=json&orders=legalcode,admcode`

      const res = await fetch(naverUrl, {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": clientId,
          "X-NCP-APIGW-API-KEY": clientSecret,
        },
      })

      console.log("[Reverse Geocode] 네이버 응답 상태:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("[Reverse Geocode] 네이버 응답:", JSON.stringify(data).slice(0, 300))
        const results = data.results || []

        if (results.length > 0) {
          const region = results[0].region
          const sido = region?.area1?.name || ""   // 경기도
          const sigungu = region?.area2?.name || "" // 군포시
          const dong = region?.area3?.name || ""    // 산본동

          // "군포시 산본동" 또는 "군포시" 형태로 반환
          const address = sigungu
            ? dong
              ? `${sigungu} ${dong}`
              : sigungu
            : sido

          return NextResponse.json({
            success: true,
            address,
            sido,
            sigungu,
            dong,
            full: `${sido} ${sigungu} ${dong}`.trim(),
          })
        }
      }
    } catch (err: any) {
      console.error("[Reverse Geocode] 네이버 API 오류:", err?.message || err)
    }
  }

  // 폴백: 좌표 기반 시도 추정
  const address = estimateRegion(parseFloat(lat), parseFloat(lng))
  return NextResponse.json({
    success: true,
    address,
    sido: address,
    sigungu: "",
    dong: "",
    full: address,
  })
}

// 좌표 기반 대략적 지역 추정 (폴백)
function estimateRegion(lat: number, lng: number): string {
  const regions = [
    { name: "서울", lat: 37.5665, lng: 126.978 },
    { name: "인천", lat: 37.4563, lng: 126.7052 },
    { name: "수원", lat: 37.2636, lng: 127.0286 },
    { name: "성남", lat: 37.4201, lng: 127.1265 },
    { name: "군포", lat: 37.3614, lng: 126.9351 },
    { name: "안양", lat: 37.3943, lng: 126.9568 },
    { name: "안산", lat: 37.3219, lng: 126.8309 },
    { name: "용인", lat: 37.2411, lng: 127.1776 },
    { name: "화성", lat: 37.1994, lng: 126.8313 },
    { name: "부천", lat: 37.5034, lng: 126.766 },
    { name: "고양", lat: 37.6584, lng: 126.832 },
    { name: "의왕", lat: 37.3449, lng: 126.968 },
    { name: "과천", lat: 37.4292, lng: 126.9876 },
    { name: "광명", lat: 37.4786, lng: 126.8647 },
    { name: "시흥", lat: 37.3801, lng: 126.8029 },
    { name: "부산", lat: 35.1796, lng: 129.0756 },
    { name: "대구", lat: 35.8714, lng: 128.6014 },
    { name: "대전", lat: 36.3504, lng: 127.3845 },
    { name: "광주", lat: 35.1595, lng: 126.8526 },
    { name: "울산", lat: 35.5384, lng: 129.3114 },
    { name: "세종", lat: 36.48, lng: 127.259 },
    { name: "제주", lat: 33.4996, lng: 126.5312 },
    { name: "춘천", lat: 37.8813, lng: 127.7298 },
    { name: "천안", lat: 36.8151, lng: 127.1139 },
    { name: "전주", lat: 35.8242, lng: 127.148 },
    { name: "청주", lat: 36.6424, lng: 127.489 },
    { name: "포항", lat: 36.019, lng: 129.3435 },
    { name: "창원", lat: 35.2281, lng: 128.6812 },
  ]

  let closest = regions[0]
  let minDist = Infinity

  for (const region of regions) {
    const dist = Math.sqrt(
      Math.pow(lat - region.lat, 2) + Math.pow(lng - region.lng, 2)
    )
    if (dist < minDist) {
      minDist = dist
      closest = region
    }
  }

  return closest.name
}
