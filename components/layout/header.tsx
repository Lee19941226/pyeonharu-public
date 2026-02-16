"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  X,
  User,
  Bookmark,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { Home, UtensilsCrossed } from "lucide-react";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          setNickname(
            user.user_metadata?.name ||
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "사용자",
          );
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        setNickname(
          user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "사용자",
        );
      } else {
        setNickname(null);
      }
      setIsLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 모바일 메뉴 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    },
    [isMobileMenuOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [handleEsc]);

  // 경로 변경 시 메뉴 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setNickname(null);
    router.push("/");
    router.refresh();
  };

  const isLoggedIn = isLoaded && nickname !== null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">
              편
            </span>
          </div>
          <span className="text-xl font-bold text-foreground">편하루</span>
        </Link>
        {/* 상단 탭 */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Home className="h-4 w-4" />홈
          </Link>
          <Link
            href="/restaurant"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith("/restaurant")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            음식점
          </Link>
        </nav>
        {/* Desktop — 네비 탭 없음 (로고 + 로그인만) */}
        <div className="hidden items-center gap-2 md:flex">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="max-w-[100px] truncate text-sm font-medium">
                    {nickname}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{nickname}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/mypage" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    마이페이지
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bookmarks" className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    즐겨찾기
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/food/profile"
                    className="flex items-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" />내 알레르기 정보
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            isLoaded && (
              <Button asChild>
                <Link href="/login">로그인</Link>
              </Button>
            )
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu — full overlay, 스크롤 잠금 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 border-t bg-background md:hidden overflow-y-auto">
          <nav className="container mx-auto space-y-1 px-4 py-4">
            {/* 탭 메뉴 */}
            <div className="mb-3 flex gap-2">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium ${
                  pathname === "/"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Home className="h-4 w-4" />홈
              </Link>
              <Link
                href="/restaurant"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium ${
                  pathname.startsWith("/restaurant")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <UtensilsCrossed className="h-4 w-4" />
                음식점
              </Link>
            </div>
            {isLoggedIn ? (
              <div className="space-y-1">
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{nickname}</span>
                </div>
                <Link
                  href="/mypage"
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  마이페이지
                </Link>
                <Link
                  href="/bookmarks"
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <Bookmark className="h-5 w-5 text-muted-foreground" />
                  즐겨찾기
                </Link>
                <Link
                  href="/food/profile"
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />내
                  알레르기 정보
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-destructive hover:bg-muted"
                >
                  <LogOut className="h-5 w-5" />
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="block rounded-md bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
