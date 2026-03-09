"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGeoRegion } from "@/hooks/useGeoRegion";

/**
 * 페이지 방문을 추적하여 액션 로그에 기록합니다.
 * Next.js 라우트 변경 시마다 자동으로 호출됩니다.
 * GPS 위치 정보가 있으면 함께 전송합니다.
 */
export function usePageTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string>("");
  const geo = useGeoRegion();

  useEffect(() => {
    // 같은 경로 중복 방지
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    // 관리자 페이지, API 경로 등은 추적 제외
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    fetch("/api/track/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        ...(geo.region && {
          _geo_region: geo.region,
          _geo_source: geo.source,
        }),
      }),
    }).catch(() => {});
  }, [pathname, geo]);
}
