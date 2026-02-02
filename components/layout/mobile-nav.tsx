"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MapPin, UtensilsCrossed, User } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", icon: Home, label: "홈" },
    { href: "/search", icon: MapPin, label: "병원/약국" },
    { href: "/food", icon: UtensilsCrossed, label: "식품 확인" }, // 🆕 추가
    { href: "/medicine", icon: Search, label: "약 검색" },
    { href: "/mypage", icon: User, label: "마이페이지" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
