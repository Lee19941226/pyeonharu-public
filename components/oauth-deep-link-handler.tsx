"use client";

import { useEffect } from "react";

/**
 * Capacitor 앱에서 OAuth 딥링크를 처리하는 핸들러
 *
 * 흐름:
 * 1. signInWithOAuth → Chrome Custom Tab에서 Google/Kakao 인증
 * 2. 인증 완료 → https://www.pyeonharu.com/auth/callback?code=... 로 리다이렉트
 * 3. AndroidManifest의 intent-filter가 딥링크를 잡아 앱으로 복귀
 * 4. 이 핸들러가 appUrlOpen 이벤트를 받아 WebView를 콜백 URL로 이동
 * 5. 서버의 /auth/callback 라우트가 코드를 교환하고 세션 설정
 */
export function OAuthDeepLinkHandler() {
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const setup = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");

        const listener = await App.addListener("appUrlOpen", ({ url }) => {
          // OAuth 콜백 URL인지 확인
          if (url.includes("/auth/callback")) {
            // WebView를 콜백 URL로 이동시켜 서버가 처리하도록 함
            window.location.href = url;
          }
        });

        removeListener = () => listener.remove();
      } catch {
        // @capacitor/app 미설치 또는 웹 환경
      }
    };

    setup();
    return () => {
      removeListener?.();
    };
  }, []);

  return null;
}
