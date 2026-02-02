"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, User, Heart, LogOut, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isLoading, openLoginModal, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    window.location.href = "/"
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
                <ChevronDown className="ml-1 h-3 w-3" />
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

          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/can-i-eat">먹어도 돼?</Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                오늘 뭐 입지?
                <ChevronDown className="ml-1 h-3 w-3" />
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

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {!isLoading && (
            <>
              {user ? (
                <>
                  <Button variant="ghost" size="icon" asChild className="hidden md:flex">
                    <Link href="/bookmarks">
                      <Heart className="h-5 w-5" />
                      <span className="sr-only">즐겨찾기</span>
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hidden md:flex">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/mypage">마이페이지</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/bookmarks">즐겨찾기</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        로그아웃
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="hidden text-muted-foreground hover:text-foreground md:flex"
                    onClick={openLoginModal}
                  >
                    로그인
                  </Button>
                  <Button asChild className="hidden md:flex">
                    <Link href="/sign-up">회원가입</Link>
                  </Button>
                </>
              )}
            </>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
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

            <p className="mt-4 px-3 py-2 text-xs font-semibold text-muted-foreground">먹어도 돼?</p>
            <Link
              href="/can-i-eat"
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              이거 먹어도 돼?
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

            <div className="mt-4 border-t border-border pt-4">
              {user ? (
                <>
                  <div className="mb-2 px-3 py-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
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
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      openLoginModal()
                    }}
                  >
                    로그인
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                      회원가입
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
