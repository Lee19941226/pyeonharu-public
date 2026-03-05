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
  // ==========================================
  // CSRF 방어: mutation 요청의 Origin 헤더 검증
  // ==========================================
  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: "CSRF 검증 실패: 허용되지 않은 출처입니다." },
          { status: 403 },
        );
      }
    }
  }

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
  // 중복 로그인 검증 (세션 토큰 비교)
  // ==========================================
  const pathname = request.nextUrl.pathname;
  const skipSessionCheck =
    pathname.startsWith("/login") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/");

  // ==========================================
  // 중복 로그인 검증 (API 요청에서만 — 페이지 로드 성능 보호)
  // ==========================================
  const isApiRequest = pathname.startsWith("/api/");

  if (user && !skipSessionCheck && isApiRequest) {
    const sessionTokenCookie = request.cookies.get("session_token")?.value;

    // 쿠키 있을 때만 검증 (없으면 스킵 — 로그인 직후/WebView 쿠키 이슈 대응)
    if (sessionTokenCookie) {
      try {
        const { data, error } = await supabase
          .from("active_sessions")
          .select("session_token")
          .eq("user_id", user.id)
          .single();

        // DB에 레코드 없음 → 허용 (아직 세션 등록 전)
        // 쿼리 실패 → fail-open
        const isValid = error || !data ? true : data.session_token === sessionTokenCookie;

        if (!isValid) {
          const apiResponse = NextResponse.json(
            { error: "duplicate_login", message: "다른 기기에서 로그인되어 로그아웃되었습니다." },
            { status: 401 },
          );
          apiResponse.cookies.delete("session_token");
          return apiResponse;
        }
      } catch {
        // DB 쿼리 실패 → fail-open (접근 허용)
      }
    }
  }

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

    if (ipCount >= 1) {
      return NextResponse.json(
        {
          success: false,
          error: "scan_limit_exceeded",
          message:
            "일일 무료 분석 횟수(1회)를 초과했습니다. 로그인하시면 더 많이 사용할 수 있어요.",
          remainingScans: 0,
        },
        { status: 429 },
      );
    }

    ipScanMap.set(ipKey, ipCount + 1);
  }

  return supabaseResponse;
}
