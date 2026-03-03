import { NextRequest, NextResponse } from "next/server";

// ─── 시도 중심 좌표 → 시도코드 매핑 (병원 API와 동일) ───
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

// 시도코드 → 한글 시도명 (Q0 파라미터용)
const SIDO_CODE_TO_NAME: Record<string, string> = {
  "110000": "서울특별시",
  "210000": "부산광역시",
  "220000": "대구광역시",
  "230000": "인천광역시",
  "240000": "광주광역시",
  "250000": "대전광역시",
  "260000": "울산광역시",
  "290000": "세종특별자치시",
  "310000": "경기도",
  "320000": "강원특별자치도",
  "330000": "충청북도",
  "340000": "충청남도",
  "350000": "전북특별자치도",
  "360000": "전라남도",
  "370000": "경상북도",
  "380000": "경상남도",
  "390000": "제주특별자치도",
};

const SIDO_FALLBACK: Record<string, string> = {
  강원특별자치도: "강원도",
  전북특별자치도: "전라북도",
  제주특별자치도: "제주도",
  세종특별자치시: "세종시",
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

  if (isNaN(userLat) || isNaN(userLng) || userLat === 0 || userLng === 0) {
    return NextResponse.json(
      { error: "유효한 위치 정보가 필요합니다.", pharmacies: [] },
      { status: 400 },
    );
  }
  if (isNaN(radiusM) || radiusM < 100 || radiusM > 5000) {
    return NextResponse.json(
      { error: "radius는 100~5000m 범위여야 합니다.", pharmacies: [] },
      { status: 400 },
    );
  }

  const radiusKm = radiusM / 1000;

  try {
    // 1) 위경도 → 시도코드
    const sidoCodes = getSidoCdByLocation(userLat, userLng);
    const allPharmacies: any[] = [];

    // 2) 각 시도에 대해 Q0(시도명) 기반 API 호출
    for (const sidoCd of sidoCodes) {
      const sidoName = SIDO_CODE_TO_NAME[sidoCd];
      if (!sidoName) continue;

      console.log(
        `[Pharmacies API] 시도코드=${sidoCd}, 시도명=${sidoName} 조회 중...`,
      );

      let text = await fetchPharmacyBySido(SERVICE_KEY, sidoName);

      // 결과 없으면 fallback 시도명으로 재시도
      if (
        (!text || text.includes("<totalCount>0</totalCount>")) &&
        SIDO_FALLBACK[sidoName]
      ) {
        console.log(
          `[Pharmacies API] fallback 시도: ${SIDO_FALLBACK[sidoName]}`,
        );
        text = await fetchPharmacyBySido(SERVICE_KEY, SIDO_FALLBACK[sidoName]);
      }

      if (!text) continue;

      parsePharmaciesXml(text, userLat, userLng, radiusKm, allPharmacies);
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

// ─── 시도명 기반 약국 API 호출 (URLSearchParams 방식 - 이전 동작 검증됨) ───
async function fetchPharmacyBySido(
  serviceKey: string,
  sidoName: string,
): Promise<string | null> {
  const baseUrl =
    "https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire";

  // ★ URLSearchParams.append 방식 사용 (이전 디버그 버전에서 200 OK 확인됨)
  const params = new URLSearchParams();
  params.append("serviceKey", serviceKey);
  params.append("Q0", sidoName);
  params.append("pageNo", "1");
  params.append("numOfRows", "1000");
  params.append("ORD", "NAME");

  const url = `${baseUrl}?${params.toString()}`;

  console.log(`[Pharmacies API] 요청: Q0=${sidoName}, numOfRows=1000`);

  const response = await fetch(url, {
    headers: { Accept: "application/xml" },
  });

  if (!response.ok) {
    console.error(
      `[Pharmacies API] API 에러: ${response.status} (${sidoName})`,
    );
    return null;
  }

  return response.text();
}

// ─── XML 파싱 헬퍼 ───
function parsePharmaciesXml(
  text: string,
  userLat: number,
  userLng: number,
  radiusKm: number,
  allPharmacies: any[],
) {
  const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
  const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  let parsed = 0;
  let withinRadius = 0;

  while ((match = itemRegex.exec(text)) !== null) {
    const itemXml = match[1];
    parsed++;

    const getValue = (tag: string): string => {
      const pattern = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
      const m = pattern.exec(itemXml);
      return m ? m[1].trim() : "";
    };

    const dutyName = getValue("dutyName");
    const pLat = parseFloat(getValue("wgs84Lat")) || 0;
    const pLng = parseFloat(getValue("wgs84Lon")) || 0;

    if (!dutyName || pLat === 0 || pLng === 0) continue;

    // 거리 계산
    const dist = haversine(userLat, userLng, pLat, pLng);

    // 반경 내만 포함
    if (dist > radiusKm) continue;
    withinRadius++;

    allPharmacies.push({
      hpid: getValue("hpid") || String(Math.random()),
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
    `[Pharmacies API] 파싱: ${parsed}개 중 반경 내 ${withinRadius}개 (총 ${totalCount}개)`,
  );
}
