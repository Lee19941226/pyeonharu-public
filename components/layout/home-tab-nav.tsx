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
    // localStorage에 탭 상태 임시 저장 → 홈에서 읽어서 활성화
    try {
      localStorage.setItem("pyeonharu_nav_tab", `${main}:${sub}`);
    } catch {}
    router.push("/");
  };

  return (
    <div className="md:hidden">
      {/* 메인 탭: 식사 / 아파요 */}
      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex">
          <button
            onClick={() => goHome("meal", "food")}
            className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            <UtensilsCrossed className="h-5 w-5" />
            식사
          </button>
          <button
            onClick={() => goHome("sick", "symptom")}
            className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            <HeartPulse className="h-5 w-5" />
            아파요
          </button>
        </div>
      </div>

      {/* 서브 탭 */}
      <div className="sticky top-[7.5rem] z-30 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center overflow-x-auto scrollbar-hide">
            <button
              onClick={() => goHome("meal", "food")}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4" />
              식품
            </button>
            <button
              onClick={() => goHome("meal", "restaurant")}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              <Store className="h-4 w-4" />
              음식점
            </button>
            <button
              onClick={() => goHome("meal", "diet")}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              <Activity className="h-4 w-4" />
              식단관리
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
