import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] 세션 교환 실패:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  // redirect 파라미터가 있으면 해당 경로로, 없으면 홈으로
  const redirectTo = requestUrl.searchParams.get("redirect") || "/";
  return NextResponse.redirect(`${origin}${redirectTo}`);
}
