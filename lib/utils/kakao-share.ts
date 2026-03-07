let sdkLoadPromise: Promise<void> | null = null;
const CANONICAL_ORIGIN = "https://www.pyeonharu.com";

function loadKakaoSDK(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.Kakao && window.Kakao.Share && window.Kakao.isInitialized()) {
    return Promise.resolve();
  }
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    // If layout.tsx already injected the script tag, attach to it.
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="kakao_js_sdk"]'
    );
    if (existing) {
      if (window.Kakao) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Kakao SDK load failed")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
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

// Next.js App Router metadata route: app/opengraph-image.tsx
const KAKAO_OG_IMAGE = `${CANONICAL_ORIGIN}/opengraph-image`;

export interface KakaoShareOptions {
  title: string;
  description: string;
  imageUrl?: string; // currently ignored, fixed OG image is used
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

  // Always send links on canonical host to avoid Kakao domain mismatch on mobile origins.
  const normalizeShareUrl = (url: string): string => {
    const toCanonical = (pathWithQueryHash: string) => {
      const safePath = pathWithQueryHash.startsWith("/")
        ? pathWithQueryHash
        : `/${pathWithQueryHash}`;
      return `${CANONICAL_ORIGIN}${safePath}`;
    };

    if (url.startsWith("/")) return toCanonical(url);

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const isAllowedHost =
        host === "www.pyeonharu.com" || host === "pyeonharu.com";

      if (isAllowedHost) {
        return toCanonical(`${parsed.pathname}${parsed.search}${parsed.hash}`);
      }

      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
      ) {
        return toCanonical(`${parsed.pathname}${parsed.search}${parsed.hash}`);
      }

      return CANONICAL_ORIGIN;
    } catch {
      if (!url) return CANONICAL_ORIGIN;
      return toCanonical(url);
    }
  };

  const safeShareUrl = normalizeShareUrl(shareUrl);

  // Keep payload small within Kakao recommendation and hard limit (~10KB)
  const safeTitle = title.slice(0, 50);
  const safeDesc = description.slice(0, 100);
  const safeButtonText = buttonText.slice(0, 28);

  if (!(await ensureKakaoReady())) {
    if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(safeShareUrl);
    }
    return { success: false, fallback: "clipboard" };
  }

  if (
    !window.Kakao.Share ||
    typeof window.Kakao.Share.sendDefault !== "function"
  ) {
    if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(safeShareUrl);
    }
    return { success: false, fallback: "clipboard" };
  }

  try {
    const payload = {
      objectType: "feed",
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
    console.log("[Kakao Share] safeShareUrl:", safeShareUrl);
    console.log("[Kakao Share] payload size:", payloadSize, "bytes");
    console.log("[Kakao Share] payload:", JSON.stringify(payload));
    if (payloadSize > 10240) {
      console.warn("[Kakao Share] payload exceeds 10KB:", payloadSize);
    }

    window.Kakao.Share.sendDefault(payload);
    return { success: true };
  } catch {
    return { success: false, fallback: "error" };
  }
}
