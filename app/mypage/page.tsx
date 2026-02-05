"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  LogOut,
  Heart,
  Building2,
  Phone,
  MapPin,
  Trash2,
  ChevronRight,
  Shield,
  Cross,
  ExternalLink,
  Bookmark,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LoginModal } from "@/components/auth/login-modal";

interface BookmarkItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  category?: string;
  lat: number;
  lng: number;
  bookmarkId: string;
  createdAt: string;
}
interface FoodFavorite {
  id: string;
  food_code: string;
  food_name: string;
  manufacturer: string;
  is_safe: boolean;
  created_at: string;
}
export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // 프로필
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // 즐겨찾기
  const [bookmarkTab, setBookmarkTab] = useState<
    "hospital" | "pharmacy" | "food"
  >("hospital");
  const [foodFavorites, setFoodFavorites] = useState<FoodFavorite[]>([]);
  const [hospitals, setHospitals] = useState<BookmarkItem[]>([]);
  const [pharmacies, setPharmacies] = useState<BookmarkItem[]>([]);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // 프로필 로드
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", user.id)
          .maybeSingle();

        setNickname(profile?.nickname || user.user_metadata?.name || "");

        // 즐겨찾기 로드
        fetchBookmarks();
      }
      setIsLoading(false);
    };
    init();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchBookmarks();
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchBookmarks = async () => {
    setBookmarkLoading(true);
    try {
      const [hospitalRes, foodRes] = await Promise.all([
        fetch("/api/bookmarks"),
        fetch("/api/food/favorites"),
      ]);

      const hospitalData = await hospitalRes.json();
      const foodData = await foodRes.json();

      if (hospitalData.success) {
        setHospitals(hospitalData.hospitals || []);
        setPharmacies(hospitalData.pharmacies || []);
      }

      if (foodData.success) {
        setFoodFavorites(foodData.favorites || []);
      }
    } catch (e) {
      console.error("Failed to fetch bookmarks:", e);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg("");
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, nickname, updated_at: new Date().toISOString() });

    setSaving(false);
    setSaveMsg(error ? "저장 실패" : "저장되었습니다!");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const handleRemoveBookmark = async (
    type: "hospital" | "pharmacy",
    itemId: string,
  ) => {
    const res = await fetch(`/api/bookmarks?type=${type}&id=${itemId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (type === "hospital") {
        setHospitals((prev) => prev.filter((h) => h.id !== itemId));
      } else {
        setPharmacies((prev) => prev.filter((p) => p.id !== itemId));
      }
    }
  };
  const handleRemoveFoodFavorite = async (foodCode: string) => {
    const res = await fetch(`/api/food/favorites?code=${foodCode}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setFoodFavorites((prev) => prev.filter((f) => f.food_code !== foodCode));
    }
  };
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  // 로딩 중
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
          <div className="space-y-4 text-center">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-6 w-32" />
          </div>
        </main>
      </div>
    );
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
          <User className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">로그인이 필요합니다</h1>
          <p className="mb-6 text-center text-muted-foreground">
            마이페이지를 이용하려면 로그인해주세요
          </p>
          <Button onClick={() => setLoginModalOpen(true)}>로그인하기</Button>
        </main>
        <LoginModal
          open={loginModalOpen}
          onOpenChange={setLoginModalOpen}
          onSuccess={() => router.refresh()}
        />
      </div>
    );
  }

  const currentBookmarks =
    bookmarkTab === "hospital"
      ? hospitals
      : bookmarkTab === "pharmacy"
        ? pharmacies
        : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="font-bold text-primary-foreground">편</span>
            </div>
            <span className="font-bold">편하루</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {user.email?.split("@")[0]}
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto space-y-4 px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {/* 프로필 카드 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {nickname || "사용자"}
                    </CardTitle>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 border-t pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="닉네임 입력"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    size="default"
                  >
                    {saving ? "저장 중..." : "저장"}
                  </Button>
                </div>
                {saveMsg && (
                  <p
                    className={`text-xs ${saveMsg.includes("실패") ? "text-destructive" : "text-emerald-600"}`}
                  >
                    {saveMsg}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 즐겨찾기 카드 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bookmark className="h-5 w-5" />
                    즐겨찾기
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant={
                        bookmarkTab === "hospital" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setBookmarkTab("hospital")}
                    >
                      <Building2 className="mr-1 h-3.5 w-3.5" />
                      병원 ({hospitals.length})
                    </Button>
                    <Button
                      variant={
                        bookmarkTab === "pharmacy" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setBookmarkTab("pharmacy")}
                    >
                      <Cross className="mr-1 h-3.5 w-3.5" />
                      약국 ({pharmacies.length})
                    </Button>
                    <Button
                      variant={bookmarkTab === "food" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBookmarkTab("food")}
                    >
                      <Heart className="mr-1 h-3.5 w-3.5" />
                      음식 ({foodFavorites.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {bookmarkLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : bookmarkTab === "food" ? (
                  // ✅ 음식 탭 전용 렌더링
                  foodFavorites.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Heart className="mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">
                        즐겨찾기한 음식이 없습니다
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        제품 상세 페이지에서 ★ 버튼을 눌러 추가하세요
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        asChild
                      >
                        <Link href="/food">검색하러 가기</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {foodFavorites.map((item) => (
                        <div
                          key={item.id}
                          className="group rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                          onClick={() =>
                            router.push(`/food/result/${item.food_code}`)
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {item.food_name}
                                </span>
                                <Badge
                                  variant={
                                    item.is_safe ? "default" : "destructive"
                                  }
                                  className="text-[10px]"
                                >
                                  {item.is_safe ? "안전" : "주의"}
                                </Badge>
                              </div>
                              {item.manufacturer && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.manufacturer}
                                </p>
                              )}
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString(
                                  "ko-KR",
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFoodFavorite(item.food_code);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : currentBookmarks.length === 0 ? (
                  // 기존 병원/약국 빈 상태
                  <div className="flex flex-col items-center py-8 text-center">
                    <Heart className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">
                      즐겨찾기한 {bookmarkTab === "hospital" ? "병원" : "약국"}
                      이 없습니다
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      병원/약국 상세 페이지에서 ♡ 버튼을 눌러 추가하세요
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      asChild
                    >
                      <Link href="/search">검색하러 가기</Link>
                    </Button>
                  </div>
                ) : (
                  // 기존 병원/약국 목록
                  <div className="space-y-2">
                    {currentBookmarks.map((item) => (
                      <div
                        key={item.id}
                        className="group rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/${bookmarkTab}/${item.id}`}
                                className="font-medium hover:text-primary hover:underline"
                              >
                                {item.name}
                              </Link>
                              {item.category && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                asChild
                              >
                                <a href={`tel:${item.phone}`}>
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() =>
                                handleRemoveBookmark(bookmarkTab, item.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 계정 관리 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  계정 관리
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
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

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2026 편하루. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
