import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChosung } from "@/lib/utils/chosung";

export async function GET() {
  const supabase = await createClient();

  let offset = 0;
  const batchSize = 1000;
  let totalUpdated = 0;

  while (true) {
    // 초성이 없는 데이터 가져오기
    const { data: items } = await supabase
      .from("food_search_cache")
      .select("food_code, food_name")
      .is("chosung", null)
      .range(offset, offset + batchSize - 1);

    if (!items || items.length === 0) break;

    // 초성 생성 후 업데이트
    const updates = items.map((item) => ({
      food_code: item.food_code,
      chosung: getChosung(item.food_name),
    }));

    await supabase
      .from("food_search_cache")
      .upsert(updates, { onConflict: "food_code" });

    totalUpdated += items.length;
    offset += batchSize;

    console.log(`✅ ${totalUpdated}개 업데이트 완료`);
  }

  return NextResponse.json({
    success: true,
    totalUpdated,
  });
}
