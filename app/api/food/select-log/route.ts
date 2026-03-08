import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/utils/action-log";

// POST /api/food/select-log — 검색 결과 선택 기록
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await req.json();
  const { query, foodCode, foodName, dataSource, sourcePage } = body;

  if (!foodCode || !foodName) {
    return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
  }

  logAction({
    userId: user?.id || null,
    actionType: "food_select",
    metadata: {
      query: query || "",
      food_code: foodCode,
      food_name: foodName,
      data_source: dataSource || "",
      source_page: sourcePage || "",
    },
  });

  return NextResponse.json({ success: true });
}
