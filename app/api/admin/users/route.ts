import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const VALID_ROLES = ["user", "tester", "moderator", "admin", "super_admin"];

/** PostgREST .or() 필터 인젝션 방지: 특수문자 제거 */
function sanitizeFilterValue(value: string): string {
  return value.replace(/[,.()"\\]/g, "");
}

export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const pageRaw = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const limitRaw = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 20;
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id, nickname, avatar_url, created_at, role, height, weight, age, gender, is_banned, ban_reason, ban_until, banned_at",
        { count: "exact" },
      );

    if (search) {
      const safeSearch = sanitizeFilterValue(search);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeSearch);
      query = query.or(
        `nickname.ilike.%${safeSearch}%,id.eq.${isUuid ? safeSearch : "00000000-0000-0000-0000-000000000000"}`,
      );
    }
    if (roleFilter && VALID_ROLES.includes(roleFilter)) {
      query = query.eq("role", roleFilter);
    }

    const {
      data: users,
      count,
      error: queryError,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (queryError) throw queryError;

    const enrichedUsers = await Promise.all(
      (users || []).map(async (u) => {
        const [allergies, schools, scanCount, postCount] = await Promise.all([
          supabaseAdmin
            .from("user_allergies")
            .select("allergen_name")
            .eq("user_id", u.id),
          supabaseAdmin
            .from("user_schools")
            .select("school_name")
            .eq("user_id", u.id),
          supabaseAdmin
            .from("food_scan_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", u.id),
          supabaseAdmin
            .from("community_posts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", u.id),
        ]);
        return {
          ...u,
          allergies: allergies.data?.map((a) => a.allergen_name) || [],
          schools: schools.data?.map((s) => s.school_name) || [],
          scanCount: scanCount.count || 0,
          postCount: postCount.count || 0,
        };
      }),
    );

    // 현재 페이지 유저의 이메일만 조회 (전체 유저 순회 방지)
    const emailMap: Record<string, string> = {};
    await Promise.all(
      enrichedUsers.map(async (u) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(u.id);
          if (data?.user?.email) emailMap[u.id] = data.user.email;
        } catch {
          // skip
        }
      }),
    );

    const finalUsers = enrichedUsers.map((u) => ({
      ...u,
      email: emailMap[u.id] || "",
    }));

    return NextResponse.json({
      users: finalUsers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "사용자 조회 실패" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    // super_admin만 등급 변경 가능
    const auth = await verifyAdmin("super_admin");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { targetUserId, newRole } = body;

    if (!targetUserId || !newRole || !VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    }

    if (targetUserId === auth.userId && newRole !== "super_admin") {
      return NextResponse.json(
        { error: "본인의 super_admin 권한은 해제할 수 없습니다" },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, targetUserId, newRole });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json({ error: "등급 변경 실패" }, { status: 500 });
  }
}
