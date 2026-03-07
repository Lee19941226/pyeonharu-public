// ============================================
// 편하루 서비스 워커
// 전략: Network First + 오프라인 폴백
// ============================================

const CACHE_NAME = "pyeonharu-v3-20260307";
const OFFLINE_URL = "/offline";

// ── 캐시할 정적 자원 (앱 셸) ──
const STATIC_ASSETS = [
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── 캐시하지 않을 패턴 ──
const NO_CACHE_PATTERNS = [
  /\/api\//, // API 호출은 항상 네트워크
  /\/auth\//, // 인증 관련
  /\/_next\//, // Next.js 정적 파일은 브라우저 캐시가 처리
  /supabase\.co/, // Supabase 직접 호출
];

// ────────────────────────────────────────────
// Install: 정적 자원 캐시
// ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // 실패해도 설치 계속 진행 (addAll 대신 개별 처리)
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch(() => {
              console.warn("[SW] 캐시 실패:", url);
            }),
          ),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

// ────────────────────────────────────────────
// Activate: 구버전 캐시 정리
// ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log("[SW] 구버전 캐시 삭제:", name);
              return caches.delete(name);
            }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ────────────────────────────────────────────
// Fetch: Network First 전략
// ────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── GET 요청만 처리 ──
  if (request.method !== "GET") return;

  // HTML navigation requests are not cached to avoid stale SSR/CSR mismatch
  if (
    request.mode === "navigate" ||
    request.headers.get("Accept")?.includes("text/html")
  ) {
    return;
  }

  // ── 캐시 제외 패턴 체크 ──
  const shouldSkip = NO_CACHE_PATTERNS.some(
    (pattern) => pattern.test(url.pathname) || pattern.test(url.href),
  );
  if (shouldSkip) return;

  // ── 외부 도메인 제외 (same-origin만 처리) ──
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    // 1순위: 네트워크 시도
    fetch(request)
      .then((response) => {
        // 유효한 응답만 캐시
        if (response.ok && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() =>
        // 2순위: 캐시 확인
        caches.match(request).then((cached) => {
          if (cached) return cached;

          // 3순위: HTML 요청이면 오프라인 페이지
          if (request.headers.get("Accept")?.includes("text/html")) {
            return caches.match(OFFLINE_URL);
          }

          // 나머지는 실패
          return new Response("오프라인 상태입니다", {
            status: 503,
            statusText: "Service Unavailable",
          });
        }),
      ),
  );
});
