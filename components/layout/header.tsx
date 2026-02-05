"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Menu, X, User, Bookmark, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"

export function Header() {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // 1) 초기 세션 확인 - auth만 사용 (profiles DB 조회 없음)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user
        setNickname(
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "사용자"
        )
      }
      setIsLoaded(true)
    }).catch(() => {
      setIsLoaded(true)
    })

    // 2) 로그인/로그아웃 실시간 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user
        setNickname(
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "사용자"
        )
      } else {
        setNickname(null)
      }
      setIsLoaded(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setNickname(null)
    router.push("/")
    router.refresh()
  }

  const isLoggedIn = isLoaded && nickname !== null

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">편</span>
          </div>
          <span className="text-xl font-bold text-foreground">편하루</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                병원/약국
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem asChild>
                <Link href="/search">지도로 검색</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/symptom">증상으로 추천</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/medicine">약 정보 검색</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                오늘 뭐 입지?
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem asChild>
                <Link href="/today">오늘의 코디</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/closet">내 옷장</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/weather">날씨 상세</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/history">코디 기록</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/about">서비스 소개</Link>
          </Button>
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/faq">FAQ</Link>
          </Button>
        </nav>

        {/* Right Actions - Desktop */}
        <div className="hidden items-center gap-2 md:flex">
          {isLoggedIn ? (
            /* 로그인 상태: 닉네임 드롭다운 */
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
            /* 비로그인 상태: 로그인 버튼 */
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
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="container mx-auto space-y-1 px-4 py-4">
            {/* 로그인 상태 표시 (모바일) */}
            {isLoggedIn && (
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{nickname}</p>
                  <div className="mt-1 flex gap-2">
                    <Link
                      href="/mypage"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      마이페이지
                    </Link>
                    <span className="text-xs text-muted-foreground">·</span>
                    <Link
                      href="/bookmarks"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      즐겨찾기
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">병원/약국</p>
              <Link
                href="/search"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                지도로 검색
              </Link>
              <Link
                href="/symptom"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                증상으로 추천
              </Link>
              <Link
                href="/medicine"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                약 정보 검색
              </Link>
            </div>

            <div className="space-y-1">
              <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">오늘 뭐 입지?</p>
              <Link
                href="/today"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                오늘의 코디
              </Link>
              <Link
                href="/closet"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                내 옷장
              </Link>
              <Link
                href="/weather"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                날씨 상세
              </Link>
              <Link
                href="/history"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                코디 기록
              </Link>
            </div>

            <div className="space-y-1">
              <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">기타</p>
              <Link
                href="/about"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                서비스 소개
              </Link>
              <Link
                href="/faq"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                FAQ
              </Link>
            </div>

            {isLoggedIn ? (
              <Button
                variant="outline"
                className="mt-4 w-full text-destructive hover:text-destructive"
                onClick={() => {
                  handleLogout()
                  setIsMobileMenuOpen(false)
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            ) : (
              <Button asChild className="mt-4 w-full">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  로그인
                </Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
