function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
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

export interface KakaoShareOptions {
  title: string;
  description: string;
  imageUrl: string;
  shareUrl: string;
  buttonText?: string;
}

export async function shareToKakao(
  options: KakaoShareOptions
): Promise<{ success: boolean; fallback?: string }> {
  const {
    title,
    description,
    imageUrl,
    shareUrl,
    buttonText = "편하루에서 확인하기",
  } = options;

  if (!(await ensureKakaoReady())) {
    navigator.clipboard?.writeText(shareUrl);
    return { success: false, fallback: "clipboard" };
  }

  if (
    !window.Kakao.Share ||
    typeof window.Kakao.Share.sendDefault !== "function"
  ) {
    navigator.clipboard?.writeText(shareUrl);
    return { success: false, fallback: "clipboard" };
  }

  try {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      installTalk: isMobileDevice(),
      content: {
        title,
        description,
        imageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: buttonText,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
    return { success: true };
  } catch {
    return { success: false, fallback: "error" };
  }
}
