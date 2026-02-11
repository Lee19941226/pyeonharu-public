"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MapPin, Camera, MessageSquare, User } from "lucide-react";
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

        {/* 위치 (병원/약국) */}
        <Link
          href="/search"
          className={cn(
            "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
            isActive("/search")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MapPin className="h-5 w-5" />
          <span>위치</span>
        </Link>

        {/* 중앙 FAB — 바코드 스캔 */}
        <button
          onClick={() => router.push("/food/camera")}
          className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          aria-label="바코드 스캔"
        >
          <Camera className="h-6 w-6" />
        </button>

        {/* 커뮤니티 */}
        <Link
          href="/community"
          className={cn(
            "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
            isActive("/community")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MessageSquare className="h-5 w-5" />
          <span>커뮤니티</span>
        </Link>

        {/* 마이페이지 */}
        <Link
          href="/mypage"
          className={cn(
            "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
            isActive("/mypage")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="h-5 w-5" />
          <span>마이</span>
        </Link>
      </div>
    </nav>
  );
}
