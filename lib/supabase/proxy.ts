import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ✅ IP 기반 비로그인 스캔 제한 (메모리, 쿠키 우회 방어)
const ipScanMap = new Map<string, number>();
// 매시간 오래된 키 정리
setInterval(
  () => {
    ipScanMap.clear();
  },
  60 * 60 * 1000,
);

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
  // 보호 경로 체크
  // ==========================================
  const protectedPaths = [
    "/mypage", // 마이페이지
    "/bookmarks", // 즐겨찾기
    "/food/profile", // 식품 프로필
    "/family", // 가족 관리
    "/admin", // 관리자
    "/reports", // 주간 리포트
    "/community/write", // 게시글 작성
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // ==========================================
  // 비로그인 스캔 제한 체크 (IP 기반, 일 10회)
  // ==========================================
  if (!user && request.nextUrl.pathname === "/api/food/analyze-image") {
    const today = new Date().toISOString().split("T")[0];
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ipKey = `scan:${clientIp}:${today}`;
    const ipCount = ipScanMap.get(ipKey) || 0;

    if (ipCount >= 10) {
      return NextResponse.json(
        {
          success: false,
          error: "scan_limit_exceeded",
          message:
            "하루 무료 스캔 횟수를 초과했습니다. 회원가입하면 무제한 스캔이 가능합니다.",
          remainingScans: 0,
        },
        { status: 429 },
      );
    }

    ipScanMap.set(ipKey, ipCount + 1);
  }

  return supabaseResponse;
}
