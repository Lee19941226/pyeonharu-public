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
  UtensilsCrossed,
  HeartPulse,
  Camera,
  HelpCircle,
  FileText,
  School,
  BarChart3,
  MessageSquare,
  Headphones,
  Code2,
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
import { PyeonharuLogo } from "@/components/pyeonharu-logo";

interface HeaderProps {
  mainTab?: "meal" | "sick";
  onMainTabChange?: (tab: "meal" | "sick") => void;
}

export function Header({ mainTab, onMainTabChange }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) {
          supabase
            .from("profiles")
            .select("nickname, role")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
              setNickname(
                data?.nickname ||
                  user.user_metadata?.name ||
                  user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "사용자",
              );
              setUserRole(data?.role || "user");
            });
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
        const supabase2 = createClient();
        supabase2
          .from("profiles")
          .select("nickname, role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            setNickname(
              data?.nickname ||
                user.user_metadata?.name ||
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "사용자",
            );
            setUserRole(data?.role || "user");
          });
      } else {
        setNickname(null);
        setUserRole(null);
      }
      setIsLoaded(true);
    });

    const handleProfileUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nickname) {
        setNickname(detail.nickname);
      }
    };
    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("mobile-menu-open"));
    } else {
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("mobile-menu-close"));
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) setIsMobileMenuOpen(false);
    },
    [isMobileMenuOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [handleEsc]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setNickname(null);
    setUserRole(null);
    router.push("/");
    router.refresh();
  };

  const handleNavToHome = (tab: "meal" | "sick") => {
    if (isHome && onMainTabChange) {
      onMainTabChange(tab);
    } else {
      try {
        localStorage.setItem(
          "pyeonharu_nav_tab",
          `${tab}:${tab === "meal" ? "food" : "symptom"}`,
        );
      } catch {}
      router.push("/");
    }
  };

  const isLoggedIn = isLoaded && nickname !== null;
  const isAdminUser = userRole === "admin" || userRole === "super_admin";
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full bg-background pt-[env(safe-area-inset-top)]">
      {/* 메인 바 */}
      <div className="border-b border-border/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* 좌: 로고 */}
          <Link href="/" className="flex items-center shrink-0">
            <PyeonharuLogo size="sm" />
          </Link>

          {/* 중: 데스크톱 메인 탭 */}
          <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            <button
              onClick={() => handleNavToHome("meal")}
              className={`relative flex items-center gap-1.5 px-5 py-2 text-sm font-semibold transition-colors ${
                isHome && mainTab === "meal"
                  ? "text-amber-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UtensilsCrossed className="h-4 w-4" />
              식사
              {isHome && mainTab === "meal" && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full bg-amber-500" />
              )}
            </button>
            <button
              onClick={() => handleNavToHome("sick")}
              className={`relative flex items-center gap-1.5 px-5 py-2 text-sm font-semibold transition-colors ${
                isHome && mainTab === "sick"
                  ? "text-rose-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HeartPulse className="h-4 w-4" />
              아파요
              {isHome && mainTab === "sick" && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full bg-rose-500" />
              )}
            </button>
          </nav>

          {/* 우: 데스크톱 액션 */}
          <div className="hidden items-center gap-1.5 md:flex">
            {isLoggedIn && isAdminUser && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                관리자
              </Link>
            )}
            {isLoggedIn && userRole === "super_admin" && (
              <Link
                href="/portfolio"
                className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <Code2 className="h-3.5 w-3.5" />
                포트폴리오
              </Link>
            )}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-9 rounded-full">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-3.5 w-3.5 text-primary" />
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
                  <DropdownMenuItem asChild>
                    <Link href="/support" className="flex items-center gap-2">
                      <Headphones className="h-4 w-4" />
                      고객센터
                    </Link>
                  </DropdownMenuItem>
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
                <Button asChild size="sm" className="rounded-full h-9 px-4">
                  <Link href="/login">로그인</Link>
                </Button>
              )
            )}
          </div>

          {/* 모바일: 햄버거 */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
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
      </div>

      {/* 모바일 풀스크린 메뉴 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] bottom-0 z-[9999] bg-background md:hidden overflow-y-auto"
          style={{
            height: "calc(100vh - 3.5rem - env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="container mx-auto px-4 py-4">
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
            {isLoggedIn && isAdminUser && (
              <Link
                href="/admin"
                onClick={closeMobileMenu}
                className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
              >
                <ShieldCheck className="h-4 w-4" />
                관리자 페이지
              </Link>
            )}
            {isLoggedIn && userRole === "super_admin" && (
              <Link
                href="/portfolio"
                onClick={closeMobileMenu}
                className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
              >
                <Code2 className="h-4 w-4" />
                포트폴리오
              </Link>
            )}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground px-1">
                주요 기능
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/food"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                    <Camera className="h-4.5 w-4.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">안전 확인</p>
                    <p className="text-[10px] text-muted-foreground">
                      바코드/사진
                    </p>
                  </div>
                </Link>
                <Link
                  href="/community"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                    <MessageSquare className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">커뮤니티</p>
                    <p className="text-[10px] text-muted-foreground">급식톡</p>
                  </div>
                </Link>
              </div>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground px-1">
                서비스
              </p>
              <div className="space-y-0.5">
                <Link
                  href="/school"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <School className="h-4.5 w-4.5 text-muted-foreground" />
                  <span>학교 급식 관리</span>
                </Link>
                <Link
                  href="/reports"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <BarChart3 className="h-4.5 w-4.5 text-muted-foreground" />
                  <span>주간 안전 리포트</span>
                </Link>
              </div>
            </div>
            {isLoggedIn && (
              <div className="mb-4 border-t pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground px-1">
                  내 계정
                </p>
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
            <div className="border-t pt-3">
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/support"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  고객센터
                </Link>
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
