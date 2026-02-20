// app/api/test-api/route.ts 생성
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = "8809153473899"; // 델몬트 사과
  const serviceKey = process.env.FOOD_API_KEY || "";
  const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

  try {
    const url = `${baseUrl}/getFoodQrProdRawmtrl01?serviceKey=${serviceKey}&pageNo=1&numOfRows=100&type=json&brcd_no=${code}`;

    console.log("🔍 API URL:", url);

    const response = await fetch(url);
    const data = await response.json();

    console.log("📦 응답 데이터:", data);

    return NextResponse.json({
      success: true,
      response: data,
      items: data.body?.items || null,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "오류",
    });
  }
}
