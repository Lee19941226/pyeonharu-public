"use client";

import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  HeartPulse,
  ShieldCheck,
  Store,
  Activity,
  Stethoscope,
  Building2,
  Pill,
} from "lucide-react";

/**
 * 서브페이지(커뮤니티, 즐겨찾기 등)에서 홈 탭 네비게이션을 표시
 * 탭 클릭 시 홈(/)으로 이동하며 해당 탭을 활성화
 */
export function HomeTabNav() {
  const router = useRouter();

  const goHome = (main: string, sub: string) => {
    try {
      localStorage.setItem("pyeonharu_nav_tab", `${main}:${sub}`);
    } catch {}
    router.push("/");
  };

  return (
    <div className="md:hidden">
      {/* 메인 탭: 식사 / 아파요 */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-40 border-b border-border/60 bg-background">
        <div className="flex">
          <button
            onClick={() => goHome("meal", "food")}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <UtensilsCrossed className="h-4 w-4" />
            식사
          </button>
          <button
            onClick={() => goHome("sick", "symptom")}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <HeartPulse className="h-4 w-4" />
            아파요
          </button>
        </div>
      </div>

      {/* 서브 탭 */}
      <div className="sticky top-[calc(6rem+env(safe-area-inset-top))] z-30 bg-background border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center overflow-x-auto scrollbar-hide">
            <button
              onClick={() => goHome("meal", "food")}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              식품
            </button>
            <button
              onClick={() => goHome("meal", "restaurant")}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              <Store className="h-3.5 w-3.5" />
              음식점
            </button>
            <button
              onClick={() => goHome("meal", "diet")}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              <Activity className="h-3.5 w-3.5" />
              식단관리
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
