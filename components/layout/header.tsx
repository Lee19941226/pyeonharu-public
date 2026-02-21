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
  const [userRole, setUserRole] = useState<string | null>(null); // ← 추가
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
          // ← role 조회 추가
          supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
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
        setNickname(
          user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "사용자",
        );
        // ← role 조회 추가
        const supabase2 = createClient();
        supabase2
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            setUserRole(data?.role || "user");
          });
      } else {
        setNickname(null);
        setUserRole(null); // ← 추가
      }
      setIsLoaded(true);
    });
    return () => subscription.unsubscribe();
  }, []);

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
    setUserRole(null); // ← 추가
    router.push("/");
    router.refresh();
  };

  const isLoggedIn = isLoaded && nickname !== null;
  const isAdminUser = userRole === "admin" || userRole === "super_admin"; // ← 추가
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <PyeonharuLogo size="sm" />
        </Link>

        {isHome && onMainTabChange && (
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <button
              onClick={() => onMainTabChange("meal")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mainTab === "meal" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <UtensilsCrossed className="h-4 w-4" />
              식사
            </button>
            <button
              onClick={() => onMainTabChange("sick")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mainTab === "sick" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <HeartPulse className="h-4 w-4" />
              아파요
            </button>
          </nav>
        )}

        {!isHome && (
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <UtensilsCrossed className="h-4 w-4" />홈
            </Link>
          </nav>
        )}

        <div className="hidden items-center gap-2 md:flex">
          {/* ← 관리자 버튼 추가 (데스크톱) */}
          {isLoggedIn && isAdminUser && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              관리자
            </Link>
          )}
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

      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 border-t bg-background md:hidden overflow-y-auto">
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
            {/* ← 관리자 버튼 추가 (모바일) */}
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
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground px-1">
                주요 기능
              </p>
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
