import { NextRequest, NextResponse } from "next/server"

interface MedicineItem {
  entpName: string
  itemName: string
  itemSeq: string
  efcyQesitm: string
  useMethodQesitm: string
  atpnWarnQesitm: string
  atpnQesitm: string
  intrcQesitm: string
  seQesitm: string
  depositMethodQesitm: string
  openDe: string
  updateDe: string
  itemImage: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const itemName = searchParams.get("itemName") || ""
    const pageNo = searchParams.get("pageNo") || "1"
    const numOfRows = searchParams.get("numOfRows") || "10"

    if (!itemName.trim()) {
      return NextResponse.json({ error: "약 이름을 입력해주세요." }, { status: 400 })
    }

    // 환경변수에서 API 키 가져오기 (이미 인코딩된 버전)
    const serviceKey = process.env.MEDICINE_API_KEY || process.env.DATA_GO_KR_API_KEY
    
    if (!serviceKey) {
      console.error("MEDICINE_API_KEY 환경변수가 설정되지 않음")
      return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 })
    }

    // URL 직접 구성 (serviceKey는 이미 인코딩됨)
    const url = `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList?serviceKey=${serviceKey}&itemName=${encodeURIComponent(itemName)}&pageNo=${pageNo}&numOfRows=${numOfRows}&type=json`

    console.log("[Medicine API] 요청 URL:", url.replace(serviceKey, "KEY_HIDDEN"))

    const response = await fetch(url)
    const text = await response.text()
    
    console.log("[Medicine API] 응답 상태:", response.status)
    console.log("[Medicine API] 응답 일부:", text.substring(0, 300))

    if (!response.ok) {
      console.error("Medicine API error:", response.status, text.substring(0, 500))
      return NextResponse.json({ error: "의약품 정보를 가져오는 중 오류가 발생했습니다." }, { status: 502 })
    }

    // JSON 파싱
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error("JSON 파싱 실패:", text.substring(0, 500))
      return NextResponse.json({ error: "API 응답 파싱 실패" }, { status: 502 })
    }

    // API 응답 구조 확인
    const body = data.body
    if (!body) {
      return NextResponse.json({
        success: true,
        totalCount: 0,
        items: [],
        pageNo: parseInt(pageNo),
        numOfRows: parseInt(numOfRows),
      })
    }

    const items: MedicineItem[] = body.items || []
    const totalCount = body.totalCount || 0

    console.log("[Medicine API]", totalCount, "개 약품 발견")

    // 데이터 정제
    const medicines = items.map((item: MedicineItem) => ({
      id: item.itemSeq,
      name: item.itemName || "",
      company: item.entpName || "",
      efficacy: cleanHtml(item.efcyQesitm) || "",
      usage: cleanHtml(item.useMethodQesitm) || "",
      warningPrecaution: cleanHtml(item.atpnWarnQesitm) || "",
      precaution: cleanHtml(item.atpnQesitm) || "",
      interaction: cleanHtml(item.intrcQesitm) || "",
      sideEffect: cleanHtml(item.seQesitm) || "",
      storage: cleanHtml(item.depositMethodQesitm) || "",
      image: item.itemImage || "",
      openDate: item.openDe || "",
      updateDate: item.updateDe || "",
    }))

    return NextResponse.json({
      success: true,
      totalCount,
      items: medicines,
      pageNo: parseInt(pageNo),
      numOfRows: parseInt(numOfRows),
    })
  } catch (error) {
    console.error("Medicine search error:", error)
    return NextResponse.json({ error: "약 정보 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
}

// HTML 태그 제거 및 텍스트 정리
function cleanHtml(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/<[^>]*>/g, "") // HTML 태그 제거
    .replace(/&nbsp;/g, " ") // &nbsp; 제거
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ") // 연속 공백 제거
    .trim()
}
