"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/utils/haptic";

/**
 * 전역 햅틱 피드백 Provider
 * - 모든 button, a, [role="button"] 터치 시 진동
 * - Capacitor Haptics 플러그인 우선, navigator.vibrate 폴백
 */
export function HapticProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickable = target.closest(
        'button, a, [role="button"], input[type="submit"], label[class*="cursor-pointer"], [data-haptic]'
      );
      if (clickable) {
        haptic("light");
      }
    };

    document.addEventListener("touchstart", handler, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  return <>{children}</>;
}
