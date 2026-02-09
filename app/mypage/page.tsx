"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Heart,
  Trash2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  email: string;
  name: string;
}

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notifications, setNotifications] = useState({
    weather: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          setError("사용자 정보를 불러올 수 없습니다.");
          setIsLoading(false);
          return;
        }

        if (authUser) {
          setUser({
            email: authUser.email || "",
            name: authUser.user_metadata?.name || "사용자",
          });
        }
      } catch (err) {
        setError("사용자 정보를 불러올 수 없습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleLogout = async () => {
    setIsLogoutLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError("로그아웃 중 오류가 발생했습니다.");
        setIsLogoutLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("로그아웃 중 오류가 발생했습니다.");
      setIsLogoutLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      } else {
        alert(data.message || "회원 탈퇴에 실패했습니다.");
      }
    } catch {
      alert("회원 탈퇴 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center pb-16 md:pb-0">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 text-center pb-16 md:pb-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-xl font-bold">로그인이 필요합니다</h1>
          <p className="mb-6 text-center text-muted-foreground max-w-sm">
            마이페이지를 이용하려면 로그인해주세요
          </p>
          <Button asChild>
            <Link href="/login">로그인하기</Link>
          </Button>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20 flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive text-sm">
                    오류 발생
                  </p>
                  <p className="text-destructive/80 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{user.name}</CardTitle>
                    <CardDescription className="truncate">
                      {user.email}
                    </CardDescription>
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
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">즐겨찾기</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </Link>
                <Link
                  href="/food/profile"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">내 알레르기 정보</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    이메일은 변경할 수 없습니다.
                  </p>
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
                  <div className="flex-1">
                    <p className="font-medium text-sm">날씨 알림</p>
                    <p className="text-xs text-muted-foreground">
                      매일 아침 오늘의 날씨를 알려드려요
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weather}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weather: checked })
                    }
                    aria-label="날씨 알림"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  계정 관리
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={isLogoutLoading}
                >
                  비밀번호 변경
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleLogout}
                  disabled={isLogoutLoading}
                >
                  <LogOut className="mr-2 h-4 w-4 flex-shrink-0" />
                  {isLogoutLoading ? "로그아웃 중..." : "로그아웃"}
                </Button>
                <Separator />
                {!showDeleteConfirm ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4 flex-shrink-0" />
                    회원 탈퇴
                  </Button>
                ) : (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
                    <p className="text-sm text-destructive font-medium">
                      정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수
                      없습니다.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "처리 중..." : "탈퇴하기"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium mb-2">💡 팁</p>
              <p className="text-xs leading-relaxed">
                개인정보 보호를 위해 비밀번호는 정기적으로 변경하시고, 중요한
                정보는 주기적으로 백업해주세요.
              </p>
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
