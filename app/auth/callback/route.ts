import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logAction } from "@/lib/utils/action-log";

// ─── 허용된 리다이렉트 경로 검증 ───
function getSafeRedirectPath(redirectParam: string | null): string {
  if (!redirectParam) return "/";

  // 상대 경로만 허용 (반드시 /로 시작, //로 시작하면 차단)
  if (
    !redirectParam.startsWith("/") ||
    redirectParam.startsWith("//") ||
    redirectParam.startsWith("/\\") ||
    redirectParam.includes("://")
  ) {
    return "/";
  }

  // 허용된 내부 경로 프리픽스 화이트리스트
  const allowedPrefixes = [
    "/",
    "/mypage",
    "/bookmarks",
    "/food",
    "/hospital",
    "/community",
    "/school",
    "/family",
    "/reports",
    "/support",
    "/sign-up-complete",
    "/admin",
    "/diet",
    "/restaurant",
    "/area",
  ];

  const isAllowed = allowedPrefixes.some(
    (prefix) => redirectParam === prefix || redirectParam.startsWith(prefix + "/") || redirectParam.startsWith(prefix + "?"),
  );

  return isAllowed ? redirectParam : "/";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] 세션 교환 실패:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // 신규 가입 감지: created_at이 60초 이내이면 신규 가입자
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const createdAt = new Date(user.created_at).getTime();
    const now = Date.now();
    if (now - createdAt < 60_000) {
      const provider = user.app_metadata?.provider || "unknown";
      logAction({
        userId: user.id,
        actionType: "signup",
        metadata: { provider, email: user.email },
      });
    }
  }

  // ✅ 안전한 리다이렉트 경로만 허용 (Open Redirect 방지)
  const redirectParam = requestUrl.searchParams.get("redirect");
  const safePath = getSafeRedirectPath(redirectParam);
  return NextResponse.redirect(`${origin}${safePath}`);
}
