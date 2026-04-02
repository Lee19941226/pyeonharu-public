import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseJsonObjectSafe } from "@/lib/utils/ai-safety";

// 카테고리별 일반적인 알레르기 위험 성분 매핑
const CATEGORY_ALLERGY_MAP: Record<string, string[]> = {
  한식: ["대두", "밀", "참깨", "쇠고기", "돼지고기", "계란"],
  중식: ["밀", "대두", "땅콩", "갑각류", "참깨", "계란"],
  중국식: ["밀", "대두", "땅콩", "갑각류", "참깨", "계란"],
  일식: ["밀", "대두", "갑각류", "조개류", "고등어", "새우", "게"],
  "일식/수산물": ["밀", "대두", "갑각류", "조개류", "고등어", "새우", "게"],
  양식: ["밀", "우유", "계란", "대두", "쇠고기"],
  서양식: ["밀", "우유", "계란", "대두", "쇠고기"],
  "해물,생선요리": ["갑각류", "조개류", "고등어", "새우", "게", "오징어"],
  "육류,고기요리": ["쇠고기", "돼지고기", "닭고기", "대두", "밀"],
  분식: ["밀", "대두", "계란", "우유"],
  카페: ["우유", "대두", "밀", "견과류"],
  "제과,베이커리": ["밀", "계란", "우유", "견과류", "대두"],
  패스트푸드: ["밀", "대두", "계란", "우유", "쇠고기"],
  치킨: ["밀", "닭고기", "대두", "계란"],
  피자: ["밀", "우유", "대두", "돼지고기"],
  "곱창,막창": ["쇠고기", "돼지고기", "밀", "대두"],
  "족발,보쌈": ["돼지고기", "대두", "밀"],
  "찜,탕": ["대두", "밀", "쇠고기", "돼지고기", "갑각류"],
  국수: ["밀", "대두", "계란"],
  냉면: ["밀", "메밀", "대두", "계란", "쇠고기"],
  샤브샤브: ["쇠고기", "대두", "밀", "갑각류", "조개류"],
  태국식: ["땅콩", "갑각류", "대두", "밀"],
  동남아식: ["땅콩", "갑각류", "대두", "밀"],
  베트남식: ["땅콩", "갑각류", "대두", "밀", "고등어"],
  인도식: ["우유", "밀", "견과류", "대두"],
  멕시코식: ["밀", "우유", "대두", "쇠고기"],
  뷔페: ["밀", "대두", "계란", "우유", "갑각류", "견과류"],
  고기뷔페: ["쇠고기", "돼지고기", "닭고기", "밀", "대두"],
  "초밥,롤": ["밀", "대두", "갑각류", "조개류", "고등어", "새우"],
  돈까스: ["밀", "계란", "돼지고기", "대두"],
  떡볶이: ["밀", "대두", "계란"],
  순대: ["밀", "대두", "돼지고기"],
  김밥: ["밀", "대두", "계란", "참깨"],
  "김밥(도시락)": ["밀", "대두", "계란", "참깨"],
  죽: ["참깨", "대두", "쇠고기", "갑각류"],
  도시락: ["밀", "대두", "계란", "쇠고기"],
  아이스크림: ["우유", "계란", "대두", "견과류", "밀"],
  샐러드: ["견과류", "우유", "계란", "대두"],
  "호프/통닭": ["밀", "닭고기", "대두", "계란"],
  부대찌개: ["밀", "대두", "돼지고기", "우유"],
  감자탕: ["돼지고기", "대두", "밀"],
  삼겹살: ["돼지고기", "대두", "참깨"],
  곱창전골: ["쇠고기", "돼지고기", "밀", "대두"],
  "백반/한정식": ["대두", "밀", "참깨", "쇠고기", "돼지고기", "계란"],
  국밥: ["대두", "밀", "돼지고기", "쇠고기"],
  설렁탕: ["쇠고기", "밀", "대두"],
  갈비: ["쇠고기", "대두", "참깨", "밀"],
  불고기: ["쇠고기", "대두", "참깨", "밀"],
  닭갈비: ["닭고기", "밀", "대두", "참깨"],
  닭볶음탕: ["닭고기", "대두", "밀"],
  해장국: ["대두", "돼지고기", "쇠고기"],
  순두부: ["대두", "갑각류", "조개류"],
  보리밥: ["밀", "대두", "참깨"],
  회: ["갑각류", "조개류", "고등어", "새우", "게"],
  횟집: ["갑각류", "조개류", "고등어", "새우", "게"],
  생선회: ["갑각류", "조개류", "고등어", "새우", "게"],
  "카페/찻집": ["우유", "대두", "밀", "견과류"],
  커피전문점: ["우유", "대두"],
  제과점: ["밀", "계란", "우유", "견과류", "대두"],
  "탕/찌개": ["대두", "밀", "쇠고기", "돼지고기"],
  "국/탕/찌개류": ["대두", "밀", "쇠고기", "돼지고기"],
  구이: ["쇠고기", "돼지고기", "대두", "참깨"],
  "한식 일반": ["대두", "밀", "참깨", "쇠고기", "돼지고기", "계란"],
  "일식 일반": ["밀", "대두", "갑각류", "조개류", "고등어"],
  "중식 일반": ["밀", "대두", "땅콩", "갑각류", "계란"],
  커피: ["우유", "대두"],
  음료: ["우유", "대두"],
  주점: ["밀", "대두", "땅콩"],
};

