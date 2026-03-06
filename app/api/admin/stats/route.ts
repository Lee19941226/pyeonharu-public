import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";
// 서버사이드 Supabase (service_role로 RLS 우회) — 지연 초기화
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// 날짜 헬퍼 (KST = UTC+9 기준)
const KST_OFFSET = 9 * 3600_000;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** UTC ISO 문자열 → KST 날짜 (YYYY-MM-DD) */
function toKSTDate(isoStr: string): string {
  return new Date(new Date(isoStr).getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

/** KST 기준 N일 전의 날짜 문자열 (YYYY-MM-DD) */
function kstDateStr(daysAgoN: number): string {
  return new Date(Date.now() + KST_OFFSET - daysAgoN * 86400_000).toISOString().slice(0, 10);
}

/** KST 기준 오늘 00:00:00의 UTC ISO 문자열 */
function startOfDayKST(): string {
  const kstNow = new Date(Date.now() + KST_OFFSET);
  const midnightUTC = Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - KST_OFFSET;
  return new Date(midnightUTC).toISOString();
}

/**
 * KST 기준 N일 전 00:00:00의 UTC ISO 문자열
 * WAU = startOfDayKSTDaysAgo(7), MAU 등에 사용
 * daysAgo(n)은 "현재 시각 - n일"이라 KST 자정과 불일치 → 이 함수로 통일
 */
function startOfDayKSTDaysAgo(n: number): string {
  const kstNow = new Date(Date.now() + KST_OFFSET);
  const midnightUTC = Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() - n) - KST_OFFSET;
  return new Date(midnightUTC).toISOString();
}

/**
 * user_id / ip_address로 방문자 식별자 생성
 * ip_address도 null이면 null 반환 (anon:null 오집계 방지)
 */
function makeUserId(userId: string | null, ipAddress: string | null): string | null {
  if (userId) return userId;
  if (ipAddress) return `anon:${ipAddress}`;
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30"; // 기본 30일
  const days = parseInt(period);
  const adminDb = getAdminClient(); // service_role: RLS 우회, 전체 데이터 접근
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;
  try {
    // ═══ 1. 사용자 통계 ═══
    // 전체 가입자 수 (adminDb: RLS 우회로 전체 count 보장)
    const { count: totalUsers } = await adminDb
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 일별 신규 가입자 (최근 N일)
    const { data: dailySignups } = await adminDb
      .from("profiles")
      .select("created_at")
      .gte("created_at", daysAgo(days))
      .order("created_at", { ascending: true })
      .limit(10000);

    // 일별 집계
    const signupsByDate: Record<string, number> = {};
    dailySignups?.forEach((row) => {
      const date = row.created_at ? toKSTDate(row.created_at) : null;
      if (date) signupsByDate[date] = (signupsByDate[date] || 0) + 1;
    });

    // ═══ 2. 활성 사용자 (DAU/WAU/MAU) ═══
    // 각 테이블을 MAU 기준(30일)으로 1회만 조회 후 메모리 필터링 (쿼리 15회 → 6회)
    const todayStart = startOfDayKST();
    // WAU: KST 기준 7일 전 자정 (daysAgo(7)는 현재 시각 기준이라 KST 자정과 불일치)
    const wau7Start = startOfDayKSTDaysAgo(7);
    const mau30Start = startOfDayKSTDaysAgo(30);

    const [mauScanLogs, mauPostLogs, mauCommentLogs, mauDietLogs, mauSearchLogs, mauActionLogs, mauCheckLogs] =
      await Promise.all([
        adminDb.from("food_scan_logs").select("user_id, scanned_at").gte("scanned_at", mau30Start).limit(10000),
        adminDb.from("community_posts").select("user_id, created_at").gte("created_at", mau30Start).limit(10000),
        adminDb.from("community_comments").select("user_id, created_at").gte("created_at", mau30Start).limit(10000),
        adminDb.from("diet_entries").select("user_id, created_at").gte("created_at", mau30Start).limit(10000),
        // ip_address 포함: anonymous 검색 사용자도 MAU에 집계
        adminDb.from("food_search_logs").select("user_id, ip_address, searched_at").gte("searched_at", mau30Start).limit(10000),
        adminDb.from("user_action_logs").select("user_id, ip_address, created_at").gte("created_at", mau30Start).limit(10000),
        adminDb.from("food_check_history").select("user_id, checked_at").gte("checked_at", mau30Start).limit(10000),
      ]);

    // 타임스탬프 필드명이 테이블마다 다르므로 ts로 통일
    // makeUserId: user_id → 회원, ip_address → 비회원, 둘 다 없으면 null (anon:null 오집계 방지)
    const allMauRows: { uid: string; ts: string; isMember: boolean }[] = [
      ...(mauScanLogs.data || []).map((r) => ({ uid: r.user_id, ts: r.scanned_at, isMember: true })),
      ...(mauPostLogs.data || []).map((r) => ({ uid: r.user_id, ts: r.created_at, isMember: true })),
      ...(mauCommentLogs.data || []).map((r) => ({ uid: r.user_id, ts: r.created_at, isMember: true })),
      ...(mauDietLogs.data || []).map((r) => ({ uid: r.user_id, ts: r.created_at, isMember: true })),
      ...(mauSearchLogs.data || []).map((r) => ({
        uid: makeUserId(r.user_id, r.ip_address) ?? "",
        ts: r.searched_at,
        isMember: !!r.user_id,
      })),
      ...(mauActionLogs.data || []).map((r) => ({
        uid: makeUserId(r.user_id, r.ip_address) ?? "",
        ts: r.created_at,
        isMember: !!r.user_id,
      })),
      ...(mauCheckLogs.data || []).map((r) => ({ uid: r.user_id, ts: r.checked_at, isMember: true })),
    ];

    const dauUsers = new Set<string>();
    const dauMemberUsers = new Set<string>();
    const dauAnonUsers = new Set<string>();
    const wauUsers = new Set<string>();
    const mauUsers = new Set<string>();

    allMauRows.forEach(({ uid, ts, isMember }) => {
      if (!uid || !ts) return;
      mauUsers.add(uid);
      if (ts >= wau7Start) wauUsers.add(uid);
      if (ts >= todayStart) {
        dauUsers.add(uid);
        if (isMember) dauMemberUsers.add(uid);
        else dauAnonUsers.add(uid);
      }
    });

    const dau = dauUsers.size;
    const wau = wauUsers.size;
    const mau = mauUsers.size;

    // ═══ 3. 일별 활성 사용자 추이 (DAU 트렌드) ═══
    const dauTrend: { date: string; dau: number }[] = [];
    // 최근 N일간 일별 DAU 계산 (전체 활동 소스 기반)
    const periodStart = startOfDayKSTDaysAgo(days);
    const allActivityLogs = await Promise.all([
      adminDb
        .from("food_scan_logs")
        .select("user_id, scanned_at")
        .gte("scanned_at", periodStart)
        .limit(10000),
      adminDb
        .from("community_posts")
        .select("user_id, created_at")
        .gte("created_at", periodStart)
        .limit(10000),
      adminDb
        .from("community_comments")
        .select("user_id, created_at")
        .gte("created_at", periodStart)
        .limit(10000),
      adminDb
        .from("diet_entries")
        .select("user_id, created_at")
        .gte("created_at", periodStart)
        .limit(10000),
      adminDb
        .from("user_action_logs")
        .select("user_id, ip_address, created_at")
        .gte("created_at", periodStart)
        .limit(10000),
      adminDb
        .from("food_search_logs")
        .select("user_id, ip_address, searched_at")
        .gte("searched_at", periodStart)
        .limit(10000),
      adminDb
        .from("food_check_history")
        .select("user_id, checked_at")
        .gte("checked_at", periodStart)
        .limit(10000),
    ]);

    const dailyActiveMap: Record<string, Set<string>> = {};
    allActivityLogs.forEach((res) => {
      res.data?.forEach((r: any) => {
        const ts = r.scanned_at || r.searched_at || r.checked_at || r.created_at;
        const date = ts ? toKSTDate(ts) : null;
        // makeUserId: ip_address도 null이면 null 반환으로 anon:null 오집계 방지
        const uid = makeUserId(r.user_id ?? null, r.ip_address ?? null);
        if (date && uid) {
          if (!dailyActiveMap[date]) dailyActiveMap[date] = new Set();
          dailyActiveMap[date].add(uid);
        }
      });
    });

    for (let i = days - 1; i >= 0; i--) {
      const dateStr = kstDateStr(i);
      dauTrend.push({
        date: dateStr,
        dau: dailyActiveMap[dateStr]?.size || 0,
      });
    }

    // ═══ 4. 기능별 사용 횟수 ═══
    const { count: totalScans } = await adminDb
      .from("food_scan_logs")
      .select("*", { count: "exact", head: true })
      .gte("scanned_at", periodStart);

    const { count: totalChecks } = await adminDb
      .from("food_check_history")
      .select("*", { count: "exact", head: true })
      .gte("checked_at", periodStart);

    const { count: totalSearches } = await adminDb
      .from("food_search_logs")
      .select("*", { count: "exact", head: true })
      .gte("searched_at", periodStart);

    const { count: totalDietEntries } = await adminDb
      .from("diet_entries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", periodStart);

    // 일별 기능 사용량 (복합 차트용)
    const featureTrend: Record<
      string,
      { scans: number; checks: number; searches: number; diet: number }
    > = {};
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = kstDateStr(i);
      featureTrend[dateStr] = { scans: 0, checks: 0, searches: 0, diet: 0 };
    }

    const [scanLogs, checkLogs, searchLogs, dietLogs] = await Promise.all([
      adminDb
        .from("food_scan_logs")
        .select("scanned_at")
        .gte("scanned_at", periodStart)
        .limit(10000),
      adminDb
        .from("food_check_history")
        .select("checked_at")
        .gte("checked_at", periodStart)
        .limit(10000),
      adminDb
        .from("food_search_logs")
        .select("searched_at")
        .gte("searched_at", periodStart)
        .limit(10000),
      adminDb
        .from("diet_entries")
        .select("created_at")
        .gte("created_at", periodStart)
        .limit(10000),
    ]);

    scanLogs.data?.forEach((r) => {
      const d = r.scanned_at ? toKSTDate(r.scanned_at) : null;
      if (d && featureTrend[d]) featureTrend[d].scans++;
    });
    checkLogs.data?.forEach((r) => {
      const d = r.checked_at ? toKSTDate(r.checked_at) : null;
      if (d && featureTrend[d]) featureTrend[d].checks++;
    });
    searchLogs.data?.forEach((r) => {
      const d = r.searched_at ? toKSTDate(r.searched_at) : null;
      if (d && featureTrend[d]) featureTrend[d].searches++;
    });
    dietLogs.data?.forEach((r) => {
      const d = r.created_at ? toKSTDate(r.created_at) : null;
      if (d && featureTrend[d]) featureTrend[d].diet++;
    });

    const featureTrendArray = Object.entries(featureTrend).map(([date, v]) => ({
      date,
      ...v,
    }));

    // ═══ 5. 커뮤니티 통계 ═══
    const { count: totalPosts } = await adminDb
      .from("community_posts")
      .select("*", { count: "exact", head: true });

    const { count: recentPosts } = await adminDb
      .from("community_posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", periodStart);

    const { count: totalComments } = await adminDb
      .from("community_comments")
      .select("*", { count: "exact", head: true });

    const { count: recentComments } = await adminDb
      .from("community_comments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", periodStart);

    // 일별 게시글/댓글 추이
    const communityTrend: Record<string, { posts: number; comments: number }> =
      {};
    for (let i = days - 1; i >= 0; i--) {
      communityTrend[kstDateStr(i)] = { posts: 0, comments: 0 };
    }

    const [postLogs, commentLogs] = await Promise.all([
      adminDb
        .from("community_posts")
        .select("created_at")
        .gte("created_at", periodStart)
        .limit(10000),
      adminDb
        .from("community_comments")
        .select("created_at")
        .gte("created_at", periodStart)
        .limit(10000),
    ]);

    postLogs.data?.forEach((r) => {
      const d = r.created_at ? toKSTDate(r.created_at) : null;
      if (d && communityTrend[d]) communityTrend[d].posts++;
    });
    commentLogs.data?.forEach((r) => {
      const d = r.created_at ? toKSTDate(r.created_at) : null;
      if (d && communityTrend[d]) communityTrend[d].comments++;
    });

    const communityTrendArray = Object.entries(communityTrend).map(
      ([date, v]) => ({
        date,
        ...v,
      }),
    );

    // ═══ 6. 학교 등록 통계 ═══
    const { count: totalSchools } = await adminDb
      .from("user_schools")
      .select("*", { count: "exact", head: true });

    // 학교별 등록 수 TOP 10
    const { data: schoolRanking } = await adminDb
      .from("user_schools")
      .select("school_name")
      .limit(10000);

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
    // 7일 전 KST 하루(00:00~23:59)에 활동한 회원 중 오늘 재방문한 비율
    // base: scan_logs + community_posts + user_action_logs (전체 활동 소스 포함)
    const weekAgoStart = startOfDayKSTDaysAgo(7); // 7일 전 KST 00:00
    const weekAgoEnd   = startOfDayKSTDaysAgo(6); // 6일 전 KST 00:00 (= 7일 전 하루 끝)
    const retentionBase = await Promise.all([
      adminDb
        .from("food_scan_logs")
        .select("user_id")
        .gte("scanned_at", weekAgoStart)
        .lt("scanned_at", weekAgoEnd)
        .limit(10000),
      adminDb
        .from("community_posts")
        .select("user_id")
        .gte("created_at", weekAgoStart)
        .lt("created_at", weekAgoEnd)
        .limit(10000),
      adminDb
        .from("user_action_logs")
        .select("user_id")
        .gte("created_at", weekAgoStart)
        .lt("created_at", weekAgoEnd)
        .limit(10000),
      adminDb
        .from("food_check_history")
        .select("user_id")
        .gte("checked_at", weekAgoStart)
        .lt("checked_at", weekAgoEnd)
        .limit(10000),
    ]);
    const weekAgoUsers = new Set<string>();
    // 리텐션은 식별 가능한 회원만 대상 (anonymous는 IP가 바뀔 수 있어 제외)
    retentionBase.forEach((res) =>
      res.data?.forEach((r: any) => r.user_id && weekAgoUsers.add(r.user_id)),
    );

    const returnedUsers = new Set<string>();
    if (weekAgoUsers.size > 0) {
      dauUsers.forEach((userId) => {
        if (weekAgoUsers.has(userId)) returnedUsers.add(userId);
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
        dauMembers: dauMemberUsers.size,  // 오늘 활동한 회원 수
        dauAnon: dauAnonUsers.size,       // 오늘 활동한 비회원 수 (IP 기반)
        wau,
        mau,
        retentionRate,
        stickiness: mau > 0 ? Math.round((dau / mau) * 100) : 0, // DAU/MAU 비율
      },
      signups: {
        total: totalUsers || 0,
        recent: dailySignups?.length || 0,
        trend: Object.entries(signupsByDate)
          .sort(([a], [b]) => a.localeCompare(b)) // 날짜 오름차순 정렬 보장
          .map(([date, count]) => ({ date, count })),
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
