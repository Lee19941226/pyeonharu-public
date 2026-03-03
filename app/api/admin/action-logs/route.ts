import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const period = parseInt(searchParams.get("period") || "30");
    const userId = searchParams.get("userId") || "";
    const actionType = searchParams.get("actionType") || "";
    const ip = searchParams.get("ip") || "";
    const search = searchParams.get("search") || "";

    const offset = (page - 1) * limit;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // 로그 조회 쿼리
    let query = supabaseAdmin
      .from("user_action_logs")
      .select("*", { count: "exact" })
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (userId) query = query.eq("user_id", userId);
    if (actionType) query = query.eq("action_type", actionType);
    if (ip) {
      const safeIp = ip.replace(/[%_\\]/g, "");
      if (safeIp) query = query.ilike("ip_address", `%${safeIp}%`);
    }

    const { data: logs, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    // 사용자 닉네임 조회
    const userIds = [
      ...new Set((logs || []).map((l) => l.user_id).filter(Boolean)),
    ];
    const nicknameMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, nickname")
        .in("id", userIds);

      profiles?.forEach((p) => {
        nicknameMap[p.id] = p.nickname || "Unknown";
      });
    }

    // 닉네임으로 검색 시 user_id 찾기
    let filteredLogs = logs || [];
    if (search) {
      // 닉네임 검색
      const safeSearch = search.replace(/[%_\\]/g, "");
      const { data: matchedProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, nickname")
        .ilike("nickname", `%${safeSearch}%`);

      const matchedIds = new Set(matchedProfiles?.map((p) => p.id) || []);

      // UUID 직접 검색도 지원
      filteredLogs = filteredLogs.filter(
        (log) =>
          matchedIds.has(log.user_id) ||
          log.user_id?.includes(search),
      );

      // 검색된 프로필도 닉네임 맵에 추가
      matchedProfiles?.forEach((p) => {
        nicknameMap[p.id] = p.nickname || "Unknown";
      });
    }

    const enrichedLogs = filteredLogs.map((log) => ({
      ...log,
      nickname: log.user_id
        ? nicknameMap[log.user_id] || "Unknown"
        : "비로그인",
    }));

    // 액션 타입별 통계
    const { data: statsData } = await supabaseAdmin
      .from("user_action_logs")
      .select("action_type")
      .gte("created_at", startDate.toISOString());

    const actionCounts: Record<string, number> = {};
    statsData?.forEach((s) => {
      actionCounts[s.action_type] = (actionCounts[s.action_type] || 0) + 1;
    });

    return NextResponse.json({
      logs: enrichedLogs,
      total: search ? enrichedLogs.length : count || 0,
      page,
      limit,
      totalPages: Math.ceil((search ? enrichedLogs.length : count || 0) / limit),
      actionCounts,
    });
  } catch (error) {
    console.error("Action logs error:", error);
    return NextResponse.json(
      { error: "활동 로그 조회 실패" },
      { status: 500 },
    );
  }
}