// 사용자 알레르기 기반 위험도 계산
function calculateRisk(
  categoryAllergens: string[],
  userAllergens: string[],
): { level: "safe" | "caution" | "danger"; matched: string[] } {
  const matched = categoryAllergens.filter((a) => userAllergens.includes(a));

  if (matched.length === 0) return { level: "safe", matched: [] };
  if (matched.length >= 3) return { level: "danger", matched };
  return { level: "caution", matched };
}

// Haversine 거리 계산 (km)
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

// 상가정보 API 업종 소분류명에서 간단 카테고리 추출
function simplifyCategory(indsSclsNm: string, indsMclsNm: string): string {
  return indsSclsNm || indsMclsNm || "음식점";
}

// 카테고리 매칭 (부분 일치)
function findAllergens(
  category: string,
  userAllergens: string[],
): { level: "safe" | "caution" | "danger"; matched: string[] } {
  if (CATEGORY_ALLERGY_MAP[category]) {
    return calculateRisk(CATEGORY_ALLERGY_MAP[category], userAllergens);
  }

  for (const [key, allergens] of Object.entries(CATEGORY_ALLERGY_MAP)) {
    if (category.includes(key) || key.includes(category)) {
      return calculateRisk(allergens, userAllergens);
    }
  }

  return calculateRisk(["대두", "밀"], userAllergens);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const headersList = req.headers;
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "unknown";

  const rateLimitKey = `restaurant:ip:${ipAddress}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 1000);

  const supabaseForRate = await createClient();
  const { count: recentCount } = await supabaseForRate
    .from("restaurant_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", rateLimitKey)
    .gte("searched_at", windowStart.toISOString());

  if ((recentCount || 0) >= 20) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // 비동기로 기록 (응답 대기 안 함)
  supabaseForRate
    .from("restaurant_rate_limits")
    .insert({ identifier: rateLimitKey, searched_at: now.toISOString() })
    .then(({ error }) => {
      if (error) console.error("rate limit 기록 실패:", error);
    });

  const userLat = parseFloat(searchParams.get("lat") || "0");
  const userLng = parseFloat(searchParams.get("lng") || "0");
  const radius = searchParams.get("radius") || "2000";
  const query = searchParams.get("query") || "";
  const page = searchParams.get("page") || "1";

  if (!userLat || !userLng) {
    return NextResponse.json(
      { error: "위치 정보(lat, lng)가 필요합니다." },
      { status: 400 },
    );
  }

  const serviceKey = process.env.SBIZ_API_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "상가정보 API 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    // 1. 사용자 알레르기 조회
    let userAllergens: string[] = [];
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: allergyData } = await supabase
          .from("user_allergies")
          .select("allergen_name")
          .eq("user_id", user.id);

        if (allergyData && allergyData.length > 0) {
          userAllergens = allergyData.map((a: any) => a.allergen_name);
        }
      }
    } catch {
      // 비로그인도 허용
    }

    // 2. 소상공인 상가정보 API - 반경 내 상가업소 조회
    // ※ PDF 명세서 기준 (2025.06 OpenAPI 활용가이드)
    // - 엔드포인트: /B553077/api/open/sdsc2/storeListInRadius
    // - 필수: serviceKey, radius, cx(경도), cy(위도)
    // - 옵션: indsLclsCd(업종대분류), numOfRows, pageNo, type
    // - radius 최대 2000m
    // - cx=경도, cy=위도 (주의: cx가 경도(lng), cy가 위도(lat))

    let decodedKey = serviceKey;
    // 환경변수에 URL 인코딩된 키가 저장된 경우 디코딩
    if (decodedKey.includes("%")) {
      try {
        decodedKey = decodeURIComponent(decodedKey);
      } catch {
        /* 원본 사용 */
      }
    }

    const numOfRows = 200; // 음식점만 필터하므로 더 많이 가져오기
    const endpoint =
      "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius";

    // ★ 핵심 수정: indsLclsCd=I2 (음식점 대분류) 필터 적용
    // ★ 핵심 수정: serviceKey 파라미터명 (PDF 명세서 기준 소문자 s)
    const apiUrl = new URL(endpoint);
    apiUrl.searchParams.append("serviceKey", decodedKey);
    apiUrl.searchParams.append(
      "radius",
      Math.min(parseInt(radius), 2000).toString(),
    );
    apiUrl.searchParams.append("cx", userLng.toString()); // cx = 경도(lng)
    apiUrl.searchParams.append("cy", userLat.toString()); // cy = 위도(lat)
    apiUrl.searchParams.append("indsLclsCd", "I2"); // ★ 음식점만 조회
    apiUrl.searchParams.append("numOfRows", numOfRows.toString());
    apiUrl.searchParams.append("pageNo", page);
    apiUrl.searchParams.append("type", "json");
    if (process.env.NODE_ENV === "development") {
      console.log("[Restaurant Search] API URL:", apiUrl.toString().replace(decodedKey, "***KEY***"));
    }

    let apiData: any = null;
    let debugInfo: any = {};

    try {
      const apiRes = await fetch(apiUrl.toString());
      const apiText = await apiRes.text();

      debugInfo = {
        status: apiRes.status,
        contentType: apiRes.headers.get("content-type"),
        rawPreview: apiText.slice(0, 300),
      };

      if (apiRes.ok) {
        // JSON 응답 파싱
        if (apiText.trim().startsWith("{") || apiText.trim().startsWith("[")) {
          apiData = parseJsonObjectSafe<Record<string, unknown>>(apiText);
        } else if (apiText.includes("<resultCode>")) {
          // XML 응답이 온 경우 (type=json인데 XML이 오는 에러 상황)
          const resultCode = apiText.match(
            /<resultCode>([^<]+)<\/resultCode>/,
          )?.[1];
          const resultMsg = apiText.match(
            /<resultMsg>([^<]+)<\/resultMsg>/,
          )?.[1];
          debugInfo.xmlError = { resultCode, resultMsg };
          console.error(
            "[Restaurant Search] XML 응답 수신:",
            resultCode,
            resultMsg,
          );
        }
      }
    } catch (fetchErr: any) {
      debugInfo.fetchError = fetchErr?.message;
      console.error("[Restaurant Search] Fetch error:", fetchErr);
    }

    // 3. 응답 데이터 파싱
    // PDF 명세서 기준 JSON 구조:
    // { header: { resultCode, resultMsg, ... }, body: { items: [...], numOfRows, pageNo, totalCount } }
    let items: any[] = [];
    let totalCount = 0;

    if (apiData) {
      // 정상 응답 구조 (PDF 명세서 기준)
      if (apiData.body?.items) {
        items = Array.isArray(apiData.body.items)
          ? apiData.body.items
          : [apiData.body.items];
        totalCount = apiData.body.totalCount || items.length;
      }
      // 간혹 다른 구조로 올 수 있는 경우 대비
      else if (apiData.items) {
        items = Array.isArray(apiData.items) ? apiData.items : [apiData.items];
        totalCount = apiData.totalCount || items.length;
      }

      // 결과 코드 확인
      const resultCode = apiData.header?.resultCode || apiData.resultCode;
      const resultMsg = apiData.header?.resultMsg || apiData.resultMsg;

      if (resultCode && resultCode !== "00") {
        console.error("[Restaurant Search] API Error:", resultCode, resultMsg);
        debugInfo.apiError = { resultCode, resultMsg };
      }
    }

    // items 내부에 item 배열이 있는 경우도 대비 (XML→JSON 변환 시)
    if (items.length === 1 && Array.isArray(items[0]?.item)) {
      items = items[0].item;
    }

    // 4. 음식점 데이터 변환 + 알레르기 매칭
    const seenNames = new Set<string>();
    let restaurants = items
      .map((item: any) => {
        const name = item.bizesNm || "";
        if (!name || seenNames.has(name)) return null;
        seenNames.add(name);

        const lat = parseFloat(item.lat) || 0;
        const lng = parseFloat(item.lon) || 0;
        const category = simplifyCategory(
          item.indsSclsNm || "",
          item.indsMclsNm || "",
        );

        // 알레르기 매칭
        const risk = findAllergens(category, userAllergens);

        // 거리 계산
        let distance = "";
        let distanceKm = 9999;
        if (lat && lng) {
          distanceKm = haversine(userLat, userLng, lat, lng);
          distance =
            distanceKm < 1
              ? `${Math.round(distanceKm * 1000)}m`
              : `${distanceKm.toFixed(1)}km`;
        }

        // 텍스트 검색 필터 (query가 있으면)
        if (query) {
          const q = query
            .replace(/\s*(음식점|맛집)\s*/g, "")
            .trim()
            .toLowerCase();
          if (
            q &&
            !name.toLowerCase().includes(q) &&
            !category.toLowerCase().includes(q)
          ) {
            return null;
          }
        }

        return {
          name,
          category,
          categoryFull: `${item.indsLclsNm || ""}>${item.indsMclsNm || ""}>${item.indsSclsNm || ""}`,
          address: item.lnoAdr || "",
          roadAddress: item.rdnmAdr || "",
          lat,
          lng,
          phone: item.telNo || "",
          link: "",
          riskLevel: risk.level,
          matchedAllergens: risk.matched,
          categoryAllergens: CATEGORY_ALLERGY_MAP[category] || [],
          distance,
          distanceKm,
        };
      })
      .filter(Boolean);

    // 5. 거리순 정렬
    restaurants = restaurants.sort(
      (a: any, b: any) => a.distanceKm - b.distanceKm,
    );

    return NextResponse.json({
      success: true,
      total: totalCount,
      count: restaurants.length,
      page: parseInt(page),
      restaurants,
      userAllergens,
    });
  } catch (error) {
    console.error("[Restaurant Search] Error:", error);
    return NextResponse.json(
      { error: "음식점 검색 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}





