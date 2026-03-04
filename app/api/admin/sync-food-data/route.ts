import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChosung } from "@/lib/utils/chosung";
import { verifyAdmin } from "@/lib/utils/admin-auth";

export async function GET(req: NextRequest) {
  try {
    // ✅ Cron Secret 또는 관리자 인증 체크 추가
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Vercel Cron 또는 직접 호출 모두 검증
    const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
    if (!isCronRequest) {
      const auth = await verifyAdmin();
      if (!auth.ok) return auth.response;
    }

    const supabase = await createClient();
    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

    let pageNo = 1;
    let totalSynced = 0;

    console.log("🚀 식약처 데이터 동기화 시작...");

    const MAX_PAGES = 200;
    while (pageNo <= MAX_PAGES) {
      const url = new URL(`${baseUrl}/getFoodQrProdMnfInfo01`);
      url.searchParams.append("serviceKey", serviceKey);
      url.searchParams.append("pageNo", pageNo.toString());
      url.searchParams.append("numOfRows", "500");
      url.searchParams.append("type", "json");

      console.log(`📊 페이지 ${pageNo} 조회 중...`);
      const res = await fetch(url.toString());
      const data = await res.json();

      // ✅ 응답 구조 확인
      let items: any[] = [];
      if (Array.isArray(data.body?.items)) {
        items = data.body.items;
      } else if (data.body?.items?.item) {
        items = Array.isArray(data.body.items.item)
          ? data.body.items.item
          : [data.body.items.item];
      }

      console.log(`📦 페이지 ${pageNo}: ${items.length}개 발견`);

      if (items.length === 0) {
        console.log("✅ 더 이상 데이터 없음, 동기화 완료!");
        break;
      }

      // ✅ 페이지 내 중복 제거 + 마지막 값 유지
      const dataMap = new Map<string, any>();
      items.forEach((item: any) => {
        const foodName = item.PRDCT_NM || item.PRDLST_NM;
        const manufacturer = item.BUES_NM || item.BSSH_NM;
        const barcode = item.BRCD_NO;

        if (!barcode || !foodName) return;

        // 마지막 값 덮어쓰기
        dataMap.set(barcode, {
          food_code: barcode,
          food_name: foodName,
          manufacturer: manufacturer || null,
          allergens: [], // 나중에 매핑 가능
          raw_materials: null, // 나중에 매핑 가능
          weight: item.QNT || item.CPCTY || null,
          data_source: "openapi",
          chosung: getChosung(foodName),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

      // ✅ DB 저장: food_code 중복 시 최신으로 덮어쓰기
      const { error } = await supabase
        .from("food_search_cache")
        .upsert(insertData, { onConflict: "food_code" });

      if (error) {
        console.error(`❌ 페이지 ${pageNo} 저장 실패:`, error);
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
      message: `${totalSynced}개 제품 동기화 완료`,
    });
  } catch (error) {
    console.error("❌ 동기화 오류:", error);
    return NextResponse.json(
      { error: "동기화 중 오류 발생" },
      { status: 500 },
    );
  }
}
