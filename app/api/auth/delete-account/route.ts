import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("[DeleteAccount] Request received");
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 },
      );
    }
    console.log(`[DeleteAccount] Starting deletion for user: ${user.id}`);

    // Admin 클라이언트로 유저 완전 삭제 (CASCADE로 관련 데이터도 자동 삭제)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id,
    );

    if (deleteError) {
      console.error("[DeleteAccount] Admin delete error:", deleteError);
      return NextResponse.json(
        { success: false, message: "회원 탈퇴 처리 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    const response = NextResponse.json(
      { success: true, message: "회원 탈퇴가 완료되었습니다." },
      { status: 200 },
    );
    response.cookies.set("sb-access-token", "", { maxAge: 0, path: "/" });
    response.cookies.set("sb-refresh-token", "", { maxAge: 0, path: "/" });
    console.log("[DeleteAccount] Deletion completed successfully");
    return response;
  } catch (error) {
    console.error("[DeleteAccount] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "회원 탈퇴 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
