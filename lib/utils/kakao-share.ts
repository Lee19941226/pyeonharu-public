export function ensureKakaoInit(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.Kakao) return false;
  if (!window.Kakao.isInitialized()) {
    try {
      window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_KEY);
    } catch {
      return false;
    }
  }
  return window.Kakao.isInitialized();
}

interface KakaoShareOptions {
  title: string;
  description: string;
  imageUrl: string;
  shareUrl: string;
  buttonText?: string;
}

export function shareToKakao(options: KakaoShareOptions) {
  const {
    title,
    description,
    imageUrl,
    shareUrl,
    buttonText = "편하루에서 확인하기",
  } = options;

  if (!ensureKakaoInit()) {
    // fallback: 링크 복사
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
