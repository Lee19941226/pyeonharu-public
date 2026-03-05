"use client";

import { AdBanner } from "@/components/ad-banner";

export function AdSidebar() {
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
