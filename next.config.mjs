/** @type {import('next').NextConfig} */
/*
  배포 후 브라우저 개발자도구 → 
  Console에서 CSP 위반 오류가 뜨는지 확인하세요. 
  만약 네이버 지도나 카카오 공유가 깨진다면 script-src나 connect-src에 해당 도메인을 추가하면 됩니다. 
  오류 메시지에 정확히 어떤 도메인이 차단됐는지 표시됩니다.

로컬에서는 HSTS와 upgrade-insecure-requests가 http://localhost를 막을 수 있는데, 
그건 정상 동작이고 배포 환경에서만 실제 효과가 납니다.
*/
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // ✅ 실서비스: unoptimized 제거 → Next.js 이미지 최적화 활성화
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google 프로필 이미지
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ─── 클릭재킹 방지 ───
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // ─── MIME 타입 스니핑 방지 ───
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // ─── 레퍼러 정책 ───
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // ─── XSS 보호 (구형 브라우저용) ───
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // ─── HTTPS 강제 (배포 도메인에서만 효과) ───
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // ─── 권한 정책 (불필요한 브라우저 API 차단) ───
          {
            key: "Permissions-Policy",
            value: [
              "camera=(self)", // 바코드 스캔용 허용
              "microphone=()", // 미사용 차단
              "geolocation=(self)", // 병원 검색용 허용
              "payment=()", // 미사용 차단
            ].join(", "),
          },
          // ─── CSP (Content Security Policy) ───
          {
            key: "Content-Security-Policy",
            value: [
              // 기본: self만
              "default-src 'self'",

              // 스크립트: self + 카카오SDK + 네이버지도 + Google 애드센스 + 인라인(Next.js 필수)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://developers.kakao.com https://t1.kakaocdn.net https://openapi.map.naver.com https://oapi.map.naver.com https://*.pstatic.net https://www.googletagmanager.com https://va.vercel-scripts.com https://pagead2.googlesyndication.com https://www.googleadservices.com https://adservice.google.com",

              // 스타일: self + 인라인(Tailwind)
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",

              // 이미지: self + Supabase + Google + 카카오 + 네이버 + 애드센스 + data URI
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.kakaocdn.net https://ssl.gstatic.com https://pagead2.googlesyndication.com https://*.map.naver.com https://*.pstatic.net https://*.naver.net",

              // 폰트: self
              "font-src 'self' data: https://cdn.jsdelivr.net",
              // API 호출 허용 도메인
              [
                "connect-src 'self'",
                "https://*.supabase.co",
                "wss://*.supabase.co",
                "https://apis.data.go.kr",
                "https://world.openfoodfacts.org",
                "https://api.openai.com",
                "https://dapi.kakao.com",
                "https://openapi.map.naver.com",
                "https://oapi.map.naver.com",
                "https://naveropenapi.apigw.ntruss.com",
                "https://*.pstatic.net",
                "https://*.nelo.navercorp.com",
                "https://vitals.vercel-insights.com",
                "https://va.vercel-scripts.com",
                "https://cdn.jsdelivr.net",
                "https://pagead2.googlesyndication.com",
                "https://www.googleadservices.com",
                "https://epi.adtrafficquality.google",
              ].join(" "),

              // iframe: 카카오 로그인 팝업 + Google 애드센스
              "frame-src 'self' https://accounts.kakao.com https://kauth.kakao.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",

              // 미디어: self + blob (카메라)
              "media-src 'self' blob:",

              // worker: blob (html5-qrcode)
              "worker-src 'self' blob:",

              // form: self만
              "form-action 'self'",

              // 업그레이드 요청
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },

      // ─── API 라우트 캐시 방지 ───
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },

      // ─── 정적 파일 캐시 최적화 ───
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
