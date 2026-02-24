import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "위치 정보가 필요합니다.", pharmacies: [] },
      { status: 400 },
    );
  }

  let SERVICE_KEY = process.env.DATA_GO_KR_API_KEY || "";

  if (SERVICE_KEY.includes("%")) {
    try {
      SERVICE_KEY = decodeURIComponent(SERVICE_KEY);
    } catch {}
  }

  if (!SERVICE_KEY) {
    return NextResponse.json(
      { error: "API 키가 설정되지 않았습니다.", pharmacies: [] },
      { status: 500 },
    );
  }

  try {
    // 약국 목록 조회 API (거리순 정렬 지원)
    const baseUrl =
      "https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire";

    const params = new URLSearchParams();
    params.append("serviceKey", SERVICE_KEY);
    params.append("WGS84_LON", lng);
    params.append("WGS84_LAT", lat);
    params.append("ORD", "distance");
    params.append("pageNo", "1");
    params.append("numOfRows", "50");

    const url = `${baseUrl}?${params.toString()}`;

    console.log("[pharmacies API] 요청 중... lat:", lat, "lng:", lng);

    const response = await fetch(url, {
      headers: { Accept: "application/xml" },
    });

    console.log("[pharmacies API] 응답 상태:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[pharmacies API] 에러 응답:", errorText);
      return NextResponse.json({
        pharmacies: [],
        error: `API 오류: ${response.status}`,
      });
    }

    const text = await response.text();
    const pharmacies = parsePharmacyXML(text);
    console.log(`[pharmacies API] ${pharmacies.length}개 약국 발견`);

    return NextResponse.json({ pharmacies });
  } catch (error) {
    console.error("[pharmacies API] 에러:", error);
    return NextResponse.json({
      pharmacies: [],
      error: "약국 정보를 가져오는데 실패했습니다.",
    });
  }
}

function parsePharmacyXML(xml: string): Array<{
  hpid: string;
  dutyName: string;
  dutyAddr: string;
  dutyTel1: string;
  wgs84Lon: number;
  wgs84Lat: number;
}> {
  const pharmacies: Array<{
    hpid: string;
    dutyName: string;
    dutyAddr: string;
    dutyTel1: string;
    wgs84Lon: number;
    wgs84Lat: number;
  }> = [];

  if (xml.includes("<errMsg>") && xml.includes("SERVICE ERROR")) {
    console.error("[parsePharmacyXML] API 서비스 에러");
    return pharmacies;
  }

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const getValue = (tag: string): string => {
      const pattern = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
      const m = pattern.exec(itemXml);
      return m ? m[1].trim() : "";
    };

    const dutyName = getValue("dutyName");

    const latitude =
      parseFloat(getValue("wgs84Lat")) ||
      parseFloat(getValue("latitude")) ||
      parseFloat(getValue("YPos")) ||
      0;
    const longitude =
      parseFloat(getValue("wgs84Lon")) ||
      parseFloat(getValue("longitude")) ||
      parseFloat(getValue("XPos")) ||
      0;

    if (dutyName && latitude !== 0 && longitude !== 0) {
      pharmacies.push({
        hpid: getValue("hpid") || getValue("rnum") || String(Math.random()),
        dutyName,
        dutyAddr: getValue("dutyAddr"),
        dutyTel1: getValue("dutyTel1"),
        wgs84Lon: longitude,
        wgs84Lat: latitude,
      });
    }
  }

  return pharmacies;
}
