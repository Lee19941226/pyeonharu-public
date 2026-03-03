import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/utils/admin-auth";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    // 쿼리 파라미터
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const period = parseInt(searchParams.get("period") || "30");
    const searchQuery = searchParams.get("search") || "";

    const offset = (page - 1) * limit;

    // 날짜 필터
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // 검색 로그 조회
    let query = supabase
      .from("food_search_logs")
      .select("*", { count: "exact" })
      .gte("searched_at", startDate.toISOString())
      .order("searched_at", { ascending: false });

    // 검색어 필터링 (특수문자 이스케이프)
    if (searchQuery) {
      const safeQuery = searchQuery.replace(/[%_\\]/g, "");
      if (safeQuery) {
        query = query.ilike("search_query", `%${safeQuery}%`);
      }
    }

    const {
      data: logs,
      count,
      error,
    } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // 통계 계산
    const { data: stats } = await supabase
      .from("food_search_logs")
      .select("user_id, result_count, data_sources")
      .gte("searched_at", startDate.toISOString());

    const totalSearches = stats?.length || 0;
    const loggedInSearches =
      stats?.filter((s) => s.user_id !== null).length || 0;
    const anonymousSearches = totalSearches - loggedInSearches;
    const withResults = stats?.filter((s) => s.result_count > 0).length || 0;
    const avgResults = stats?.length
      ? (
          stats.reduce((sum, s) => sum + s.result_count, 0) / stats.length
        ).toFixed(1)
      : "0";

    // 데이터 소스 통계
    const sourceStats = {
      db: 0,
      openapi: 0,
      openfood: 0,
      ai: 0,
    };

    stats?.forEach((s) => {
      if (s.data_sources) {
        sourceStats.db += s.data_sources.db || 0;
        sourceStats.openapi += s.data_sources.openapi || 0;
        sourceStats.openfood += s.data_sources.openfood || 0;
        sourceStats.ai += s.data_sources.ai || 0;
      }
    });

    // 인기 검색어 (상위 10개)
    const { data: popularQueries } = await supabase
      .from("food_search_logs")
      .select("search_query")
      .gte("searched_at", startDate.toISOString());

    const queryCounts: Record<string, number> = {};
    popularQueries?.forEach((log) => {
      queryCounts[log.search_query] = (queryCounts[log.search_query] || 0) + 1;
    });

    const topQueries = Object.entries(queryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats: {
        totalSearches,
        loggedInSearches,
        anonymousSearches,
        withResults,
        avgResults,
        sourceStats,
      },
      topQueries,
    });
  } catch (error) {
    console.error("Search logs error:", error);
    return NextResponse.json({ error: "검색 로그 조회 실패" }, { status: 500 });
  }
}
