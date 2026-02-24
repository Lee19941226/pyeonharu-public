import { NextRequest, NextResponse } from "next/server";

// ─── 위경도 → 시도코드 매핑 (병원 API와 동일) ───
const SIDO_CENTERS: Record<string, { lat: number; lng: number; code: string }> =
  {
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
  };

function getSidoCdByLocation(lat: number, lng: number): string[] {
  const sorted = Object.entries(SIDO_CENTERS)
    .map(([name, center]) => ({
      name,
      code: center.code,
      dist: Math.sqrt(
        Math.pow(lat - center.lat, 2) + Math.pow(lng - center.lng, 2),
      ),
    }))
    .sort((a, b) => a.dist - b.dist);

  return [sorted[0].code];
}

// ─── Haversine 거리 계산 (km) ───
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── XML 파싱 헬퍼 ───
function getXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1].trim() : "";
}

// ─── GET /api/pharmacies ───
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radiusM = parseInt(searchParams.get("radius") || "3000");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat, lng 파라미터가 필요합니다.", pharmacies: [] },
      { status: 400 },
    );
  }

  try {
    const serviceKey = process.env.DATA_GO_KR_API_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "API 키가 설정되지 않았습니다.", pharmacies: [] },
        { status: 500 },
      );
    }

    // 1) 위경도 → 시도코드
    const sidoCodes = getSidoCdByLocation(lat, lng);
    const radiusKm = radiusM / 1000;

    const allPharmacies: any[] = [];

    // 2) HIRA 약국 목록 API 호출 (병원과 동일 패턴)
    for (const sidoCd of sidoCodes) {
      const url = `http://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList?serviceKey=${serviceKey}&numOfRows=1000&pageNo=1&sidoCd=${sidoCd}`;

      console.log(`[Pharmacies API] Fetching sidoCd=${sidoCd}...`);
      const response = await fetch(url);
      const text = await response.text();

      // XML 에러 체크
      if (text.includes("<returnReasonCode>")) {
        const errCode = getXmlValue(text, "returnReasonCode");
        const errMsg = getXmlValue(text, "returnAuthMsg");
        console.error(`[Pharmacies API] Error: ${errCode} - ${errMsg}`);
        continue;
      }

      // XML 파싱
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(text)) !== null) {
        const item = match[1];

        // 좌표: YPos=위도, XPos=경도 (HIRA 표준)
        const pLat = parseFloat(getXmlValue(item, "YPos")) || 0;
        const pLng = parseFloat(getXmlValue(item, "XPos")) || 0;

        if (!pLat || !pLng) continue;

        // 거리 필터링
        const dist = haversine(lat, lng, pLat, pLng);
        if (dist > radiusKm) continue;

        const name = getXmlValue(item, "yadmNm");
        if (!name) continue;

        allPharmacies.push({
          hpid: getXmlValue(item, "ykiho") || String(Math.random()),
          dutyName: name,
          dutyAddr: getXmlValue(item, "addr"),
          dutyTel1: getXmlValue(item, "telno"),
          wgs84Lat: pLat,
          wgs84Lon: pLng,
          distance:
            dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
          distanceNum: dist,
        });
      }
    }

    // 3) 거리순 정렬
    allPharmacies.sort((a, b) => a.distanceNum - b.distanceNum);

    // 최대 50개 반환
    const result = allPharmacies.slice(0, 50);

    console.log(
      `[Pharmacies API] Found ${result.length} pharmacies within ${radiusKm}km`,
    );

    return NextResponse.json({ pharmacies: result });
  } catch (error) {
    console.error("[Pharmacies API] Error:", error);
    return NextResponse.json({
      pharmacies: [],
      error: "약국 정보를 가져오는데 실패했습니다.",
    });
  }
}
