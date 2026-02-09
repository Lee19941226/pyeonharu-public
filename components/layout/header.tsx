"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, User, Bookmark, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [foodFavoritesCount, setFoodFavoritesCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    // [Phase 0] getSession() → getUser() 변경 (서버 검증)
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
          fetchFoodFavoritesCount();
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });

    // 로그인/로그아웃 실시간 감지 (유지)
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setNickname(null);
    router.push("/");
    router.refresh();
  };

  const isLoggedIn = isLoaded && nickname !== null;

  const fetchFoodFavoritesCount = async () => {
    try {
      const res = await fetch("/api/food/favorites");
      const data = await res.json();
      if (data.success) {
        setFoodFavoritesCount(data.favorites?.length || 0);
      }
    } catch (e) {
      // 에러 무시 (추후 Sentry 연동)
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">
              편
            </span>
          </div>
          <span className="text-xl font-bold text-foreground">편하루</span>
        </Link>

        {/* Desktop Navigation — 핵심 네비 제거, 로고+로그인만 */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* 추후 푸터로 이동 완료 후 필요시 네비 추가 */}
        </nav>

        {/* Right Actions - Desktop */}
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

        {/* Right Actions - Mobile (hamburger only) */}
        <div className="flex items-center md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu — 간소화 */}
      {isMobileMenuOpen && (
        <div className="border-t bg-background md:hidden">
          <nav className="container mx-auto space-y-1 px-4 py-4">
            {isLoggedIn ? (
              <>
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{nickname}</span>
                </div>
                <Link
                  href="/mypage"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  마이페이지
                </Link>
                <Link
                  href="/bookmarks"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  즐겨찾기
                </Link>
                <Link
                  href="/food/profile"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  내 알레르기 정보
                </Link>
                <Link
                  href="/food/history"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  확인 기록
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
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
