"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Building2, Cross, MapPin, Phone, Trash2, Heart, ChevronLeft, User, Bookmark,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { LoginModal } from "@/components/auth/login-modal"

interface BookmarkItem {
  id: string
  name: string
  address: string
  phone: string
  category?: string
  lat: number
  lng: number
  bookmarkId: string
  createdAt: string
}

export default function BookmarksPage() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const [tab, setTab] = useState<"hospital" | "pharmacy">("hospital")
  const [hospitals, setHospitals] = useState<BookmarkItem[]>([])
  const [pharmacies, setPharmacies] = useState<BookmarkItem[]>([])
  const [bookmarkLoading, setBookmarkLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) fetchBookmarks()
      setIsLoading(false)
    }
    init()
  }, [])

  const fetchBookmarks = async () => {
    setBookmarkLoading(true)
    try {
      const res = await fetch("/api/bookmarks")
      const data = await res.json()
      if (data.success) {
        setHospitals(data.hospitals || [])
        setPharmacies(data.pharmacies || [])
      }
    } catch (e) {
      console.error("Failed to fetch bookmarks:", e)
    } finally {
      setBookmarkLoading(false)
    }
  }

  const handleRemove = async (type: "hospital" | "pharmacy", itemId: string) => {
    const res = await fetch(`/api/bookmarks?type=${type}&id=${itemId}`, { method: "DELETE" })
    if (res.ok) {
      if (type === "hospital") {
        setHospitals((prev) => prev.filter((h) => h.id !== itemId))
      } else {
        setPharmacies((prev) => prev.filter((p) => p.id !== itemId))
      }
    }
  }

  // 로딩
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="font-bold text-primary-foreground">편</span>
              </div>
              <span className="font-bold">편하루</span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </main>
      </div>
    )
  }

  // 비로그인
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="font-bold text-primary-foreground">편</span>
              </div>
              <span className="font-bold">편하루</span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <Bookmark className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">로그인이 필요합니다</h1>
          <p className="mb-6 text-center text-muted-foreground">
            즐겨찾기를 이용하려면 로그인해주세요
          </p>
          <Button onClick={() => setLoginModalOpen(true)}>로그인하기</Button>
        </main>
        <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} onSuccess={() => router.refresh()} />
      </div>
    )
  }

  const currentItems = tab === "hospital" ? hospitals : pharmacies

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold">즐겨찾기</h1>
          </div>
          <Link href="/mypage" className="text-sm text-muted-foreground hover:text-foreground">
            마이페이지
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">

            {/* 탭 */}
            <div className="mb-4 flex gap-2">
              <Button
                variant={tab === "hospital" ? "default" : "outline"}
                onClick={() => setTab("hospital")}
                className="flex-1"
              >
                <Building2 className="mr-2 h-4 w-4" />
                병원 ({hospitals.length})
              </Button>
              <Button
                variant={tab === "pharmacy" ? "default" : "outline"}
                onClick={() => setTab("pharmacy")}
                className="flex-1"
              >
                <Cross className="mr-2 h-4 w-4" />
                약국 ({pharmacies.length})
              </Button>
            </div>

            {/* 목록 */}
            {bookmarkLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : currentItems.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Heart className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="mb-1 font-medium">
                  즐겨찾기한 {tab === "hospital" ? "병원" : "약국"}이 없습니다
                </p>
                <p className="mb-6 text-sm text-muted-foreground">
                  병원/약국 상세 페이지에서 ♡ 버튼을 눌러 추가하세요
                </p>
                <Button asChild>
                  <Link href="/search">검색하러 가기</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {currentItems.map((item) => (
                  <Card key={item.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/${tab}/${item.id}`}
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {item.name}
                            </Link>
                            {item.category && (
                              <Badge variant="secondary" className="text-[10px]">
                                {item.category}
                              </Badge>
                            )}
                          </div>
                          {item.address && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {item.address}
                            </p>
                          )}
                          {item.phone && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {item.phone}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {item.phone && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                              <a href={`tel:${item.phone}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {item.lat > 0 && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                              <a
                                href={`nmap://route/public?dlat=${item.lat}&dlng=${item.lng}&dname=${encodeURIComponent(item.name)}`}
                                target="_blank"
                              >
                                <MapPin className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => handleRemove(tab, item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2026 편하루. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
