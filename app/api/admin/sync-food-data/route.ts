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
    const maxPages = 2000;

    console.log("🚀 식약처 데이터 동기화 시작...");

    while (pageNo <= maxPages) {
      // ✅ 올바른 API: 품목제조정보
      const url = new URL(`${baseUrl}/getFoodQrProdMnfInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", pageNo.toString());
      url.searchParams.append("numOfRows", "500");
      url.searchParams.append("type", "json");

      console.log(`📊 페이지 ${pageNo} 조회 중...`);

      const res = await fetch(url.toString());
      const data = await res.json();

      // ✅ 응답 구조 확인
      let items = [];
      if (Array.isArray(data.body?.items)) {
        items = data.body.items;
      } else if (data.body?.items?.item) {
        items = Array.isArray(data.body.items.item)
          ? data.body.items.item
          : [data.body.items.item];
      }

      console.log(`📦 페이지 ${pageNo}: ${items.length}개 발견`);

      if (items.length > 0 && pageNo === 1) {
        console.log(
          "🔍 첫 번째 아이템 구조:",
          JSON.stringify(items[0], null, 2),
        );
      }

      if (items.length === 0) {
        console.log("✅ 더 이상 데이터 없음, 동기화 완료!");
        break;
      }
      // ✅ DB에 저장할 데이터 준비 (중복 제거)
      const dataMap = new Map<string, any>();

      items.forEach((item: any) => {
        const foodName = item.PRDCT_NM || item.PRDLST_NM;
        const manufacturer = item.BUES_NM || item.BSSH_NM;
        const barcode = item.BRCD_NO;

        if (!barcode || !foodName) return;

        // ✅ 이미 있으면 스킵 (첫 번째 것만 사용)
        if (dataMap.has(barcode)) {
          return;
        }

        dataMap.set(barcode, {
          food_code: barcode,
          food_name: foodName,
          manufacturer: manufacturer || null,
          allergens: [],
          raw_materials: null,
          weight: item.QNT || item.CPCTY || null,
          data_source: "openapi",
          chosung: getChosung(foodName),
          created_at: new Date().toISOString(),
        });
      });

      const insertData = Array.from(dataMap.values());

      console.log(
        `💾 페이지 ${pageNo}: ${items.length}개 중 ${insertData.length}개 저장 가능`,
      );

      if (insertData.length === 0) {
        console.warn(`⚠️ 페이지 ${pageNo}: 저장할 데이터 없음 (필터링됨)`);
        pageNo++;
        continue;
      }

      console.log(`💾 페이지 ${pageNo}: ${insertData.length}개 저장 시작...`);

      // ✅ DB 저장
      const { error } = await supabase
        .from("food_search_cache")
        .upsert(insertData, { onConflict: "food_code" });

      if (error) {
        console.error(`❌ 페이지 ${pageNo} 저장 실패:`, error);
        // 에러 발생해도 계속 진행
      } else {
        totalSynced += insertData.length;
        console.log(
          `✅ 페이지 ${pageNo}: ${insertData.length}개 저장 완료 (누적: ${totalSynced}개)`,
        );
      }

      pageNo++;

      // API 부하 방지
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
