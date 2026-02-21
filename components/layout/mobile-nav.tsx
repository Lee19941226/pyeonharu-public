"use client";

import { usePathname } from "next/navigation";
import { UtensilsCrossed, HeartPulse, User, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface MobileNavProps {
  mainTab?: "meal" | "sick";
  onMainTabChange?: (tab: "meal" | "sick") => void;
}

export function MobileNav({ mainTab, onMainTabChange }: MobileNavProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      data-tour="bottom-nav"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {/* 식사(홈) */}
        {isHome && onMainTabChange ? (
          <button
            onClick={() => onMainTabChange("meal")}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 text-[11px] transition-colors",
              mainTab === "meal"
                ? "text-amber-600"
                : "text-muted-foreground",
            )}
          >
            <UtensilsCrossed className="h-5 w-5" />
            <span className="font-medium">식사</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex flex-col items-center gap-1 px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <UtensilsCrossed className="h-5 w-5" />
            <span>식사</span>
          </Link>
        )}

        {/* 아파요 */}
        {isHome && onMainTabChange ? (
          <button
            onClick={() => onMainTabChange("sick")}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 text-[11px] transition-colors",
              mainTab === "sick"
                ? "text-rose-600"
                : "text-muted-foreground",
            )}
          >
            <HeartPulse className="h-5 w-5" />
            <span className="font-medium">아파요</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex flex-col items-center gap-1 px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <HeartPulse className="h-5 w-5" />
            <span>아파요</span>
          </Link>
        )}

        {/* 즐겨찾기 */}
        <Link
          href="/bookmarks"
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 text-[11px] transition-colors",
            pathname.startsWith("/bookmarks")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Bookmark className="h-5 w-5" />
          <span>즐겨찾기</span>
        </Link>

        {/* 마이페이지 */}
        <Link
          href="/mypage"
          className={cn(
            "flex flex-col items-center gap-1 px-4 py-2 text-[11px] transition-colors",
            pathname.startsWith("/mypage")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="h-5 w-5" />
          <span>MY</span>
        </Link>
      </div>
    </nav>
  );
}
