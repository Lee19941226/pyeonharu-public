import { NextRequest, NextResponse } from "next/server"

// 주요 시/구/동 좌표 데이터베이스 (경기 남부 중심 + 주요 도시)
const REGIONS = [
  // 경기 남부 (상세)
  { name: "군포시", lat: 37.3614, lng: 126.9351, sido: "경기도", sigungu: "군포시" },
  { name: "산본동", lat: 37.3594, lng: 126.9315, sido: "경기도", sigungu: "군포시", dong: "산본동" },
  { name: "금정동", lat: 37.3715, lng: 126.9437, sido: "경기도", sigungu: "군포시", dong: "금정동" },
  { name: "당동", lat: 37.3530, lng: 126.9230, sido: "경기도", sigungu: "군포시", dong: "당동" },
  { name: "당정동", lat: 37.3480, lng: 126.9290, sido: "경기도", sigungu: "군포시", dong: "당정동" },
  { name: "대야미동", lat: 37.3380, lng: 126.9350, sido: "경기도", sigungu: "군포시", dong: "대야미동" },
  { name: "부곡동", lat: 37.3650, lng: 126.9250, sido: "경기도", sigungu: "군포시", dong: "부곡동" },
  { name: "광정동", lat: 37.3750, lng: 126.9180, sido: "경기도", sigungu: "군포시", dong: "광정동" },
  
  // 안양
  { name: "안양시", lat: 37.3943, lng: 126.9568, sido: "경기도", sigungu: "안양시" },
  { name: "평촌", lat: 37.3896, lng: 126.9632, sido: "경기도", sigungu: "안양시", dong: "평촌동" },
  { name: "범계", lat: 37.3900, lng: 126.9535, sido: "경기도", sigungu: "안양시", dong: "범계동" },
  { name: "인덕원", lat: 37.3870, lng: 126.9875, sido: "경기도", sigungu: "안양시", dong: "관양동" },
  
  // 의왕
  { name: "의왕시", lat: 37.3449, lng: 126.968, sido: "경기도", sigungu: "의왕시" },
  
  // 과천
  { name: "과천시", lat: 37.4292, lng: 126.9876, sido: "경기도", sigungu: "과천시" },
  
  // 안산
  { name: "안산시", lat: 37.3219, lng: 126.8309, sido: "경기도", sigungu: "안산시" },
  
  // 수원
  { name: "수원시", lat: 37.2636, lng: 127.0286, sido: "경기도", sigungu: "수원시" },
  
  // 성남
  { name: "성남시", lat: 37.4201, lng: 127.1265, sido: "경기도", sigungu: "성남시" },
  
  // 용인
  { name: "용인시", lat: 37.2411, lng: 127.1776, sido: "경기도", sigungu: "용인시" },
  
  // 화성
  { name: "화성시", lat: 37.1994, lng: 126.8313, sido: "경기도", sigungu: "화성시" },
  
  // 부천
  { name: "부천시", lat: 37.5034, lng: 126.766, sido: "경기도", sigungu: "부천시" },
  
  // 광명
  { name: "광명시", lat: 37.4786, lng: 126.8647, sido: "경기도", sigungu: "광명시" },
  
  // 시흥
  { name: "시흥시", lat: 37.3801, lng: 126.8029, sido: "경기도", sigungu: "시흥시" },
  
  // 고양
  { name: "고양시", lat: 37.6584, lng: 126.832, sido: "경기도", sigungu: "고양시" },
  
  // 경기 북부
  { name: "파주시", lat: 37.7599, lng: 126.7797, sido: "경기도", sigungu: "파주시" },
  { name: "남양주시", lat: 37.6360, lng: 127.2165, sido: "경기도", sigungu: "남양주시" },
  { name: "구리시", lat: 37.5943, lng: 127.1295, sido: "경기도", sigungu: "구리시" },
  { name: "하남시", lat: 37.5393, lng: 127.2147, sido: "경기도", sigungu: "하남시" },
  { name: "광주시", lat: 37.4294, lng: 127.2551, sido: "경기도", sigungu: "광주시" },
  { name: "이천시", lat: 37.2721, lng: 127.4346, sido: "경기도", sigungu: "이천시" },
  { name: "평택시", lat: 36.9922, lng: 127.1126, sido: "경기도", sigungu: "평택시" },
  { name: "오산시", lat: 37.1498, lng: 127.0698, sido: "경기도", sigungu: "오산시" },
  { name: "김포시", lat: 37.6153, lng: 126.7156, sido: "경기도", sigungu: "김포시" },
  
  // 서울 주요 구
  { name: "강남구", lat: 37.5173, lng: 127.0473, sido: "서울특별시", sigungu: "강남구" },
  { name: "서초구", lat: 37.4837, lng: 127.0324, sido: "서울특별시", sigungu: "서초구" },
  { name: "송파구", lat: 37.5145, lng: 127.1050, sido: "서울특별시", sigungu: "송파구" },
  { name: "관악구", lat: 37.4784, lng: 126.9516, sido: "서울특별시", sigungu: "관악구" },
  { name: "금천구", lat: 37.4568, lng: 126.8955, sido: "서울특별시", sigungu: "금천구" },
  { name: "영등포구", lat: 37.5263, lng: 126.8963, sido: "서울특별시", sigungu: "영등포구" },
  { name: "종로구", lat: 37.5735, lng: 126.9790, sido: "서울특별시", sigungu: "종로구" },
  { name: "중구", lat: 37.5641, lng: 126.9979, sido: "서울특별시", sigungu: "중구" },
  { name: "용산구", lat: 37.5326, lng: 126.9905, sido: "서울특별시", sigungu: "용산구" },
  { name: "마포구", lat: 37.5663, lng: 126.9014, sido: "서울특별시", sigungu: "마포구" },
  { name: "동작구", lat: 37.5124, lng: 126.9395, sido: "서울특별시", sigungu: "동작구" },
  { name: "구로구", lat: 37.4954, lng: 126.8874, sido: "서울특별시", sigungu: "구로구" },
  { name: "강서구", lat: 37.5510, lng: 126.8495, sido: "서울특별시", sigungu: "강서구" },
  { name: "양천구", lat: 37.5170, lng: 126.8668, sido: "서울특별시", sigungu: "양천구" },
  { name: "강동구", lat: 37.5301, lng: 127.1238, sido: "서울특별시", sigungu: "강동구" },
  { name: "광진구", lat: 37.5384, lng: 127.0822, sido: "서울특별시", sigungu: "광진구" },
  { name: "성동구", lat: 37.5634, lng: 127.0369, sido: "서울특별시", sigungu: "성동구" },
  { name: "동대문구", lat: 37.5744, lng: 127.0396, sido: "서울특별시", sigungu: "동대문구" },
  { name: "성북구", lat: 37.5894, lng: 127.0164, sido: "서울특별시", sigungu: "성북구" },
  { name: "노원구", lat: 37.6543, lng: 127.0569, sido: "서울특별시", sigungu: "노원구" },
  { name: "도봉구", lat: 37.6688, lng: 127.0472, sido: "서울특별시", sigungu: "도봉구" },
  { name: "은평구", lat: 37.6027, lng: 126.9291, sido: "서울특별시", sigungu: "은평구" },
  { name: "서대문구", lat: 37.5791, lng: 126.9368, sido: "서울특별시", sigungu: "서대문구" },
  { name: "강북구", lat: 37.6397, lng: 127.0255, sido: "서울특별시", sigungu: "강북구" },
  { name: "중랑구", lat: 37.6065, lng: 127.0928, sido: "서울특별시", sigungu: "중랑구" },
  
  // 인천
  { name: "인천광역시", lat: 37.4563, lng: 126.7052, sido: "인천광역시", sigungu: "인천시" },
  
  // 광역시
  { name: "부산광역시", lat: 35.1796, lng: 129.0756, sido: "부산광역시", sigungu: "부산시" },
  { name: "대구광역시", lat: 35.8714, lng: 128.6014, sido: "대구광역시", sigungu: "대구시" },
  { name: "대전광역시", lat: 36.3504, lng: 127.3845, sido: "대전광역시", sigungu: "대전시" },
  { name: "광주광역시", lat: 35.1595, lng: 126.8526, sido: "광주광역시", sigungu: "광주시" },
  { name: "울산광역시", lat: 35.5384, lng: 129.3114, sido: "울산광역시", sigungu: "울산시" },
  { name: "세종시", lat: 36.48, lng: 127.259, sido: "세종특별자치시", sigungu: "세종시" },
  { name: "제주시", lat: 33.4996, lng: 126.5312, sido: "제주특별자치도", sigungu: "제주시" },
  
  // 기타 주요 도시
  { name: "춘천시", lat: 37.8813, lng: 127.7298, sido: "강원도", sigungu: "춘천시" },
  { name: "원주시", lat: 37.3422, lng: 127.9202, sido: "강원도", sigungu: "원주시" },
  { name: "천안시", lat: 36.8151, lng: 127.1139, sido: "충청남도", sigungu: "천안시" },
  { name: "청주시", lat: 36.6424, lng: 127.489, sido: "충청북도", sigungu: "청주시" },
  { name: "전주시", lat: 35.8242, lng: 127.148, sido: "전라북도", sigungu: "전주시" },
  { name: "포항시", lat: 36.019, lng: 129.3435, sido: "경상북도", sigungu: "포항시" },
  { name: "창원시", lat: 35.2281, lng: 128.6812, sido: "경상남도", sigungu: "창원시" },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat, lng 파라미터가 필요합니다." }, { status: 400 })
  }

  const userLat = parseFloat(lat)
  const userLng = parseFloat(lng)

  // 가장 가까운 지역 찾기
  let closest = REGIONS[0]
  let minDist = Infinity

  for (const region of REGIONS) {
    const dist = Math.sqrt(
      Math.pow(userLat - region.lat, 2) + Math.pow(userLng - region.lng, 2)
    )
    if (dist < minDist) {
      minDist = dist
      closest = region
    }
  }

  // 가장 가까운 시군구도 찾기 (동이 아닌 것 중)
  let closestSigungu = REGIONS.filter(r => !r.dong).sort((a, b) => {
    const distA = Math.sqrt(Math.pow(userLat - a.lat, 2) + Math.pow(userLng - a.lng, 2))
    const distB = Math.sqrt(Math.pow(userLat - b.lat, 2) + Math.pow(userLng - b.lng, 2))
    return distA - distB
  })[0]

  const sido = closest.sido || ""
  const sigungu = closest.sigungu || closestSigungu?.sigungu || ""
  const dong = closest.dong || ""

  // 표시용 주소
  const address = dong ? `${sigungu} ${dong}` : sigungu
  const full = `${sido} ${sigungu} ${dong}`.trim()

  return NextResponse.json({
    success: true,
    address,
    sido,
    sigungu,
    dong,
    full,
  })
}
