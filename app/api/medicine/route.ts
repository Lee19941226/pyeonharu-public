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
      return NextResponse.json({ error: "???대쫫???낅젰?댁＜?몄슂." }, { status: 400 })
    }

    // ?섍꼍蹂?섏뿉??API ??媛?몄삤湲?(?대? ?몄퐫?⑸맂 踰꾩쟾)
    const serviceKey = process.env.MEDICINE_API_KEY || process.env.DATA_GO_KR_API_KEY
    
    if (!serviceKey) {
      console.error("MEDICINE_API_KEY ?섍꼍蹂?섍? ?ㅼ젙?섏? ?딆쓬")
      return NextResponse.json({ error: "API ?ㅺ? ?ㅼ젙?섏? ?딆븯?듬땲??" }, { status: 500 })
    }

    // URL 吏곸젒 援ъ꽦 (serviceKey???대? ?몄퐫?⑸맖)
    const url = `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList?serviceKey=${serviceKey}&itemName=${encodeURIComponent(itemName)}&pageNo=${pageNo}&numOfRows=${numOfRows}&type=json`


    const response = await fetch(url)
    const text = await response.text()
    

    if (!response.ok) {
      console.error("Medicine API error:", response.status, text.substring(0, 500))
      return NextResponse.json({ error: "?섏빟???뺣낫瑜?媛?몄삤??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 502 })
    }

    // JSON ?뚯떛
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error("JSON ?뚯떛 ?ㅽ뙣:", text.substring(0, 500))
      return NextResponse.json({ error: "API ?묐떟 ?뚯떛 ?ㅽ뙣" }, { status: 502 })
    }

    // API ?묐떟 援ъ“ ?뺤씤
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


    // ?곗씠???뺤젣
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
    return NextResponse.json({ error: "???뺣낫 寃??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." }, { status: 500 })
  }
}

// HTML ?쒓렇 ?쒓굅 諛??띿뒪???뺣━
function cleanHtml(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/<[^>]*>/g, "") // HTML ?쒓렇 ?쒓굅
    .replace(/&nbsp;/g, " ") // &nbsp; ?쒓굅
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ") // ?곗냽 怨듬갚 ?쒓굅
    .trim()
}
