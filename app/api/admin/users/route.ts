import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const VALID_ROLES = ["user", "moderator", "admin", "super_admin"];

// 요청자가 admin 이상인지 확인
async function getRequesterRole(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role || null;
}

// ─── GET: 사용자 목록 조회 ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";
    const offset = (page - 1) * limit;

    // 인증 확인
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const requesterRole = await getRequesterRole(user.id);
    if (!requesterRole || !["admin", "super_admin"].includes(requesterRole)) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    // 사용자 목록 쿼리
    let query = supabaseAdmin
      .from("profiles")
      .select("id, nickname, avatar_url, created_at, role, height, weight, age, gender", { count: "exact" });

    if (search) {
      query = query.or(`nickname.ilike.%${search}%,id.eq.${search.length === 36 ? search : "00000000-0000-0000-0000-000000000000"}`);
    }
    if (roleFilter && VALID_ROLES.includes(roleFilter)) {
      query = query.eq("role", roleFilter);
    }

    const { data: users, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // 각 사용자의 추가 정보 (알레르기, 학교, 활동량)
    const enrichedUsers = await Promise.all(
      (users || []).map(async (user) => {
        const [allergies, schools, scanCount, postCount] = await Promise.all([
          supabaseAdmin.from("user_allergies").select("allergen_name").eq("user_id", user.id),
          supabaseAdmin.from("user_schools").select("school_name").eq("user_id", user.id),
          supabaseAdmin.from("food_scan_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabaseAdmin.from("community_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        return {
          ...user,
          allergies: allergies.data?.map((a) => a.allergen_name) || [],
          schools: schools.data?.map((s) => s.school_name) || [],
          scanCount: scanCount.count || 0,
          postCount: postCount.count || 0,
        };
      }),
    );

    // auth.users에서 이메일 가져오기 (service_role)
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const emailMap: Record<string, string> = {};
    authUsers?.forEach((u) => {
      if (u.email) emailMap[u.id] = u.email;
    });

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

// ─── PATCH: 등급 변경 ───
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { targetUserId, newRole } = body;

    if (!targetUserId || !newRole || !VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    }

    // 인증 확인
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const requesterRole = await getRequesterRole(user.id);

    // 권한 체크
    if (requesterRole !== "super_admin") {
      return NextResponse.json({ error: "super_admin만 등급 변경 가능" }, { status: 403 });
    }

    // 자기 자신 등급 낮추기 방지
    if (targetUserId === user.id && newRole !== "super_admin") {
      return NextResponse.json({ error: "본인의 super_admin 권한은 해제할 수 없습니다" }, { status: 400 });
    }

    // 등급 업데이트
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true, targetUserId, newRole });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json({ error: "등급 변경 실패" }, { status: 500 });
  }
}
