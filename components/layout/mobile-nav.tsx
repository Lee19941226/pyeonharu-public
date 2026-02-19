"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Camera, UtensilsCrossed, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      data-tour="bottom-nav"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {/* 홈 */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
            pathname === "/"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Home className="h-5 w-5" />
          <span>홈</span>
        </Link>

        {/* 안전 확인 카메라 (왼쪽 중앙) */}
        <button
          onClick={() => router.push("/food/camera")}
          className={cn(
            "relative -mt-5 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
            isActive("/food")
              ? "bg-primary text-primary-foreground"
              : "bg-primary/90 text-primary-foreground",
          )}
          aria-label="식품 안전 확인"
        >
          <Camera className="h-6 w-6" />
          {/* 안전 뱃지 */}
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow-sm">
            <ShieldCheck className="h-3 w-3 text-white" />
          </div>
        </button>

        {/* 식단 관리 카메라 (오른쪽 중앙) */}
        <button
          onClick={() => router.push("/diet")}
          className={cn(
            "relative -mt-5 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
            isActive("/diet")
              ? "bg-orange-500 text-white"
              : "bg-orange-400 text-white",
          )}
          aria-label="식단 관리"
        >
          <Camera className="h-6 w-6" />
          {/* 식단 라벨 */}
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-sm text-[8px] font-bold text-white">
            🍽️
          </div>
        </button>

        {/* 음식점 */}
        <Link
          href="/restaurant"
          className={cn(
            "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
            isActive("/restaurant")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <UtensilsCrossed className="h-5 w-5" />
          <span>음식점</span>
        </Link>
      </div>

      {/* 카메라 버튼 아래 라벨 */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-16 pointer-events-none">
        <span className="text-[10px] text-muted-foreground ml-1">안전확인</span>
        <span className="text-[10px] text-muted-foreground mr-1">식단관리</span>
      </div>
    </nav>
  );
}
