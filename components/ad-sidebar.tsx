"use client";

import { usePathname } from "next/navigation";
import { AdBanner } from "@/components/ad-banner";

// 광고를 표시하지 않을 페이지 경로
const NO_AD_PATHS = [
  "/login",
  "/sign-up",
  "/signup",
  "/sign-up-complete",
  "/sign-up-success",
  "/forgot-password",
  "/reset-password",
  "/offline",
  "/terms",
  "/privacy",
  "/auth",
  "/error",
  "/not-found",
  "/verify",
];

export function AdSidebar() {
  const pathname = usePathname();

  // 광고 제외 페이지이면 렌더링하지 않음
  const isExcluded = NO_AD_PATHS.some((path) => pathname.startsWith(path));
  if (isExcluded) return null;

  return (
    <>
      {/* 왼쪽 사이드바 광고 - 데스크톱만 */}
      <div className="hidden xl:block fixed left-2 top-1/2 -translate-y-1/2 w-[160px] z-40">
        <AdBanner format="vertical" responsive={false} />
      </div>

      {/* 오른쪽 사이드바 광고 - 데스크톱만 */}
      <div className="hidden xl:block fixed right-2 top-1/2 -translate-y-1/2 w-[160px] z-40">
        <AdBanner format="vertical" responsive={false} />
      </div>
    </>
  );
}
