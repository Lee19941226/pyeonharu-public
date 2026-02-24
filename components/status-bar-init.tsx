"use client";

import { useEffect } from "react";

export function StatusBarInit() {
  useEffect(() => {
    const initStatusBar = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar, Style } = await import("@capacitor/status-bar");

        // 상태바 스타일: 어두운 텍스트 (밝은 배경용)
        await StatusBar.setStyle({ style: Style.Dark });

        // 상태바 배경색: 흰색
        await StatusBar.setBackgroundColor({ color: "#ffffff" });

        // 웹뷰가 상태바 아래부터 시작 (오버레이 안 함)
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {
        // 웹 환경에서는 무시
      }
    };

    initStatusBar();
  }, []);

  return null;
}
