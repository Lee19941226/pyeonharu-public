"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Heart,
  Shirt,
  History,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState({
    weather: true,
    outfit: false,
  })

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser({
          email: user.email || "",
          name: user.user_metadata?.name || "사용자",
        })
      }
      setIsLoading(false)
    }
    
    checkUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <User className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">로그인이 필요합니다</h1>
          <p className="mb-6 text-center text-muted-foreground">
            마이페이지를 이용하려면 로그인해주세요
          </p>
          <Button asChild>
            <Link href="/login">로그인하기</Link>
          </Button>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">내 활동</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Link
                  href="/bookmarks"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                    <span>즐겨찾기</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link
                  href="/closet"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <Shirt className="h-5 w-5 text-muted-foreground" />
                    <span>내 옷장</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link
                  href="/history"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <span>코디 기록</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            {/* Profile Edit */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">프로필 수정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" defaultValue={user.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" value={user.email} disabled className="pl-10" />
                  </div>
                </div>
                <Button className="w-full">저장하기</Button>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5" />
                  알림 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">날씨 알림</p>
                    <p className="text-sm text-muted-foreground">
                      매일 아침 오늘의 날씨를 알려드려요
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weather}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weather: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">코디 추천 알림</p>
                    <p className="text-sm text-muted-foreground">
                      매일 아침 추천 코디를 알려드려요
                    </p>
                  </div>
                  <Switch
                    checked={notifications.outfit}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, outfit: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  계정 관리
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  비밀번호 변경
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive bg-transparent"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
