import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChosung } from "@/lib/utils/chosung";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

    let pageNo = 1;
    let totalSynced = 0;
    const maxPages = 2000; // 안전장치 (무한루프 방지)

    console.log("🚀 식약처 데이터 동기화 시작...");

    while (pageNo <= maxPages) {
      // 식약처 API 호출
      const url = new URL(`${baseUrl}/getFoodQrAllrgyInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", pageNo.toString());
      url.searchParams.append("numOfRows", "500");
      url.searchParams.append("type", "json");

      console.log(`📊 페이지 ${pageNo} 조회 중...`);
      console.log("🔗 요청 URL:", url.toString());
      const res = await fetch(url.toString());
      console.log("📡 HTTP Status:", res.status);
      const data = await res.json();
      console.log("📦 전체 응답:", JSON.stringify(data, null, 2));
      console.log("📦 header:", data.header);
      console.log("📦 body:", data.body);
      console.log("📦 items 개수:", data.body?.items?.length || 0);
      const items = data.body?.items || [];

      if (items.length === 0) {
        console.log("✅ 더 이상 데이터 없음, 동기화 완료!");
        break;
      }

      // DB에 저장할 데이터 준비
      const insertData = items
        .filter((item: any) => item.BRCD_NO && item.PRDLST_NM)
        .map((item: any) => {
          // 알레르기 정보 수집
          const allergens: string[] = [];
          if (item.ALLERGY1) allergens.push(item.ALLERGY1);
          if (item.ALLERGY2) allergens.push(item.ALLERGY2);
          if (item.ALLERGY3) allergens.push(item.ALLERGY3);
          if (item.ALLERGY4) allergens.push(item.ALLERGY4);
          if (item.ALLERGY5) allergens.push(item.ALLERGY5);
          if (item.ALLERGY6) allergens.push(item.ALLERGY6);

          return {
            food_code: item.BRCD_NO,
            food_name: item.PRDLST_NM,
            manufacturer: item.BSSH_NM || null,
            allergens: allergens.filter(Boolean),
            raw_materials: item.RAWMTRL_NM || null,
            weight: item.CPCTY || null,
            data_source: "openapi",
            chosung: getChosung(item.PRDLST_NM),
            created_at: new Date().toISOString(),
          };
        });
      console.log("💾 저장 시작:", insertData.length, "개");
      // DB 저장
      const { error } = await supabase
        .from("food_search_cache")
        .upsert(insertData, { onConflict: "food_code" });

      if (error) {
        console.error(`❌ 페이지 ${pageNo} 저장 실패:`, error);
      } else {
        totalSynced += items.length;
        console.log(
          `✅ 페이지 ${pageNo}: ${items.length}개 저장 (누적: ${totalSynced}개)`,
        );
      }

      pageNo++;

      // API 부하 방지 (1초 대기)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return NextResponse.json({
      success: true,
      totalSynced,
      totalPages: pageNo - 1,
      message: `${totalSynced}개 제품 동기화 완료`,
    });
  } catch (error) {
    console.error("❌ 동기화 오류:", error);
    return NextResponse.json(
      { success: false, error: "동기화 중 오류 발생" },
      { status: 500 },
    );
  }
}
