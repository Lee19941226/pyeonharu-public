"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginModal } from "@/components/auth/login-modal";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Building2,
  Cross,
  Bookmark,
  Heart,
  Trash2,
  Utensils,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface HospitalBookmark {
  id: string;
  name: string;
  address: string;
  phone: string;
  category: string;
  bookmarkId: string;
  createdAt: string;
}

interface PharmacyBookmark {
  id: string;
  name: string;
  address: string;
  phone: string;
  bookmarkId: string;
  createdAt: string;
}

interface FoodBookmark {
  id: string;
  food_code: string;
  food_name: string;
  manufacturer: string;
  is_safe: boolean;
  created_at: string;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [tab, setTab] = useState<"hospital" | "pharmacy" | "food">("hospital");
  const [hospitals, setHospitals] = useState<HospitalBookmark[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyBookmark[]>([]);
  const [foods, setFoods] = useState<FoodBookmark[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    setIsLoading(false);
    if (user) {
      loadBookmarks();
    }
  };

  const loadBookmarks = async () => {
    setBookmarkLoading(true);
    try {
      const [bookmarkRes, foodRes] = await Promise.all([
        fetch("/api/bookmarks"),
        fetch("/api/food/favorites"),
      ]);

      if (bookmarkRes.ok) {
        const data = await bookmarkRes.json();
        setHospitals(data.hospitals || []);
        setPharmacies(data.pharmacies || []);
      }

      if (foodRes.ok) {
        const foodData = await foodRes.json();
        setFoods(foodData.favorites || []);
      }
    } catch (error) {
      console.error("❌ 즐겨찾기 로드 실패:", error);
    } finally {
      setBookmarkLoading(false);
    }
  };

  // ✅ 삭제 함수 수정
  const handleRemove = async (
    type: "hospital" | "pharmacy" | "food",
    itemId: string,
  ) => {
    console.log(`🗑️ 삭제 요청: type=${type}, id=${itemId}`);

    try {
      if (type === "food") {
        const res = await fetch(`/api/food/favorites?code=${itemId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setFoods((prev) => prev.filter((f) => f.food_code !== itemId));
          console.log("✅ 음식 삭제 성공");
        } else {
          const error = await res.json();
          console.error("❌ 삭제 실패:", error);
        }
      } else {
        const res = await fetch(`/api/bookmarks?type=${type}&id=${itemId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          if (type === "hospital") {
            setHospitals((prev) =>
              prev.filter((h) => h.id !== itemId),
            );
          } else {
            setPharmacies((prev) =>
              prev.filter((p) => p.id !== itemId),
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ 삭제 중 오류:", error);
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-20 md:pb-0">
          <div className="container mx-auto px-4 py-6">
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="mb-4 flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  // 비로그인
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <Bookmark className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">로그인이 필요합니다</h1>
          <p className="mb-6 text-center text-muted-foreground">
            즐겨찾기를 이용하려면 로그인해주세요
          </p>
          <Button onClick={() => setLoginModalOpen(true)}>로그인하기</Button>
        </main>
        <LoginModal
          open={loginModalOpen}
          onOpenChange={setLoginModalOpen}
          onSuccess={() => router.refresh()}
        />
        <MobileNav />
      </div>
    );
  }

  // 현재 탭 아이템
  const currentItems =
    tab === "hospital" ? hospitals : tab === "pharmacy" ? pharmacies : foods;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            {/* 헤더 */}
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold">즐겨찾기</h1>
              <Link
                href="/mypage"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                마이페이지
              </Link>
            </div>

            {/* 3개 탭 */}
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
              <Button
                variant={tab === "food" ? "default" : "outline"}
                onClick={() => setTab("food")}
                className="flex-1"
              >
                <Utensils className="mr-2 h-4 w-4" />
                음식 ({foods.length})
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
                  즐겨찾기한{" "}
                  {tab === "hospital"
                    ? "병원"
                    : tab === "pharmacy"
                      ? "약국"
                      : "음식"}
                  이 없습니다
                </p>
                <p className="mb-6 text-sm text-muted-foreground">
                  {tab === "food"
                    ? "식품 검색 후 하트 버튼을 눌러 추가하세요"
                    : "병원/약국 상세 페이지에서 ♡ 버튼을 눌러 추가하세요"}
                </p>
                <Button asChild>
                  <Link href={tab === "food" ? "/food/search" : "/search"}>
                    {tab === "food" ? "식품 검색" : "병원/약국 찾기"}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* ✅ 병원 목록 */}
                {tab === "hospital" &&
                  (currentItems as HospitalBookmark[]).map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold">
                              {item.name}
                            </h3>
                            {item.address && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.address}
                              </p>
                            )}
                            {item.phone && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.phone}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemove("hospital", item.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {/* ✅ 약국 목록 */}
                {tab === "pharmacy" &&
                  (currentItems as PharmacyBookmark[]).map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold">
                              {item.name}
                            </h3>
                            {item.address && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.address}
                              </p>
                            )}
                            {item.phone && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.phone}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemove("pharmacy", item.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {/* ✅ 음식 목록 - food_code 사용 */}
                {tab === "food" &&
                  (currentItems as FoodBookmark[]).map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/food/result/${item.food_code}`)
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                item.is_safe
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.is_safe ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                <AlertCircle className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold truncate">
                                {item.food_name}
                              </h3>
                              {item.manufacturer && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {item.manufacturer}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    item.is_safe
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {item.is_safe ? "안전" : "주의"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString(
                                    "ko-KR",
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ✅ 삭제 버튼 - food_code 사용 */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove("food", item.food_code);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
