import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type FoodSelectInsightItem = { key: string; count: number };
type HourInsightItem = { key: string; count: number };

type FoodSelectInsights = {
  total: number;
  topQueries: FoodSelectInsightItem[];
  topFoods: FoodSelectInsightItem[];
  bySourcePage: FoodSelectInsightItem[];
};

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

    const nicknameMap: Record<string, string> = {};

    // search 필터: 닉네임/UUID 기준으로 매칭되는 user_id 목록을 먼저 조회
    let searchUserIds: string[] | null = null;
    if (search) {
      const safeSearch = search.replace(/[%_\\]/g, "");
      const { data: matchedProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, nickname")
        .ilike("nickname", `%${safeSearch}%`);

      matchedProfiles?.forEach((p) => {
        nicknameMap[p.id] = p.nickname || "Unknown";
      });

      // 닉네임 매칭 + UUID 직접 매칭
      const fromNickname = matchedProfiles?.map((p) => p.id) || [];
      const fromUuid = search.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
        ? [search]
        : [];
      searchUserIds = [...new Set([...fromNickname, ...fromUuid])];
    }

    // 모든 필터를 DB 쿼리에 적용 후 페이지네이션
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
    if (searchUserIds !== null) {
      if (searchUserIds.length === 0) {
        // 매칭 결과 없음 → 빈 결과 반환
        return NextResponse.json({
          logs: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          actionCounts: {},
          hourlyCounts: [],
          foodSelectInsights: {
            total: 0,
            topQueries: [],
            topFoods: [],
            bySourcePage: [],
          },
        });
      }
      query = query.in("user_id", searchUserIds);
    }

    const { data: logs, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    // 조회된 로그의 닉네임 보완 조회
    const userIds = [
      ...new Set((logs || []).map((l) => l.user_id).filter(Boolean)),
    ].filter((id) => !nicknameMap[id]);

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, nickname")
        .in("id", userIds);

      profiles?.forEach((p) => {
        nicknameMap[p.id] = p.nickname || "Unknown";
      });
    }

    const enrichedLogs = (logs || []).map((log) => ({
      ...log,
      nickname: log.user_id ? nicknameMap[log.user_id] || "Unknown" : "비로그인",
    }));

    // 액션 타입/시간대 통계
    const { data: statsData } = await supabaseAdmin
      .from("user_action_logs")
      .select("action_type, created_at")
      .gte("created_at", startDate.toISOString());

    const actionCounts: Record<string, number> = {};
    const hourlyMap: Record<string, number> = {};
    statsData?.forEach((s) => {
      actionCounts[s.action_type] = (actionCounts[s.action_type] || 0) + 1;
      const hour = new Date(s.created_at).getHours().toString().padStart(2, "0");
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });

    const hourlyCounts: HourInsightItem[] = Array.from({ length: 24 }, (_, hour) => {
      const key = String(hour).padStart(2, "0");
      return { key, count: hourlyMap[key] || 0 };
    });

    let foodSelectInsights: FoodSelectInsights = {
      total: 0,
      topQueries: [],
      topFoods: [],
      bySourcePage: [],
    };

    if (!actionType || actionType === "food_select") {
      let foodSelectQuery = supabaseAdmin
        .from("user_action_logs")
        .select("metadata")
        .eq("action_type", "food_select")
        .gte("created_at", startDate.toISOString());

      if (userId) foodSelectQuery = foodSelectQuery.eq("user_id", userId);
      if (ip) {
        const safeIp = ip.replace(/[%_\\]/g, "");
        if (safeIp) foodSelectQuery = foodSelectQuery.ilike("ip_address", `%${safeIp}%`);
      }
      if (searchUserIds !== null) {
        if (searchUserIds.length > 0) {
          foodSelectQuery = foodSelectQuery.in("user_id", searchUserIds);
        } else {
          foodSelectQuery = foodSelectQuery.in("user_id", ["00000000-0000-0000-0000-000000000000"]);
        }
      }

      const { data: foodSelectRows } = await foodSelectQuery.limit(10000);

      const queryMap: Record<string, number> = {};
      const foodMap: Record<string, number> = {};
      const sourceMap: Record<string, number> = {};

      (foodSelectRows || []).forEach((row) => {
        const metadata = (row.metadata || {}) as Record<string, unknown>;
        const q = String(metadata.query || "").trim();
        const food = String(metadata.food_name || "").trim();
        const source = String(metadata.source_page || "unknown").trim() || "unknown";

        if (q) queryMap[q] = (queryMap[q] || 0) + 1;
        if (food) foodMap[food] = (foodMap[food] || 0) + 1;
        sourceMap[source] = (sourceMap[source] || 0) + 1;
      });

      const toTopItems = (map: Record<string, number>) =>
        Object.entries(map)
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 7);

      foodSelectInsights = {
        total: (foodSelectRows || []).length,
        topQueries: toTopItems(queryMap),
        topFoods: toTopItems(foodMap),
        bySourcePage: toTopItems(sourceMap),
      };
    }

    return NextResponse.json({
      logs: enrichedLogs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      actionCounts,
      hourlyCounts,
      foodSelectInsights,
    });
  } catch (error) {
    console.error("Action logs error:", error);
    return NextResponse.json({ error: "활동 로그 조회 실패" }, { status: 500 });
  }
}
