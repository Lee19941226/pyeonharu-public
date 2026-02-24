"use client";

import { useEffect, useRef } from "react";

/**
 * Android 하드웨어 뒤로가기 버튼 전역 핸들러
 * 
 * 동작:
 * 1. 브라우저 히스토리가 있으면 → window.history.back()
 * 2. 더 이상 뒤로갈 곳이 없으면 → "앱을 종료하시겠습니까?" confirm
 * 3. 확인 → 앱 종료 (App.exitApp)
 * 4. 취소 → 무시
 * 
 * Capacitor 앱이 아닌 환경(웹 브라우저)에서는 아무 동작 안 함
 */
export function BackButtonHandler() {
  const isExitConfirmOpen = useRef(false);

  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const setup = async () => {
      try {
        const { App } = await import("@capacitor/app");

        // Capacitor 환경인지 확인
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          // 이미 종료 확인 다이얼로그가 열려있으면 무시
          if (isExitConfirmOpen.current) return;

          if (canGoBack) {
            // 히스토리가 있으면 뒤로가기
            window.history.back();
          } else {
            // 더 이상 뒤로갈 곳이 없으면 종료 확인
            isExitConfirmOpen.current = true;
            const shouldExit = window.confirm("편하루 앱을 종료하시겠습니까?");
            isExitConfirmOpen.current = false;
            
            if (shouldExit) {
              App.exitApp();
            }
          }
        });

        removeListener = () => listener.remove();
      } catch {
        // @capacitor/app 미설치 또는 웹 환경 → 무시
      }
    };

    setup();

    return () => {
      removeListener?.();
    };
  }, []);

  return null;
}
