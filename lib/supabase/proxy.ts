import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ✅ IP 기반 비로그인 스캔 제한 (메모리, 쿠키 우회 방어)
const ipScanMap = new Map<string, number>();
// 매시간 오래된 키 정리
setInterval(() => { ipScanMap.clear(); }, 60 * 60 * 1000);

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
  const protectedPaths = ["/mypage", "/bookmarks", "/food/profile", "/family"];

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
  // 비로그인 스캔 제한 체크 (일 5회)
  // ==========================================
  // 분석 API 호출 시에만 체크
  if (!user && request.nextUrl.pathname === "/api/food/analyze-image") {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const scanDate = request.cookies.get("scan_date")?.value;
    const scanCountCookie = request.cookies.get("scan_count")?.value;

    // ✅ IP 기반 보조 rate limit (쿠키 우회 방어)
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ipKey = `scan:${clientIp}:${today}`;
    const ipCount = ipScanMap.get(ipKey) || 0;
    if (ipCount >= 10) {
      // IP당 일 10회 (쿠키 5회보다 여유)
      console.log("🚫 IP 기반 스캔 제한 초과:", clientIp, ipCount);
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

    let scanCount = 0;

    // 날짜가 다르면 카운트 리셋
    if (scanDate !== today) {
      scanCount = 0;
      supabaseResponse.cookies.set("scan_date", today, {
        maxAge: 60 * 60 * 24, // 24시간
        httpOnly: true,
        sameSite: "lax",
      });
    } else {
      scanCount = scanCountCookie ? parseInt(scanCountCookie, 10) : 0;
    }

    // 5회 초과 시 제한
    if (scanCount >= 5) {
      console.log("🚫 비로그인 스캔 제한 초과:", scanCount);
      return NextResponse.json(
        {
          success: false,
          error: "scan_limit_exceeded",
          message:
            "하루 무료 스캔 횟수(5회)를 초과했습니다. 회원가입하면 무제한 스캔이 가능합니다.",
          remainingScans: 0,
        },
        { status: 429 }, // Too Many Requests
      );
    }

    // 카운트 증가
    scanCount += 1;
    supabaseResponse.cookies.set("scan_count", scanCount.toString(), {
      maxAge: 60 * 60 * 24, // 24시간
      httpOnly: true,
      sameSite: "lax",
    });

    // 남은 횟수를 응답 헤더에 추가
    supabaseResponse.headers.set(
      "X-Remaining-Scans",
      (5 - scanCount).toString(),
    );

    console.log(`✅ 비로그인 스캔 허용: ${scanCount}/5`);
  }

  return supabaseResponse;
}
