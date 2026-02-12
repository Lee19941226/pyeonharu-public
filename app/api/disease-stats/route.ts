import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.DISEASE_API_KEY || process.env.DATA_GO_KR_API_KEY;
const BASE_URL = "https://apis.data.go.kr/1790387/EIDAPIService";

// 媛먯뿼蹂묐퀎 諛쒖깮 ?꾪솴
async function getDiseaseStats(year: string, numOfRows: number = 100) {
  const url = `${BASE_URL}/Disease?serviceKey=${API_KEY}&resType=2&searchType=1&searchYear=${year}&patntType=1&numOfRows=${numOfRows}&pageNo=1`;

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (error) {
    console.error("getDiseaseStats error:", error);
    return null;
  }
}

// 吏??퀎 媛먯뿼蹂?諛쒖깮 ?꾪솴 - 紐⑤뱺 ?쒕룄 ?곗씠??媛?몄삤湲?async function getRegionStats(year: string) {
  // ?쒕룄 肄붾뱶: 01~17 (00? ?꾩껜)
  const sidoCodes = [
    { code: "01", name: "?쒖슱" },
    { code: "02", name: "遺?? },
    { code: "03", name: "?援? },
    { code: "04", name: "?몄쿇" },
    { code: "05", name: "愿묒＜" },
    { code: "06", name: "??? },
    { code: "07", name: "?몄궛" },
    { code: "08", name: "寃쎄린" },
    { code: "09", name: "媛뺤썝" },
    { code: "10", name: "異⑸턿" },
    { code: "11", name: "異⑸궓" },
    { code: "12", name: "?꾨턿" },
    { code: "13", name: "?꾨궓" },
    { code: "14", name: "寃쎈턿" },
    { code: "15", name: "寃쎈궓" },
    { code: "16", name: "?쒖＜" },
    { code: "17", name: "?몄쥌" },
  ];

  // 紐⑤뱺 吏??蹂묐젹 ?붿껌
  const results = await Promise.all(
    sidoCodes.map(async (sido) => {
      const url = `${BASE_URL}/Region?serviceKey=${API_KEY}&resType=2&searchType=1&searchYear=${year}&searchSidoCd=${sido.code}&numOfRows=100&pageNo=1`;

      try {
        const response = await fetch(url, { next: { revalidate: 3600 } });
        const data = await response.json();

        const items = data?.response?.body?.items?.item;
        if (!items) return null;

        const itemList = Array.isArray(items) ? items : [items];

        // ?대떦 吏??쓽 媛먯뿼蹂묐퀎 諛쒖깮 嫄댁닔 吏묎퀎
        let total = 0;
        const diseases: { name: string; count: number }[] = [];

        itemList.forEach((item: any) => {
          const count = parseInt(
            item.resultVal?.toString().replace(/,/g, "") || "0",
          );
          const diseaseName = item.icdNm?.replace("@", "").trim() || "";

          if (count > 0 && diseaseName) {
            total += count;
            diseases.push({ name: diseaseName, count });
          }
        });

        return {
          name: sido.name,
          total,
          diseases: diseases.sort((a, b) => b.count - a.count).slice(0, 10),
        };
      } catch (error) {
        console.error(`Region ${sido.name} error:`, error);
        return null;
      }
    }),
  );

  // null ?쒓굅?섍퀬 ?뺣젹
  return results
    .filter((r): r is NonNullable<typeof r> => r !== null && r.total > 0)
    .sort((a, b) => b.total - a.total);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const limit = parseInt(searchParams.get("limit") || "100");

  const currentYear = new Date().getFullYear().toString(); // '2026'
  const now = new Date();
  const dataTimestamp = now.toISOString();

  try {
    if (type === "disease") {
      const data = await getDiseaseStats(currentYear, limit);
      return NextResponse.json({
        success: true,
        timestamp: dataTimestamp,
        dataYear: currentYear,
        data,
      });
    }

    if (type === "region") {
      const data = await getRegionStats(currentYear);
      return NextResponse.json({
        success: true,
        timestamp: dataTimestamp,
        dataYear: currentYear,
        data,
      });
    }

    // ?꾩껜 ?곗씠??(硫붿씤?섏씠吏??
    const [diseaseData, regionData] = await Promise.all([
      getDiseaseStats(currentYear, 100),
      getRegionStats(currentYear),
    ]);

    // 媛먯뿼蹂??곗씠??媛怨?    let processedDiseases: any[] = [];
    const diseaseItems = diseaseData?.response?.body?.items?.item;

    if (diseaseItems && Array.isArray(diseaseItems)) {
      processedDiseases = diseaseItems
        .filter((item: any) => {
          const val = item.resultVal?.toString().replace(/,/g, "");
          return val && val !== "0" && val !== "-";
        })
        .map((item: any) => ({
          name: item.icdNm?.replace("@", "").trim() || "?????놁쓬",
          count: parseInt(item.resultVal?.toString().replace(/,/g, "") || "0"),
          group: item.icdGroupNm || "",
          year: item.year || currentYear,
        }))
        .sort((a: any, b: any) => b.count - a.count);
    }

    // 吏??퀎 ?곗씠??- getRegionStats媛 ?대? 媛怨듬맂 諛곗뿴 諛섑솚
    let processedRegions = regionData || [];


    // 吏???곗씠?곌? ?놁쑝硫??섑뵆 ?ъ슜
    let isRegionSample = false;
    if (processedRegions.length === 0) {
      isRegionSample = true;
      processedRegions = [
        {
          name: "?쒖슱",
          total: 28453,
          diseases: [
            { name: "諛깆씪??, count: 8234 },
            { name: "CRE 媛먯뿼利?, count: 7821 },
            { name: "?섎몢", count: 5432 },
          ],
        },
        {
          name: "寃쎄린",
          total: 35621,
          diseases: [
            { name: "諛깆씪??, count: 12453 },
            { name: "CRE 媛먯뿼利?, count: 9876 },
            { name: "?섎몢", count: 6543 },
          ],
        },
        {
          name: "遺??,
          total: 12876,
          diseases: [
            { name: "諛깆씪??, count: 4532 },
            { name: "CRE 媛먯뿼利?, count: 3876 },
            { name: "?섎몢", count: 2134 },
          ],
        },
        {
          name: "?援?,
          total: 8932,
          diseases: [
            { name: "諛깆씪??, count: 3421 },
            { name: "CRE 媛먯뿼利?, count: 2654 },
            { name: "?섎몢", count: 1543 },
          ],
        },
        {
          name: "?몄쿇",
          total: 11234,
          diseases: [
            { name: "諛깆씪??, count: 4123 },
            { name: "CRE 媛먯뿼利?, count: 3456 },
            { name: "?섎몢", count: 2123 },
          ],
        },
        {
          name: "愿묒＜",
          total: 6543,
          diseases: [
            { name: "諛깆씪??, count: 2341 },
            { name: "CRE 媛먯뿼利?, count: 1987 },
            { name: "?섎몢", count: 1234 },
          ],
        },
        {
          name: "???,
          total: 5876,
          diseases: [
            { name: "諛깆씪??, count: 2134 },
            { name: "CRE 媛먯뿼利?, count: 1765 },
            { name: "?섎몢", count: 1098 },
          ],
        },
        {
          name: "?몄궛",
          total: 4321,
          diseases: [
            { name: "諛깆씪??, count: 1654 },
            { name: "CRE 媛먯뿼利?, count: 1234 },
            { name: "?섎몢", count: 876 },
          ],
        },
      ];
    }

    return NextResponse.json({
      success: true,
      timestamp: dataTimestamp,
      dataYear: currentYear,
      data: {
        diseases: processedDiseases,
        regions: processedRegions,
        isRegionSample,
        totalDiseaseCount: processedDiseases.reduce(
          (sum, d) => sum + d.count,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Disease stats API error:", error);
    return NextResponse.json(
      { success: false, error: "?곗씠?곕? 遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎." },
      { status: 500 },
    );
  }
}
