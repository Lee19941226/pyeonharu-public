import { createClient } from "@/lib/supabase/server";
import { getChosung } from "@/lib/utils/chosung";
import { NextResponse } from "next/server";

export async function GET() {
  const serviceKey = process.env.FOOD_API_KEY || "";
  const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";
  const supabase = await createClient();

  let pageNo = 1;
  let totalSynced = 0;

  while (true) {
    const url = `${baseUrl}/getFoodQrAllrgyInfo01?serviceKey=${serviceKey}&pageNo=${pageNo}&numOfRows=1000&type=json`;
    const res = await fetch(url);
    const data = await res.json();

    const items = data.body?.items || [];
    if (items.length === 0) break; // 더 이상 데이터 없으면 종료

    // DB에 저장
    const insertData = items.map((item: any) => ({
      food_code: item.BRCD_NO,
      food_name: item.PRDLST_NM,
      manufacturer: item.BSSH_NM,
      allergens: [item.ALLERGY1, item.ALLERGY2, item.ALLERGY3].filter(Boolean),
      raw_materials: item.RAWMTRL_NM,
      weight: item.CPCTY,
      data_source: "openapi",
      chosung: getChosung(item.PRDLST_NM),
      created_at: new Date().toISOString(),
    }));

    await supabase
      .from("food_search_cache")
      .upsert(insertData, { onConflict: "food_code" });

    totalSynced += items.length;
    pageNo++;

    // API 부하 방지 (1초 대기)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return NextResponse.json({ success: true, totalSynced });
}
