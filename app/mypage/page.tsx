"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  BarChart3,
  Activity,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  email: string;
  name: string;
}

// ─── 기초대사량 설정 컴포넌트 ───
function BmrSection() {
  const [bmrData, setBmrData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "direct" | "calculate">("view");
  const [directBmr, setDirectBmr] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/diet/bmr")
      .then((r) => r.json())
      .then((d) => {
        setBmrData(d);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const saveDirect = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/diet/bmr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "direct", bmr: parseInt(directBmr) }),
      });
      const data = await res.json();
      if (data.success) {
        setBmrData({ ...bmrData, bmr: data.bmr, isSet: true });
        setMode("view");
        toast.success(`기초대사량 ${data.bmr}kcal 설정 완료!`);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const saveCalculate = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/diet/bmr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "calculate",
          height: parseFloat(height),
          weight: parseFloat(weight),
          age: parseInt(age),
          gender,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBmrData({
          ...bmrData,
          bmr: data.bmr,
          isSet: true,
          height: parseFloat(height),
          weight: parseFloat(weight),
          age: parseInt(age),
          gender,
        });
        setMode("view");
        toast.success(`기초대사량 ${data.bmr}kcal 설정 완료!`);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("계산에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-3">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  // ── 보기 모드 ──
  if (mode === "view") {
    return (
      <div className="p-3 space-y-2">
        {bmrData?.isSet ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                기초대사량:{" "}
                <strong className="text-primary">
                  {bmrData.bmr.toLocaleString()} kcal
                </strong>
              </p>
              {bmrData.height && (
                <p className="text-xs text-muted-foreground">
                  {bmrData.gender === "male" ? "남" : "여"} · {bmrData.height}cm
                  · {bmrData.weight}kg · {bmrData.age}세
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode("direct")}
            >
              수정
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              기초대사량을 설정해주세요
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode("direct")}
              >
                ✏️ 직접 입력
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode("calculate")}
              >
                🤖 AI 계산
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 직접 입력 모드 ──
  if (mode === "direct") {
    return (
      <div className="p-3 space-y-3">
        <p className="text-sm font-medium">기초대사량 직접 입력</p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="예: 1500"
            value={directBmr}
            onChange={(e) => setDirectBmr(e.target.value)}
          />
          <span className="text-sm text-muted-foreground self-center">
            kcal
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode("view")}>
            취소
          </Button>
          <Button
            size="sm"
            onClick={saveDirect}
            disabled={!directBmr || isSaving}
          >
            {isSaving ? "저장중..." : "설정 완료"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMode("calculate")}
          >
            AI 계산으로
          </Button>
        </div>
      </div>
    );
  }

  // ── AI 계산 모드 ──
  return (
    <div className="p-3 space-y-3">
      <p className="text-sm font-medium">AI 자동 계산 (해리스-베네딕트)</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">성별</label>
          <select
            className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">나이</label>
          <Input
            type="number"
            placeholder="25"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">키 (cm)</label>
          <Input
            type="number"
            placeholder="170"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">몸무게 (kg)</label>
          <Input
            type="number"
            placeholder="65"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setMode("view")}>
          취소
        </Button>
        <Button
          size="sm"
          onClick={saveCalculate}
          disabled={!height || !weight || !age || isSaving}
        >
          {isSaving ? "계산중..." : "계산하기"}
        </Button>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───
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
        setUser((prev) => (prev ? { ...prev, name: editName.trim() } : null));
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
          <p className="text-sm text-muted-foreground">
            {error || "로그인이 필요합니다."}
          </p>
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

            {/* ★ 신체정보 / 기초대사량 (NEW) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  신체정보 / 기초대사량
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-4 pt-0">
                <BmrSection />
                <Link
                  href="/diet"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                    <span>식단관리</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            {/* Activity Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">내 활동</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-4 pt-0">
                <Link
                  href="/reports"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <span>주간 안전 리포트</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link
                  href="/bookmarks"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                    <span>즐겨찾기</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link
                  href="/food/profile"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <span>내 알레르기 정보</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link
                  href="/family"
                  className="flex items-center justify-between rounded-xl border bg-card p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">가족 프로필</p>
                      <p className="text-xs text-muted-foreground">
                        가족 알레르기 관리
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/school"
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted transition-colors"
                >
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
                  <p className="text-xs text-muted-foreground">
                    이메일은 변경할 수 없습니다.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={isSaving || editName.trim() === user.name}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장
                      중...
                    </>
                  ) : editName.trim() === user.name ? (
                    <>
                      <Check className="mr-2 h-4 w-4" /> 저장됨
                    </>
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

            {/* Tip */}
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
