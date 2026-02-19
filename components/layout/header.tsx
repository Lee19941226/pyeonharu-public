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
  Home,
  UtensilsCrossed,
  Activity,
  Camera,
  MapPin,
  HelpCircle,
  FileText,
  School,
  BarChart3,
  MessageSquare,
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

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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

        {/* 상단 탭 (Desktop) */}
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
          <Link
            href="/diet"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith("/diet")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Activity className="h-4 w-4" />
            식단관리
          </Link>
        </nav>

        {/* Desktop — 로그인/프로필 */}
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

      {/* ═══════════════════════════════════════════════
          Mobile Menu — full overlay
          ═══════════════════════════════════════════════ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 border-t bg-background md:hidden overflow-y-auto">
          <div className="container mx-auto px-4 py-4">

            {/* ── 사용자 프로필 영역 ── */}
            {isLoggedIn ? (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{nickname}</p>
                  <p className="text-xs text-muted-foreground">환영합니다!</p>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
              >
                <User className="h-4 w-4" />
                로그인 / 회원가입
              </Link>
            )}

            {/* ── 주요 메뉴 (Quick Actions) ── */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground px-1">주요 기능</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/food/camera"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                    <Camera className="h-4.5 w-4.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">안전 확인</p>
                    <p className="text-[10px] text-muted-foreground">바코드/사진</p>
                  </div>
                </Link>
                <Link
                  href="/diet"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                    <Activity className="h-4.5 w-4.5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">식단 관리</p>
                    <p className="text-[10px] text-muted-foreground">칼로리/영양</p>
                  </div>
                </Link>
                <Link
                  href="/restaurant"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <UtensilsCrossed className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">음식점</p>
                    <p className="text-[10px] text-muted-foreground">알레르기 매칭</p>
                  </div>
                </Link>
                <Link
                  href="/search"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                    <MapPin className="h-4.5 w-4.5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">병원/약국</p>
                    <p className="text-[10px] text-muted-foreground">주변 검색</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* ── 서비스 메뉴 ── */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground px-1">서비스</p>
              <div className="space-y-0.5">
                <Link
                  href="/school"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <School className="h-4.5 w-4.5 text-muted-foreground" />
                  <span>학교 급식 확인</span>
                </Link>
                <Link
                  href="/food/profile"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground" />
                  <span>내 알레르기 정보</span>
                </Link>
                <Link
                  href="/weekly-report"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <BarChart3 className="h-4.5 w-4.5 text-muted-foreground" />
                  <span>주간 안전 리포트</span>
                </Link>
                <Link
                  href="/community"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <MessageSquare className="h-4.5 w-4.5 text-muted-foreground" />
                  <span>커뮤니티</span>
                </Link>
              </div>
            </div>

            {/* ── 계정/설정 메뉴 ── */}
            {isLoggedIn && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground px-1">내 계정</p>
                <div className="space-y-0.5">
                  <Link
                    href="/mypage"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4.5 w-4.5 text-muted-foreground" />
                    <span>마이페이지</span>
                  </Link>
                  <Link
                    href="/bookmarks"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    <Bookmark className="h-4.5 w-4.5 text-muted-foreground" />
                    <span>즐겨찾기</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMobileMenu();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-muted transition-colors"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── 고객지원 ── */}
            <div className="border-t pt-3">
              <div className="flex gap-3">
                <Link
                  href="/faq"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  자주 묻는 질문
                </Link>
                <Link
                  href="/about"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  서비스 소개
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
