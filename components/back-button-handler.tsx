"use client";

import { useEffect, useRef } from "react";
import { popBackHandler, hasBackHandler } from "@/lib/utils/back-stack";

/**
 * Android 하드웨어 뒤로가기 버튼 전역 핸들러
 *
 * 우선순위:
 * 1. backStack에 핸들러가 있으면 → 가장 최근 모달/팝업 닫기
 * 2. 브라우저 히스토리가 있으면 → history.back()
 * 3. 더 이상 없으면 → "앱을 종료하시겠습니까?" 확인
 */
export function BackButtonHandler() {
  const isExitConfirmOpen = useRef(false);

  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const setup = async () => {
      try {
        const { App } = await import("@capacitor/app");
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          if (isExitConfirmOpen.current) return;

          // 1순위: 열린 모달/팝업/바텀시트 닫기
          if (hasBackHandler()) {
            popBackHandler();
            return;
          }

          // 2순위: 브라우저 히스토리 뒤로가기
          if (canGoBack) {
            window.history.back();
            return;
          }

          // 3순위: 앱 종료 확인
          isExitConfirmOpen.current = true;
          const shouldExit = window.confirm("편하루 앱을 종료하시겠습니까?");
          isExitConfirmOpen.current = false;

          if (shouldExit) {
            App.exitApp();
          }
        });

        removeListener = () => listener.remove();
      } catch {
        // @capacitor/app 미설치 또는 웹 환경
      }
    };

    setup();
    return () => { removeListener?.(); };
  }, []);

  return null;
}
