"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginModal } from "@/components/auth/login-modal";
import {
  Building2,
  Cross,
  ChevronLeft,
  Heart,
  Bookmark,
  MapPin,
  Phone,
  Trash2,
  Utensils, // ✅ 음식 아이콘 추가
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HospitalBookmark {
  id: string;
  name: string;
  address: string;
  phone: string;
  category: string;
  lat: number;
  lng: number;
  created_at: string;
}

interface PharmacyBookmark {
  id: string;
  name: string;
  address: string;
  phone: string;
  category: string;
  lat: number;
  lng: number;
  created_at: string;
}

// ✅ 음식 즐겨찾기 인터페이스 추가
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
  const [bookmarkLoading, setBookmarkLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // ✅ 탭 state 수정 - food 추가
  const [tab, setTab] = useState<"hospital" | "pharmacy" | "food">("hospital");

  const [hospitals, setHospitals] = useState<HospitalBookmark[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyBookmark[]>([]);
  const [foods, setFoods] = useState<FoodBookmark[]>([]); // ✅ 음식 state 추가

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
      // ✅ 병원/약국/음식 모두 로드
      const [hospitalRes, pharmacyRes, foodRes] = await Promise.all([
        fetch("/api/bookmarks?type=hospital"),
        fetch("/api/bookmarks?type=pharmacy"),
        fetch("/api/food/favorites"), // ✅ 음식 API 추가
      ]);

      if (hospitalRes.ok) {
        const hospitalData = await hospitalRes.json();
        setHospitals(hospitalData.bookmarks || []);
      }

      if (pharmacyRes.ok) {
        const pharmacyData = await pharmacyRes.json();
        setPharmacies(pharmacyData.bookmarks || []);
      }

      // ✅ 음식 즐겨찾기 로드
      if (foodRes.ok) {
        const foodData = await foodRes.json();
        setFoods(foodData.favorites || []);
      }
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleRemove = async (
    type: "hospital" | "pharmacy" | "food",
    itemId: string,
  ) => {
    if (type === "food") {
      // ✅ 음식 삭제
      const res = await fetch(`/api/food/favorites?code=${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFoods((prev) => prev.filter((f) => f.food_code !== itemId));
      }
    } else {
      // 병원/약국 삭제
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
    }
  };

  // 로딩 중...
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </main>
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

  // ✅ 현재 탭 아이템
  const currentItems =
    tab === "hospital" ? hospitals : tab === "pharmacy" ? pharmacies : foods;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            {/* ✅ 헤더 */}
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold">즐겨찾기</h1>
              <Link
                href="/mypage"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                마이페이지
              </Link>
            </div>

            {/* ✅ 3개 탭 */}
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
              {/* ✅ 음식 탭 추가 */}
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
                  <Link href={tab === "food" ? "/food" : "/search"}>
                    {tab === "food" ? "식품 검색" : "검색하러 가기"}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* ✅ 병원/약국 목록 */}
                {tab !== "food" &&
                  currentItems.map((item: any) => (
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemove(tab, item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {/* ✅ 음식 목록 */}
                {tab === "food" &&
                  foods.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() =>
                        router.push(`/food/result/${item.food_code}`)
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* 안전 여부 아이콘 */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              item.is_safe
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {item.is_safe ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <AlertCircle className="h-5 w-5" />
                            )}
                          </div>

                          {/* 제품 정보 */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {item.food_name}
                            </h3>
                            {item.manufacturer && (
                              <p className="text-sm text-muted-foreground truncate">
                                {item.manufacturer}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
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

                          {/* 삭제 버튼 */}
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
