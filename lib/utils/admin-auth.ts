import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type AdminRole = "admin" | "super_admin";

/**
 * 관리자 인증 체크 공통 유틸
 * @param minRole 최소 필요 권한 (기본값: "admin")
 * @returns user 객체 또는 에러 Response
 */
export async function verifyAdmin(
  minRole: AdminRole = "admin",
): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      ),
    };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "프로필을 찾을 수 없습니다." },
        { status: 403 },
      ),
    };
  }

  const roleRank: Record<AdminRole, number> = {
    admin: 1,
    super_admin: 2,
  };

  if (roleRank[profile.role as AdminRole] < roleRank[minRole]) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: user.id };
}
