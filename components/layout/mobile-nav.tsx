"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Camera, ShieldCheck, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/food", icon: ShieldCheck, label: "안전식품" },
  // 중앙 FAB는 별도 렌더링
  { href: "/food/history", icon: Bell, label: "알림" },
  { href: "/mypage", icon: User, label: "마이" },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-16 items-center justify-around">
        {/* 홈 */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
            isActive("/") && pathname === "/"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Home className="h-5 w-5" />
          <span>홈</span>
        </Link>

        {/* 안전식품 */}
        <Link
          href="/food"
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
            isActive("/food")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldCheck className="h-5 w-5" />
          <span>안전식품</span>
        </Link>

        {/* 중앙 FAB — 바코드 스캔 */}
        <button
          onClick={() => router.push("/food/camera")}
          className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          aria-label="바코드 스캔"
        >
          <Camera className="h-6 w-6" />
        </button>

        {/* 알림 (현재는 확인 기록으로 연결, Phase 2에서 알림으로 전환) */}
        <Link
          href="/food/history"
          className={cn(
            "relative flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
            isActive("/food/history")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Bell className="h-5 w-5" />
          <span>알림</span>
          {/* 위험 감지 시 빨간 점 — Phase 2에서 동적 표시 */}
          {/* <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-red-500" /> */}
        </Link>

        {/* 마이 */}
        <Link
          href="/mypage"
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
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
