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
  poweredByHeader: false,
  compress: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js", "framer-motion"],
  },

  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // ✅ 실서비스: unoptimized 제거 → Next.js 이미지 최적화 활성화
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
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
          // DENY → SAMEORIGIN: 동일 출처 iframe 임베드 허용 (카카오 로그인 팝업 등)
          // CSP frame-ancestors 'none'이 더 강력하게 동작하므로 SAMEORIGIN은 구형 브라우저 폴백용
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
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
          // camera=(self): camera=()로 변경 시 html5-qrcode 바코드 스캔 파손됨
          // upload-sheet.tsx에서 Html5Qrcode가 getUserMedia(camera)를 직접 호출하므로 (self) 유지
          {
            key: "Permissions-Policy",
            value: [
              "camera=(self)", // html5-qrcode 바코드 스캔 필수 — camera=() 불가
              "microphone=()", // 미사용 차단
              "geolocation=(self)", // 병원·약국 검색용 허용
              "payment=()", // 미사용 차단
            ].join(", "),
          },
          // ─── CSP (Content Security Policy) ───
          {
            key: "Content-Security-Policy",
            value: [
              // 기본: self만
              "default-src 'self'",

              /*
               * [script-src] 'unsafe-inline' 유지 이유:
               *
               * nonce 방식으로 교체를 검토했으나 아래 외부 SDK들이 로드 후
               * 자체적으로 inline <script>를 동적 주입하기 때문에 nonce를 부여할 수 없습니다.
               *
               * - Kakao JS SDK (t1.kakaocdn.net): 공유/로그인 기능 초기화 시 inline script 주입
               * - Naver Maps SDK (oapi.map.naver.com): 지도 타일·마커 렌더링 시 inline script 주입
               * - Google AdSense / GTM: 광고·분석 로드 시 inline script 주입
               * - layout.tsx의 sw-register: dangerouslySetInnerHTML (SW 등록용 1회성 인라인 스크립트)
               *
               * 'strict-dynamic' 추가도 검토했으나, SDK가 eval() / innerHTML로 주입하는
               * 경우까지 커버하지 못하므로 여전히 'unsafe-inline'이 필요합니다.
               * 외부 SDK CSP 지원이 개선되면 nonce + strict-dynamic으로 교체할 것.
               */
              // 실제 로드하는 스크립트 출처만 명시 (와일드카드 제거):
              // - developers.kakao.com 제거: SDK 로드 없음, API call은 connect-src에서 처리
              // - openapi.map.naver.com 제거: 구버전 URL, layout.tsx는 oapi.map.naver.com 사용
              // - *.map.naver.net 제거: 지도 타일 이미지 도메인, script-src 불필요 (img-src에서 처리)
              // - *.pstatic.net 제거: Naver 정적 이미지 도메인, script-src 불필요 (img-src에서 처리)
              // - www.googletagmanager.com 제거: layout.tsx에 GTM Script 없음 (필요 시 재추가)
              "script-src 'self' 'unsafe-inline' https://t1.kakaocdn.net https://oapi.map.naver.com https://va.vercel-scripts.com https://pagead2.googlesyndication.com https://www.googleadservices.com https://adservice.google.com",

              /*
               * [style-src] 'unsafe-inline' 유지 이유:
               *
               * - Next.js Image 최적화: placeholder blur 적용 시 style 속성 직접 삽입
               * - Next.js 폰트 최적화: 폰트 로드 전 fallback용 inline style 삽입
               * - Naver Maps SDK: 지도 컨테이너·오버레이에 style 속성 직접 주입
               * - Kakao SDK: 공유 팝업 레이아웃에 inline style 사용
               * - Radix UI / Tailwind 애니메이션: CSS 변수를 style 속성으로 전달
               *
               * style-src의 'unsafe-inline'은 script-src와 달리 직접적인 XSS
               * 코드 실행으로 이어지지 않으므로 위험도가 낮습니다.
               * (CSS injection은 데이터 탈취 가능성이 있으나 스크립트 실행은 불가)
               */
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

              // 클릭재킹 방지: 이 사이트가 iframe에 포함되는 것을 차단
              "frame-ancestors 'none'",

              // iframe: 카카오 로그인 + Google 애드센스 + 네이버 지도 임베드
              "frame-src 'self' https://accounts.kakao.com https://kauth.kakao.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://map.naver.com https://*.map.naver.com",

              // 미디어: self + blob (카메라)
              "media-src 'self' blob:",

              // worker: blob (html5-qrcode)
              "worker-src 'self' blob:",

              // form: self만
              "form-action 'self' https://sharer.kakao.com https://kauth.kakao.com https://accounts.kakao.com https://t1.kakaocdn.net",

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
