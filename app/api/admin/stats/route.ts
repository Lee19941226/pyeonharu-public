import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/utils/admin-auth";
// 서버사이드 Supabase (service_role로 RLS 우회)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 날짜 헬퍼
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30"; // 기본 30일
  const days = parseInt(period);
  const supabase = await createServerClient();
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;
  try {
    // ═══ 1. 사용자 통계 ═══
    // 전체 가입자 수
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 일별 신규 가입자 (최근 N일)
    const { data: dailySignups } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", daysAgo(days))
      .order("created_at", { ascending: true });

    // 일별 집계
    const signupsByDate: Record<string, number> = {};
    dailySignups?.forEach((row) => {
      const date = row.created_at?.slice(0, 10);
      if (date) signupsByDate[date] = (signupsByDate[date] || 0) + 1;
    });

    // ═══ 2. 활성 사용자 (DAU/WAU/MAU) ═══
    // food_scan_logs, food_check_history, community_posts, diet_entries 기반
    const now = new Date();

    // DAU - 오늘 활동한 고유 사용자
    const todayStart = startOfDay(now);
    const dauSets = await Promise.all([
      supabase
        .from("food_scan_logs")
        .select("user_id")
        .gte("scanned_at", todayStart),
      supabase
        .from("community_posts")
        .select("user_id")
        .gte("created_at", todayStart),
      supabase
        .from("community_comments")
        .select("user_id")
        .gte("created_at", todayStart),
      supabase
        .from("diet_entries")
        .select("user_id")
        .gte("created_at", todayStart),
      supabase
        .from("food_search_logs")
        .select("user_id")
        .gte("searched_at", todayStart),
    ]);
    const dauUsers = new Set<string>();
    dauSets.forEach((res) =>
      res.data?.forEach((r) => r.user_id && dauUsers.add(r.user_id)),
    );
    const dau = dauUsers.size;

    // WAU - 최근 7일
    const wauSets = await Promise.all([
      supabase
        .from("food_scan_logs")
        .select("user_id")
        .gte("scanned_at", daysAgo(7)),
      supabase
        .from("community_posts")
        .select("user_id")
        .gte("created_at", daysAgo(7)),
      supabase
        .from("community_comments")
        .select("user_id")
        .gte("created_at", daysAgo(7)),
      supabase
        .from("diet_entries")
        .select("user_id")
        .gte("created_at", daysAgo(7)),
      supabase
        .from("food_search_logs")
        .select("user_id")
        .gte("searched_at", daysAgo(7)),
    ]);
    const wauUsers = new Set<string>();
    wauSets.forEach((res) =>
      res.data?.forEach((r) => r.user_id && wauUsers.add(r.user_id)),
    );
    const wau = wauUsers.size;

    // MAU - 최근 30일
    const mauSets = await Promise.all([
      supabase
        .from("food_scan_logs")
        .select("user_id")
        .gte("scanned_at", daysAgo(30)),
      supabase
        .from("community_posts")
        .select("user_id")
        .gte("created_at", daysAgo(30)),
      supabase
        .from("community_comments")
        .select("user_id")
        .gte("created_at", daysAgo(30)),
      supabase
        .from("diet_entries")
        .select("user_id")
        .gte("created_at", daysAgo(30)),
      supabase
        .from("food_search_logs")
        .select("user_id")
        .gte("searched_at", daysAgo(30)),
    ]);
    const mauUsers = new Set<string>();
    mauSets.forEach((res) =>
      res.data?.forEach((r) => r.user_id && mauUsers.add(r.user_id)),
    );
    const mau = mauUsers.size;

    // ═══ 3. 일별 활성 사용자 추이 (DAU 트렌드) ═══
    const dauTrend: { date: string; dau: number }[] = [];
    // 최근 N일간 일별 DAU 계산 (food_scan_logs + food_check_history + community 활동 기반)
    const allActivityLogs = await Promise.all([
      supabase
        .from("food_scan_logs")
        .select("user_id, scanned_at")
        .gte("scanned_at", daysAgo(days)),
      supabase
        .from("community_posts")
        .select("user_id, created_at")
        .gte("created_at", daysAgo(days)),
      supabase
        .from("community_comments")
        .select("user_id, created_at")
        .gte("created_at", daysAgo(days)),
      supabase
        .from("diet_entries")
        .select("user_id, created_at")
        .gte("created_at", daysAgo(days)),
    ]);

    const dailyActiveMap: Record<string, Set<string>> = {};
    allActivityLogs.forEach((res) => {
      res.data?.forEach((r: any) => {
        const ts =
          r.scanned_at || r.checked_at || r.created_at || r.searched_at;
        const date = ts?.slice(0, 10);
        if (date && r.user_id) {
          if (!dailyActiveMap[date]) dailyActiveMap[date] = new Set();
          dailyActiveMap[date].add(r.user_id);
        }
      });
    });

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dauTrend.push({
        date: dateStr,
        dau: dailyActiveMap[dateStr]?.size || 0,
      });
    }

    // ═══ 4. 기능별 사용 횟수 ═══
    const { count: totalScans } = await supabase
      .from("food_scan_logs")
      .select("*", { count: "exact", head: true })
      .gte("scanned_at", daysAgo(days));

    const { count: totalChecks } = await supabase
      .from("food_check_history")
      .select("*", { count: "exact", head: true })
      .gte("checked_at", daysAgo(days));

    const { count: totalSearches } = await supabase
      .from("food_search_logs")
      .select("*", { count: "exact", head: true })
      .gte("searched_at", daysAgo(days));

    const { count: totalDietEntries } = await supabase
      .from("diet_entries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", daysAgo(days));

    // 일별 기능 사용량 (복합 차트용)
    const featureTrend: Record<
      string,
      { scans: number; checks: number; searches: number; diet: number }
    > = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      featureTrend[dateStr] = { scans: 0, checks: 0, searches: 0, diet: 0 };
    }

    const [scanLogs, checkLogs, searchLogs, dietLogs] = await Promise.all([
      supabase
        .from("food_scan_logs")
        .select("scanned_at")
        .gte("scanned_at", daysAgo(days)),
      supabase
        .from("food_check_history")
        .select("checked_at")
        .gte("checked_at", daysAgo(days)),
      supabase
        .from("food_search_logs")
        .select("searched_at")
        .gte("searched_at", daysAgo(days)),
      supabase
        .from("diet_entries")
        .select("created_at")
        .gte("created_at", daysAgo(days)),
    ]);

    scanLogs.data?.forEach((r) => {
      const d = r.scanned_at?.slice(0, 10);
      if (d && featureTrend[d]) featureTrend[d].scans++;
    });
    checkLogs.data?.forEach((r) => {
      const d = r.checked_at?.slice(0, 10);
      if (d && featureTrend[d]) featureTrend[d].checks++;
    });
    searchLogs.data?.forEach((r) => {
      const d = r.searched_at?.slice(0, 10);
      if (d && featureTrend[d]) featureTrend[d].searches++;
    });
    dietLogs.data?.forEach((r) => {
      const d = r.created_at?.slice(0, 10);
      if (d && featureTrend[d]) featureTrend[d].diet++;
    });

    const featureTrendArray = Object.entries(featureTrend).map(([date, v]) => ({
      date,
      ...v,
    }));

    // ═══ 5. 커뮤니티 통계 ═══
    const { count: totalPosts } = await supabase
      .from("community_posts")
      .select("*", { count: "exact", head: true });

    const { count: recentPosts } = await supabase
      .from("community_posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", daysAgo(days));

    const { count: totalComments } = await supabase
      .from("community_comments")
      .select("*", { count: "exact", head: true });

    const { count: recentComments } = await supabase
      .from("community_comments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", daysAgo(days));

    // 일별 게시글/댓글 추이
    const communityTrend: Record<string, { posts: number; comments: number }> =
      {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      communityTrend[d.toISOString().slice(0, 10)] = { posts: 0, comments: 0 };
    }

    const [postLogs, commentLogs] = await Promise.all([
      supabase
        .from("community_posts")
        .select("created_at")
        .gte("created_at", daysAgo(days)),
      supabase
        .from("community_comments")
        .select("created_at")
        .gte("created_at", daysAgo(days)),
    ]);

    postLogs.data?.forEach((r) => {
      const d = r.created_at?.slice(0, 10);
      if (d && communityTrend[d]) communityTrend[d].posts++;
    });
    commentLogs.data?.forEach((r) => {
      const d = r.created_at?.slice(0, 10);
      if (d && communityTrend[d]) communityTrend[d].comments++;
    });

    const communityTrendArray = Object.entries(communityTrend).map(
      ([date, v]) => ({
        date,
        ...v,
      }),
    );

    // ═══ 6. 학교 등록 통계 ═══
    const { count: totalSchools } = await supabase
      .from("user_schools")
      .select("*", { count: "exact", head: true });

    // 학교별 등록 수 TOP 10
    const { data: schoolRanking } = await supabase
      .from("user_schools")
      .select("school_name");

    const schoolCounts: Record<string, number> = {};
    schoolRanking?.forEach((r) => {
      if (r.school_name)
        schoolCounts[r.school_name] = (schoolCounts[r.school_name] || 0) + 1;
    });
    const topSchools = Object.entries(schoolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // ═══ 7. 리텐션율 (간이) ═══
    // 7일 전에 활동한 사용자 중 최근 1일 내 재활동한 비율
    const weekAgoStart = daysAgo(8);
    const weekAgoEnd = daysAgo(7);
    const retentionBase = await Promise.all([
      supabase
        .from("food_scan_logs")
        .select("user_id")
        .gte("scanned_at", weekAgoStart)
        .lte("scanned_at", weekAgoEnd),
      supabase
        .from("community_posts")
        .select("user_id")
        .gte("created_at", weekAgoStart)
        .lte("created_at", weekAgoEnd),
    ]);
    const weekAgoUsers = new Set<string>();
    retentionBase.forEach((res) =>
      res.data?.forEach((r) => r.user_id && weekAgoUsers.add(r.user_id)),
    );

    const returnedUsers = new Set<string>();
    if (weekAgoUsers.size > 0) {
      dauSets.forEach((res) => {
        res.data?.forEach((r) => {
          if (r.user_id && weekAgoUsers.has(r.user_id))
            returnedUsers.add(r.user_id);
        });
      });
    }

    const retentionRate =
      weekAgoUsers.size > 0
        ? Math.round((returnedUsers.size / weekAgoUsers.size) * 100)
        : 0;

    // ═══ 응답 ═══
    return NextResponse.json({
      period: days,
      overview: {
        totalUsers: totalUsers || 0,
        dau,
        wau,
        mau,
        retentionRate,
        stickiness: mau > 0 ? Math.round((dau / mau) * 100) : 0, // DAU/MAU 비율
      },
      signups: {
        total: totalUsers || 0,
        recent: dailySignups?.length || 0,
        trend: Object.entries(signupsByDate).map(([date, count]) => ({
          date,
          count,
        })),
      },
      features: {
        scans: totalScans || 0,
        checks: totalChecks || 0,
        searches: totalSearches || 0,
        dietEntries: totalDietEntries || 0,
        trend: featureTrendArray,
      },
      community: {
        totalPosts: totalPosts || 0,
        recentPosts: recentPosts || 0,
        totalComments: totalComments || 0,
        recentComments: recentComments || 0,
        trend: communityTrendArray,
      },
      schools: {
        total: totalSchools || 0,
        topSchools,
      },
      dauTrend,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 500 });
  }
}
