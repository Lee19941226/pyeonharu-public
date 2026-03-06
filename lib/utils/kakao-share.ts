function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

let sdkLoadPromise: Promise<void> | null = null;

function loadKakaoSDK(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.Kakao) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    // If layout.tsx already injected the script tag, attach to it
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="kakao_js_sdk"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Kakao SDK load failed")),
        { once: true }
      );
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

export async function ensureKakaoReady(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    await loadKakaoSDK();
    if (!window.Kakao) return false;
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_KEY);
    }
    return window.Kakao.isInitialized();
  } catch {
    return false;
  }
}

// 카카오 공유 OG 이미지: 동적 URL 대신 고정 URL 사용 (페이로드 크기 최소화)
const KAKAO_OG_IMAGE = "https://pyeonharu.com/og-image.png";

export interface KakaoShareOptions {
  title: string;
  description: string;
  imageUrl?: string; // 무시됨 — 항상 KAKAO_OG_IMAGE 사용
  shareUrl: string;
  buttonText?: string;
}

export async function shareToKakao(
  options: KakaoShareOptions
): Promise<{ success: boolean; fallback?: string }> {
  if (typeof window === "undefined") return { success: false };

  const {
    title,
    description,
    shareUrl,
    buttonText = "편하루에서 확인하기",
  } = options;

  // shareUrl 정규화: localhost/내부IP/상대경로 → pyeonharu.com 기반 절대 URL
  const normalizeShareUrl = (url: string): string => {
    const isLocal = /localhost|127\.0\.0\.1|192\.168/.test(url);
    if (isLocal) {
      const path = url.replace(/^https?:\/\/[^/]+/, "");
      return "https://pyeonharu.com" + path;
    }
    if (url.startsWith("/")) return "https://pyeonharu.com" + url;
    return url;
  };

  const safeShareUrl = normalizeShareUrl(shareUrl);

  // 페이로드 정규화: 카카오 API 권장 길이 + 10KB 제한 대응
  const safeTitle = title.slice(0, 50);
  const safeDesc = description.slice(0, 100);
  const safeButtonText = buttonText.slice(0, 28); // 카카오 버튼 텍스트 최대 28자

  if (!(await ensureKakaoReady())) {
    if (typeof navigator !== "undefined") navigator.clipboard?.writeText(safeShareUrl);
    return { success: false, fallback: "clipboard" };
  }

  if (
    !window.Kakao.Share ||
    typeof window.Kakao.Share.sendDefault !== "function"
  ) {
    if (typeof navigator !== "undefined") navigator.clipboard?.writeText(safeShareUrl);
    return { success: false, fallback: "clipboard" };
  }

  try {
    const payload = {
      objectType: "feed",
      installTalk: isMobileDevice(),
      content: {
        title: safeTitle,
        description: safeDesc,
        imageUrl: KAKAO_OG_IMAGE,
        link: {
          mobileWebUrl: safeShareUrl,
          webUrl: safeShareUrl,
        },
      },
      buttons: [
        {
          title: safeButtonText,
          link: {
            mobileWebUrl: safeShareUrl,
            webUrl: safeShareUrl,
          },
        },
      ],
    };

    const payloadSize = new Blob([JSON.stringify(payload)]).size;
    console.log("카카오 공유 페이로드 크기:", payloadSize, "bytes");
    console.log("카카오 공유 페이로드:", JSON.stringify(payload));
    if (payloadSize > 10240) console.warn("⚠️ 페이로드 10KB 초과:", payloadSize);

    window.Kakao.Share.sendDefault(payload);
    return { success: true };
  } catch {
    return { success: false, fallback: "error" };
  }
}
