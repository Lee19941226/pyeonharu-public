import { NextRequest, NextResponse } from "next/server"

// 국립중앙의료원 전국 약국 정보 조회 서비스
// End Point: https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService
// 기능: getParmacyListInfoInqire (약국 목록정보 조회)
//
// 기존 병원 API(HIRA)와 호환성 유지: sidoCd를 받아서 한글 시도명으로 변환

// sidoCd → 한글 시도명 매핑 (국립중앙의료원 API는 Q0=한글명으로 검색)
const SIDO_CODE_TO_NAME: Record<string, string> = {
  "110000": "서울특별시",
  "210000": "부산광역시",
  "220000": "인천광역시",
  "230000": "대구광역시",
  "240000": "광주광역시",
  "250000": "대전광역시",
  "260000": "울산광역시",
  "310000": "경기도",
  "320000": "강원특별자치도",
  "330000": "충청북도",
  "340000": "충청남도",
  "350000": "전북특별자치도",
  "360000": "전라남도",
  "370000": "경상북도",
  "380000": "경상남도",
  "390000": "제주특별자치도",
  "410000": "세종특별자치시",
}

// 새 명칭이 API에서 안 될 수 있으므로 대체명 준비
const SIDO_FALLBACK: Record<string, string> = {
  "강원특별자치도": "강원도",
  "전북특별자치도": "전라북도",
  "제주특별자치도": "제주도",
  "세종특별자치시": "세종시",
}

async function fetchPharmacies(serviceKey: string, sidoName: string, pageNo: string, numOfRows: string, keyword?: string) {
  const encodedSido = encodeURIComponent(sidoName)
  let url = `https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire?serviceKey=${serviceKey}&Q0=${encodedSido}&pageNo=${pageNo}&numOfRows=${numOfRows}&ORD=NAME`

  // 키워드가 있으면 QN 파라미터로 서버 검색
  if (keyword && keyword.trim()) {
    url += `&QN=${encodeURIComponent(keyword.trim())}`
  }

  console.log("[Area Pharmacies API] Fetching:", url.replace(serviceKey, "***"))

  const response = await fetch(url)
  const text = await response.text()

  // totalCount 파싱
  const totalCountMatch = text.match(/<totalCount>(\d+)<\/totalCount>/)
  const totalCount = totalCountMatch ? parseInt(totalCountMatch[1]) : 0

  // 약국 정보 추출
  const pharmacies: any[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(text)) !== null) {
    const item = match[1]

    const getValue = (tag: string) => {
      const m = item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
      return m ? m[1].trim() : ""
    }

    const pharmacy = {
      id: getValue("hpid"),
      name: getValue("dutyName"),
      address: getValue("dutyAddr"),
      phone: getValue("dutyTel1"),
      sidoCdNm: sidoName,
      sgguCdNm: "",
      emdongNm: "",
      lat: parseFloat(getValue("wgs84Lat")) || 0,
      lng: parseFloat(getValue("wgs84Lon")) || 0,
    }

    if (pharmacy.name) {
      pharmacies.push(pharmacy)
    }
  }

  return { totalCount, pharmacies }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sidoCd = searchParams.get("sidoCd")
  const pageNo = searchParams.get("pageNo") || "1"
  const numOfRows = searchParams.get("numOfRows") || "30"
  const keyword = searchParams.get("keyword") // 약국명 검색

  if (!sidoCd) {
    return NextResponse.json({ error: "sidoCd(시도코드)가 필요합니다." }, { status: 400 })
  }

  const sidoName = SIDO_CODE_TO_NAME[sidoCd]
  if (!sidoName) {
    return NextResponse.json({ error: `알 수 없는 시도코드: ${sidoCd}` }, { status: 400 })
  }

  try {
    const serviceKey = process.env.DATA_GO_KR_API_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 })
    }

    // 1차 시도: 정식 명칭으로 검색
    let result = await fetchPharmacies(serviceKey, sidoName, pageNo, numOfRows, keyword || undefined)

    // 결과 없고 fallback 명칭이 있으면 재시도
    if (result.totalCount === 0 && SIDO_FALLBACK[sidoName]) {
      console.log("[Area Pharmacies API] No results, trying fallback:", SIDO_FALLBACK[sidoName])
      result = await fetchPharmacies(serviceKey, SIDO_FALLBACK[sidoName], pageNo, numOfRows, keyword || undefined)
    }

    return NextResponse.json({
      success: true,
      totalCount: result.totalCount,
      pageNo: parseInt(pageNo),
      numOfRows: parseInt(numOfRows),
      pharmacies: result.pharmacies,
    })
  } catch (error) {
    console.error("[Area Pharmacies API] Error:", error)
    return NextResponse.json({ error: "약국 정보를 가져오는 중 오류가 발생했습니다." }, { status: 500 })
  }
}
