import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const RATE_LIMIT_TABLES = [
  "api_rate_limits",
  "image_analyze_rate_limits",
  "symptom_rate_limits",
  "search_rate_limits",
  "restaurant_rate_limits",
] as const;

// GET /api/admin/rate-limit — 사용자 검색 (닉네임/ID)
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const supabase = getAdminClient();

  // UUID 형식이면 ID로 검색, 아니면 닉네임으로 검색
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      query,
    );

  let users: { id: string; nickname: string; email: string }[] = [];

  if (isUuid) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname")
      .eq("id", query)
      .limit(5);

    if (data) {
      const { data: authUsers } = await supabase.auth.admin.listUsers({
        perPage: 50,
      });
      users = data.map((p) => ({
        id: p.id,
        nickname: p.nickname || "닉네임 없음",
        email:
          authUsers?.users?.find((u) => u.id === p.id)?.email || "이메일 없음",
      }));
    }
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname")
      .ilike("nickname", `%${query}%`)
      .limit(5);

    if (data) {
      const { data: authUsers } = await supabase.auth.admin.listUsers({
        perPage: 50,
      });
      users = data.map((p) => ({
        id: p.id,
        nickname: p.nickname || "닉네임 없음",
        email:
          authUsers?.users?.find((u) => u.id === p.id)?.email || "이메일 없음",
      }));
    }
  }

  return NextResponse.json({ users });
}

// POST /api/admin/rate-limit — rate limit 초기화
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { type, userId } = body;

  if (type !== "all" && type !== "user") {
    return NextResponse.json(
      { error: "type은 'all' 또는 'user'여야 합니다." },
      { status: 400 },
    );
  }

  if (type === "user" && !userId) {
    return NextResponse.json(
      { error: "userId가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();
  const results: { table: string; success: boolean; error?: string }[] = [];

  for (const table of RATE_LIMIT_TABLES) {
    try {
      if (type === "all") {
        // 오늘자 데이터 전체 삭제
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // 테이블별 timestamp 컬럼명이 다름
        const tsCol =
          table === "image_analyze_rate_limits"
            ? "analyzed_at"
            : table === "search_rate_limits" || table === "restaurant_rate_limits"
              ? "searched_at"
              : "created_at";

        const { error } = await supabase
          .from(table)
          .delete()
          .gte(tsCol, todayStart.toISOString());

        results.push({
          table,
          success: !error,
          error: error?.message,
        });
      } else {
        // 특정 사용자의 데이터만 삭제 (identifier에 userId 포함)
        const { error } = await supabase
          .from(table)
          .delete()
          .like("identifier", `%${userId}%`);

        results.push({
          table,
          success: !error,
          error: error?.message,
        });
      }
    } catch (err: any) {
      results.push({
        table,
        success: false,
        error: err.message,
      });
    }
  }

  const allSuccess = results.every((r) => r.success);

  return NextResponse.json({
    success: allSuccess,
    results,
    message: allSuccess
      ? type === "all"
        ? "전체 rate limit 초기화 완료"
        : `사용자 ${userId} rate limit 초기화 완료`
      : "일부 테이블 초기화 실패",
  });
}
