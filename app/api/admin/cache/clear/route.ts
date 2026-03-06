import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/admin/cache/clear — 캐시 통계 조회
export async function GET() {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getAdminClient();

  const { count, error } = await supabase
    .from("food_search_cache")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ totalCount: count || 0 });
}

// POST /api/admin/cache/clear
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { type, days, foodCode } = body;

  const supabase = getAdminClient();

  if (type === "all") {
    // 전체 캐시 삭제
    const { error } = await supabase
      .from("food_search_cache")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // 전체 삭제 트릭

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: "전체 캐시가 삭제되었습니다.",
    });
  }

  if (type === "old" && days) {
    // N일 이전 캐시 삭제
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { error, count } = await supabase
      .from("food_search_cache")
      .delete()
      .lt("created_at", cutoff.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: `${days}일 이전 캐시가 삭제되었습니다.`,
      deleted: count,
    });
  }

  if (type === "code" && foodCode) {
    // 특정 식품코드 캐시 삭제
    const { error, count } = await supabase
      .from("food_search_cache")
      .delete()
      .eq("food_code", foodCode);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: `식품코드 ${foodCode} 캐시가 삭제되었습니다.`,
      deleted: count,
    });
  }

  return NextResponse.json(
    { error: "type은 'all', 'old', 'code' 중 하나여야 합니다." },
    { status: 400 },
  );
}
