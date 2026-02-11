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
  ShieldCheck,
  GraduationCap,
  Loader2,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
  const [notifications, setNotifications] = useState({ weather: true });
  const [error, setError] = useState<string | null>(null);

  // 프로필 수정용
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
          const name = authUser.user_metadata?.name || "사용자";
          setUser({ email: authUser.email || "", name });
          setEditName(name);
        }
      } catch (err) {
        setError("사용자 정보를 불러올 수 없습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  // 프로필 저장 (auth + profiles.nickname 동기화)
  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("이름을 입력해주세요");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => prev ? { ...prev, name: editName.trim() } : null);
        toast.success("프로필이 저장되었습니다");
      } else {
        toast.error(data.error || "저장 실패");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

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
        toast.error(data.message || "회원 탈퇴에 실패했습니다.");
      }
    } catch {
      toast.error("회원 탈퇴 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
        <MobileNav />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">{error || "로그인이 필요합니다."}</p>
          <Button onClick={() => router.push("/login")}>로그인</Button>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-lg space-y-4">

            {/* Profile Header */}
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Activity Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">내 활동</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-4 pt-0">
                <Link href="/bookmarks" className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                    <span>즐겨찾기</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link href="/food/profile" className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <span>내 알레르기 정보</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link href="/school" className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <span>학교 급식 관리</span>
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
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="이름을 입력하세요"
                  />
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
                  <p className="text-xs text-muted-foreground">이메일은 변경할 수 없습니다.</p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={isSaving || editName.trim() === user.name}
                >
                  {isSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</>
                  ) : editName.trim() === user.name ? (
                    <><Check className="mr-2 h-4 w-4" /> 저장됨</>
                  ) : (
                    "저장하기"
                  )}
                </Button>
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
                    <p className="text-xs text-muted-foreground">매일 아침 오늘의 날씨를 알려드려요</p>
                  </div>
                  <Switch
                    checked={notifications.weather}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, weather: checked })}
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
                <Button variant="outline" className="w-full justify-start" disabled={isLogoutLoading}>
                  비밀번호 변경
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleLogout}
                  disabled={isLogoutLoading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLogoutLoading ? "로그아웃 중..." : "로그아웃"}
                </Button>
                <Separator />
                {!showDeleteConfirm ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    회원 탈퇴
                  </Button>
                ) : (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
                    <p className="text-sm text-destructive font-medium">
                      정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="flex-1" onClick={handleDeleteAccount} disabled={isDeleting}>
                        {isDeleting ? "처리 중..." : "탈퇴하기"}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => setShowDeleteConfirm(false)}>
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tip */}
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium mb-2">💡 팁</p>
              <p className="text-xs leading-relaxed">
                개인정보 보호를 위해 비밀번호는 정기적으로 변경하시고, 중요한 정보는 주기적으로 백업해주세요.
              </p>
            </div>

          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
