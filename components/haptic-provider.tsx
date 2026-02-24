"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/utils/haptic";

/**
 * 전역 햅틱 피드백 Provider
 * - 모든 <button>, <a>, [role="button"], input[type="submit"] 클릭 시 진동
 * - Android에서만 작동 (iOS는 navigator.vibrate 미지원, 무시됨)
 */
export function HapticProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 진동 미지원 환경이면 리스너 등록 자체를 건너뜀
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 클릭된 요소 또는 가장 가까운 버튼/링크 찾기
      const clickable = target.closest(
        'button, a, [role="button"], input[type="submit"], [data-haptic]'
      );
      if (clickable) {
        haptic("light");
      }
    };

    // touchstart로 처리 (모바일에서 더 즉각적인 반응)
    document.addEventListener("touchstart", handler, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  return <>{children}</>;
}
