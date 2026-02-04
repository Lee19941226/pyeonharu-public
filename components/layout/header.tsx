"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Menu, X, User, Heart, LogOut } from "lucide-react"
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
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 로그인 상태 체크
  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          setUser({
            email: authUser.email || "",
            name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "사용자",
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkUser()

    // Auth 상태 변경 리스너
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "사용자",
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 로그아웃 처리
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push("/")
    router.refresh()
  }

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
                이거 먹어도 돼?
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem asChild>
                <Link href="/can-i-eat">알러지 분석</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/mypage">알러지 정보 등록</Link>
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
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/bookmarks">
              <Heart className="h-5 w-5" />
              <span className="sr-only">즐겨찾기</span>
            </Link>
          </Button>
          
          {isLoading ? (
            <Button variant="ghost" disabled>
              <span className="h-4 w-16 animate-pulse rounded bg-muted" />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="max-w-[100px] truncate">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/mypage" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    마이페이지
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bookmarks" className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    즐겨찾기
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">로그인</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">메뉴</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="container mx-auto flex flex-col gap-1 px-4 py-4">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">병원/약국</p>
            <Link
              href="/search"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              지도로 검색
            </Link>
            <Link
              href="/symptom"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              증상으로 추천
            </Link>
            <Link
              href="/medicine"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              약 정보 검색
            </Link>

            <p className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground">이거 먹어도 돼?</p>
            <Link
              href="/can-i-eat"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              알러지 분석
            </Link>
            <Link
              href="/mypage"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              알러지 정보 등록
            </Link>

            <p className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground">오늘 뭐 입지?</p>
            <Link
              href="/today"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              오늘의 코디
            </Link>
            <Link
              href="/closet"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              내 옷장
            </Link>
            <Link
              href="/weather"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              날씨 상세
            </Link>
            <Link
              href="/history"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              코디 기록
            </Link>

            <div className="mt-4 border-t border-border pt-4">
              <Link
                href="/about"
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                서비스 소개
              </Link>
              
              {user ? (
                <>
                  <Link
                    href="/mypage"
                    className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    {user.name}님
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="mt-2 block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  로그인
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
