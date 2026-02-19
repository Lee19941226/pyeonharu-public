import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 카테고리별 일반적인 알레르기 위험 성분 매핑
const CATEGORY_ALLERGY_MAP: Record<string, string[]> = {
  "한식": ["대두", "밀", "참깨", "쇠고기", "돼지고기", "계란"],
  "중국식": ["밀", "대두", "땅콩", "갑각류", "참깨", "계란"],
  "일식": ["밀", "대두", "갑각류", "조개류", "고등어", "새우", "게"],
  "양식": ["밀", "우유", "계란", "대두", "쇠고기"],
  "해물,생선요리": ["갑각류", "조개류", "고등어", "새우", "게", "오징어"],
  "육류,고기요리": ["쇠고기", "돼지고기", "닭고기", "대두", "밀"],
  "분식": ["밀", "대두", "계란", "우유"],
  "카페": ["우유", "대두", "밀", "견과류"],
  "제과,베이커리": ["밀", "계란", "우유", "견과류", "대두"],
  "패스트푸드": ["밀", "대두", "계란", "우유", "쇠고기"],
  "치킨": ["밀", "닭고기", "대두", "계란"],
  "피자": ["밀", "우유", "대두", "돼지고기"],
  "곱창,막창": ["쇠고기", "돼지고기", "밀", "대두"],
  "족발,보쌈": ["돼지고기", "대두", "밀"],
  "찜,탕": ["대두", "밀", "쇠고기", "돼지고기", "갑각류"],
  "국수": ["밀", "대두", "계란"],
  "냉면": ["밀", "메밀", "대두", "계란", "쇠고기"],
  "샤브샤브": ["쇠고기", "대두", "밀", "갑각류", "조개류"],
  "태국식": ["땅콩", "갑각류", "대두", "밀"],
  "베트남식": ["땅콩", "갑각류", "대두", "밀", "고등어"],
  "인도식": ["우유", "밀", "견과류", "대두"],
  "멕시코식": ["밀", "우유", "대두", "쇠고기"],
  "뷔페": ["밀", "대두", "계란", "우유", "갑각류", "견과류"],
  "고기뷔페": ["쇠고기", "돼지고기", "닭고기", "밀", "대두"],
  "초밥,롤": ["밀", "대두", "갑각류", "조개류", "고등어", "새우"],
  "돈까스": ["밀", "계란", "돼지고기", "대두"],
  "떡볶이": ["밀", "대두", "계란"],
  "순대": ["밀", "대두", "돼지고기"],
  "김밥": ["밀", "대두", "계란", "참깨"],
  "죽": ["참깨", "대두", "쇠고기", "갑각류"],
  "도시락": ["밀", "대두", "계란", "쇠고기"],
  "아이스크림": ["우유", "계란", "대두", "견과류", "밀"],
  "샐러드": ["견과류", "우유", "계란", "대두"],
}

// 사용자 알레르기 기반 위험도 계산
function calculateRisk(
  categoryAllergens: string[],
  userAllergens: string[]
): { level: "safe" | "caution" | "danger"; matched: string[] } {
  const matched = categoryAllergens.filter(a => userAllergens.includes(a))

  if (matched.length === 0) return { level: "safe", matched: [] }
  if (matched.length >= 3) return { level: "danger", matched }
  return { level: "caution", matched }
}

// 네이버 카테고리 → 간단 카테고리 추출
function extractCategory(fullCategory: string): string {
  const parts = fullCategory.split(">")
  return parts[parts.length - 1].trim()
}

// 네이버 좌표 변환 (katec → 위경도 근사)
function convertNaverCoord(mapx: string, mapy: string): { lat: number; lng: number } {
  const lng = parseInt(mapx) / 10000000
  const lat = parseInt(mapy) / 10000000
  return { lat, lng }
}

// Haversine 거리 계산 (km)
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query") || ""
  const display = searchParams.get("display") || "20"
  const userLat = parseFloat(searchParams.get("lat") || "0")
  const userLng = parseFloat(searchParams.get("lng") || "0")

  if (!query) {
    return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 })
  }

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "네이버 API 키가 설정되지 않았습니다." }, { status: 500 })
  }

  try {
    // 1. 사용자 알레르기 조회
    let userAllergens: string[] = []
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: allergyData } = await supabase
          .from("user_allergies")
          .select("allergen_name")
          .eq("user_id", user.id)

        if (allergyData && allergyData.length > 0) {
          userAllergens = allergyData.map((a: any) => a.allergen_name)
        }
      }
    } catch {
      // 비로그인도 허용
    }

    // 2. 네이버 지역 검색 API 호출
    const naverUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=comment`

    const naverRes = await fetch(naverUrl, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    })

    if (!naverRes.ok) {
      const errText = await naverRes.text()
      console.error("[Restaurant Search] 네이버 API 오류:", errText)
      return NextResponse.json({ error: "음식점 검색에 실패했습니다." }, { status: 500 })
    }

    const naverData = await naverRes.json()

    // 3. 음식점 카테고리 필터 + 알레르기 매칭
    let restaurants = (naverData.items || [])
      .filter((item: any) => item.category?.startsWith("음식점"))
      .map((item: any) => {
        const category = extractCategory(item.category || "")
        const { lat, lng } = convertNaverCoord(item.mapx, item.mapy)

        // 카테고리 기반 알레르기 매칭
        const categoryAllergens = CATEGORY_ALLERGY_MAP[category] || []
        const risk = calculateRisk(categoryAllergens, userAllergens)

        // HTML 태그 제거
        const cleanName = (item.title || "").replace(/<[^>]*>/g, "")

        // 거리 계산 (사용자 좌표가 있으면)
        let distance = ""
        let distanceKm = 9999
        if (userLat && userLng && lat && lng) {
          distanceKm = haversine(userLat, userLng, lat, lng)
          distance = distanceKm < 1
            ? `${Math.round(distanceKm * 1000)}m`
            : `${distanceKm.toFixed(1)}km`
        }

        return {
          name: cleanName,
          category,
          categoryFull: item.category,
          address: item.address,
          roadAddress: item.roadAddress,
          lat,
          lng,
          phone: item.telephone || "",
          link: item.link || "",
          riskLevel: risk.level,
          matchedAllergens: risk.matched,
          categoryAllergens,
          distance,
          distanceKm,
        }
      })

    // 4. 사용자 좌표가 있으면 거리순 정렬
    if (userLat && userLng) {
      restaurants = restaurants.sort((a: any, b: any) => a.distanceKm - b.distanceKm)
    }

    return NextResponse.json({
      success: true,
      total: naverData.total,
      restaurants,
      userAllergens,
    })
  } catch (error) {
    console.error("[Restaurant Search] Error:", error)
    return NextResponse.json({ error: "음식점 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
}
