import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusM = parseInt(searchParams.get("radius") || "3000");

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

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = radiusM / 1000;

  try {
    // 응급의료기관 약국 목록 API (위경도 기반 검색)
    const baseUrl =
      "https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire";

    const allPharmacies: any[] = [];

    // 여러 페이지 조회 (최대 3페이지)
    for (let page = 1; page <= 3; page++) {
      const params = new URLSearchParams();
      params.append("serviceKey", SERVICE_KEY);
      params.append("WGS84_LON", lng);
      params.append("WGS84_LAT", lat);
      params.append("ORD", "distance");
      params.append("pageNo", String(page));
      params.append("numOfRows", "100");

      const url = `${baseUrl}?${params.toString()}`;

      console.log(`[Pharmacies API] 페이지 ${page} 요청 중...`);

      const response = await fetch(url, {
        headers: { Accept: "application/xml" },
      });

      if (!response.ok) {
        console.error(
          `[Pharmacies API] 페이지 ${page} 에러: ${response.status}`,
        );
        break;
      }

      const text = await response.text();

      // 에러 응답 체크
      if (text.includes("<errMsg>") && text.includes("SERVICE ERROR")) {
        console.error("[Pharmacies API] API 서비스 에러");
        break;
      }

      // totalCount 확인
      const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
      const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;

      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      let pageCount = 0;

      while ((match = itemRegex.exec(text)) !== null) {
        const itemXml = match[1];
        pageCount++;

        const getValue = (tag: string): string => {
          const pattern = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
          const m = pattern.exec(itemXml);
          return m ? m[1].trim() : "";
        };

        const dutyName = getValue("dutyName");

        // 좌표 파싱 (여러 필드명 시도)
        const pLat =
          parseFloat(getValue("wgs84Lat")) ||
          parseFloat(getValue("latitude")) ||
          parseFloat(getValue("YPos")) ||
          0;
        const pLng =
          parseFloat(getValue("wgs84Lon")) ||
          parseFloat(getValue("longitude")) ||
          parseFloat(getValue("XPos")) ||
          0;

        if (!dutyName || pLat === 0 || pLng === 0) continue;

        // 거리 계산
        const dist = haversine(userLat, userLng, pLat, pLng);

        // 반경 내만 포함
        if (dist > radiusKm) continue;

        allPharmacies.push({
          hpid: getValue("hpid") || getValue("rnum") || String(Math.random()),
          dutyName,
          dutyAddr: getValue("dutyAddr"),
          dutyTel1: getValue("dutyTel1"),
          wgs84Lat: pLat,
          wgs84Lon: pLng,
          distance:
            dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
          distanceNum: dist,
        });
      }

      console.log(
        `[Pharmacies API] 페이지 ${page}: ${pageCount}개 항목, 총 ${totalCount}개`,
      );

      // 더 이상 데이터 없으면 중단
      if (pageCount === 0 || page * 100 >= totalCount) break;
    }

    // 거리순 정렬
    allPharmacies.sort((a, b) => a.distanceNum - b.distanceNum);

    // 최대 50개 반환
    const result = allPharmacies.slice(0, 50);

    console.log(
      `[Pharmacies API] ${result.length}개 약국 (반경 ${radiusKm}km 내)`,
    );

    return NextResponse.json({ pharmacies: result });
  } catch (error) {
    console.error("[Pharmacies API] 에러:", error);
    return NextResponse.json({
      pharmacies: [],
      error: "약국 정보를 가져오는데 실패했습니다.",
    });
  }
}
