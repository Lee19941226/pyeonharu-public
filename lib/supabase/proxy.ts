import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ==========================================
  // [Phase 11] 보호 경로 재정의 - 알레르기 중심으로 변경
  // ==========================================
  // ❌ 이전: ['/mypage', '/bookmarks', '/closet', '/style']
  // ✅ 변경: 코디/옷장 제거, 알레르기 관련 추가
  const protectedPaths = [
    "/mypage", // 마이페이지
    "/bookmarks", // 즐겨찾기
    "/food/profile", // 알레르기 프로필 관리
    "/family", // 가족 관리 (나중에 추가될 기능)
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  // 비로그인 사용자가 보호 경로 접근 시 로그인 페이지로 리다이렉트
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // ✅ 로그인 후 원래 페이지로 돌아가도록 redirect 파라미터 추가
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
