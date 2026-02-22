import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // ✅ 관리자 권한 체크 제거 (또는 API 키 체크로 변경)
    const { authorization } = Object.fromEntries(req.headers);
    const apiKey = process.env.ADMIN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
    }

    if (authorization !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    console.log("🔄 불완전한 캐시 데이터 보완 시작...");

    // ✅ 요청 바디에서 limit 받기 (기본 50개씩)
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 50;

    // 1. 불완전한 데이터 조회
    const { data: incompleteCaches, error: fetchError } = await supabase
      .from("food_search_cache")
      .select("*")
      .eq("data_source", "openapi")
      .or("raw_materials.is.null,allergens.eq.{},nutrition_details.is.null")
      .limit(limit);

    if (fetchError) {
      console.error("❌ 조회 실패:", fetchError);
      return NextResponse.json({ error: "조회 실패" }, { status: 500 });
    }

    if (!incompleteCaches || incompleteCaches.length === 0) {
      return NextResponse.json({
        success: true,
        message: "보완할 데이터 없음",
        updated: 0,
        remaining: 0,
      });
    }

    console.log(`📊 불완전한 데이터 ${incompleteCaches.length}개 처리 시작`);

    const serviceKey = process.env.FOOD_API_KEY || "";
    const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";
    let updated = 0;
    let failed = 0;

    // 2. 각 항목별로 Open API 재호출
    for (const cache of incompleteCaches) {
      const code = cache.food_code;

      try {
        console.log(`🔍 ${cache.food_name} (${code}) 보완 중...`);

        console.log(`  📞 API 호출 시작: ${code}`);

        // Open API 병렬 호출
        const [rawMaterialResult, allergyResult, nutritionResult] =
          await Promise.allSettled([
            // 원재료
            (async () => {
              const url = `${baseUrl}/getFoodQrProdRawmtrl01?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=100&type=json&brcd_no=${code}`;
              console.log(`    🔹 원재료 API 호출...`);
              const response = await fetch(url);
              const data = await response.json();
              const items = data.body?.items || [];
              console.log(`    🔹 원재료 결과: ${items.length}개`);
              return items;
            })(),

            // 알레르기
            (async () => {
              const url = `${baseUrl}/getFoodQrAllrgyInfo01?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=100&type=json&brcd_no=${code}`;
              console.log(`    🔸 알레르기 API 호출...`);
              const response = await fetch(url);
              const data = await response.json();
              const items = data.body?.items || [];
              console.log(`    🔸 알레르기 결과: ${items.length}개`);
              return items;
            })(),

            // 영양정보
            (async () => {
              const url = `${baseUrl}/getFoodQrProdNsd01?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=50&type=json&brcd_no=${code}`;
              console.log(`    🔶 영양정보 API 호출...`);
              const response = await fetch(url);
              const data = await response.json();
              const items = data.body?.items || [];
              console.log(`    🔶 영양정보 결과: ${items.length}개`);
              return items;
            })(),
          ]);

        const rawMaterialItems =
          rawMaterialResult.status === "fulfilled"
            ? rawMaterialResult.value
            : [];
        const allergyItems =
          allergyResult.status === "fulfilled" ? allergyResult.value : [];
        const nutritionItems =
          nutritionResult.status === "fulfilled" ? nutritionResult.value : [];

        console.log(`  📊 API 결과 요약:`, {
          원재료: rawMaterialItems.length,
          알레르기: allergyItems.length,
          영양정보: nutritionItems.length,
        });
        // ✅ 실제 데이터 구조 확인 로그 추가
        if (rawMaterialItems.length > 0) {
          console.log(
            `  🔍 원재료 첫번째 항목:`,
            JSON.stringify(rawMaterialItems[0], null, 2),
          );
        }
        if (allergyItems.length > 0) {
          console.log(
            `  🔍 알레르기 첫번째 항목:`,
            JSON.stringify(allergyItems[0], null, 2),
          );
        }
        if (nutritionItems.length > 0) {
          console.log(
            `  🔍 영양정보 첫번째 항목:`,
            JSON.stringify(nutritionItems[0], null, 2),
          );
        }
        // 데이터 파싱
        const updateData: any = {};

        // ✅ 원재료 (여러 필드 시도)
        if (!cache.raw_materials && rawMaterialItems.length > 0) {
          const item = rawMaterialItems[0];
          const rawText =
            item.PRVW_CN ||
            item.RAWMTRL_CN ||
            item.RAWMTRL_NM ||
            item.RAW_MTRL_NM ||
            "";

          console.log(`  🔧 원재료 추출 시도:`, {
            rawText: rawText.substring(0, 100),
          });

          if (rawText) {
            updateData.raw_materials = rawText;
            console.log(`  ✅ 원재료 설정됨: ${rawText.length}자`);
          } else {
            console.log(
              `  ⚠️ 원재료 필드 못찾음. 사용 가능한 필드:`,
              Object.keys(item),
            );
          }
        }

        // ✅ 알레르기 (여러 필드 시도)
        if (
          (!cache.allergens || cache.allergens.length === 0) &&
          allergyItems.length > 0
        ) {
          const allergens = [
            ...new Set(
              allergyItems
                .map(
                  (item: any) =>
                    item.ALG_CSG_MTR_NM ||
                    item.ALLERGY_NM ||
                    item.ALG_NM ||
                    item.ALGN_NM ||
                    "",
                )
                .filter((name: string) => name && name.trim().length > 0),
            ),
          ];

          console.log(`  🔧 알레르기 추출:`, allergens);

          if (allergens.length > 0) {
            updateData.allergens = allergens;
            console.log(`  ✅ 알레르기 설정됨: ${allergens.length}개`);
          } else {
            console.log(
              `  ⚠️ 알레르기 필드 못찾음. 사용 가능한 필드:`,
              Object.keys(allergyItems[0]),
            );
          }
        }

        // ✅ 영양정보 (필드명 수정)
        if (
          (!cache.nutrition_details || cache.nutrition_details.length === 0) &&
          nutritionItems.length > 0
        ) {
          const nutritionDetails = nutritionItems
            .map((item: any) => {
              const name = item.NIRWMT_NM || "";
              const content = item.CTA || "";
              const unit = item.IGRD_UCD || "";

              // 1회제공량은 제외
              if (
                name.includes("1회제공량") ||
                name.includes("제공량") ||
                name.includes("총내용량")
              ) {
                return null;
              }

              return { name, content, unit };
            })
            .filter((item: any) => item && item.name && item.content);

          console.log(`  🔧 영양정보 추출: ${nutritionDetails.length}개`);

          if (nutritionDetails.length > 0) {
            console.log(`  📊 샘플:`, nutritionDetails.slice(0, 3));
          }

          if (nutritionDetails.length > 0) {
            updateData.nutrition_details = nutritionDetails;
            console.log(`  ✅ 영양정보 설정됨: ${nutritionDetails.length}개`);
          }

          // 1회 제공량
          const servingSizeItem = nutritionItems.find((item: any) => {
            const name = item.NIRWMT_NM || "";
            return name.includes("1회제공량") || name.includes("제공량");
          });

          if (servingSizeItem) {
            const content = servingSizeItem.CTA || "";
            const unit = servingSizeItem.IGRD_UCD || "";
            updateData.serving_size = `${content}${unit}`.trim();
            console.log(`  ✅ 1회제공량 설정됨: ${updateData.serving_size}`);
          } else {
            // 1회제공량 항목이 없으면 NTRTN_INDCT_TCT 사용
            if (nutritionItems.length > 0) {
              const firstItem = nutritionItems[0];
              const servingAmount = firstItem.NTRTN_INDCT_TCT || "";
              const servingUnit = firstItem.NTRTN_INDCT_TCD || "";
              if (servingAmount && servingUnit) {
                updateData.serving_size =
                  `${servingAmount}${servingUnit}`.trim();
                console.log(
                  `  ✅ 1회제공량 (전체량) 설정됨: ${updateData.serving_size}`,
                );
              }
            }
          }
        }

        console.log(`  📦 updateData 내용:`, Object.keys(updateData));
        // DB 업데이트
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("food_search_cache")
            .update(updateData)
            .eq("food_code", code);

          if (updateError) {
            console.error(`❌ ${code} 업데이트 실패:`, updateError);
            failed++;
          } else {
            updated++;
            console.log(
              `✅ ${cache.food_name} 보완 완료 (${updated}/${incompleteCaches.length})`,
            );
          }
        } else {
          console.log(`⚠️ ${cache.food_name} 보완할 데이터 없음`);
        }

        // API 부하 방지 (500ms 대기)
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ ${code} 처리 실패:`, error);
        failed++;
      }
    }

    // 남은 개수 확인
    const { count: remainingCount } = await supabase
      .from("food_search_cache")
      .select("*", { count: "exact", head: true })
      .eq("data_source", "openapi")
      .or("raw_materials.is.null,allergens.eq.{},nutrition_details.is.null");

    return NextResponse.json({
      success: true,
      message: `${updated}개 데이터 보완 완료`,
      processed: incompleteCaches.length,
      updated,
      failed,
      remaining: remainingCount || 0,
    });
  } catch (error) {
    console.error("💥 일괄 보완 오류:", error);
    return NextResponse.json(
      { success: false, error: "일괄 보완 실패" },
      { status: 500 },
    );
  }
}
