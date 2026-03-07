"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/auth/login-modal";
import { FoodFavorite } from "@/types/food";

export default function FoodFavoritesPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<FoodFavorite[]>([]);

  const loadFavorites = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/food/favorites");
      const data = await response.json();

      if (data.success) {
        setFavorites(data.favorites);
      }
    } catch (error) {
      console.error("즐겨찾기 로드 실패:", error);
    }
  }, []);

  const checkAuth = useCallback(async (): Promise<void> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setIsLoggedIn(true);
      await loadFavorites();
    } else {
      setIsLoggedIn(false);
    }
    setIsLoading(false);
  }, [loadFavorites]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const removeFavorite = async (foodCode: string) => {
    try {
      const response = await fetch(`/api/food/favorites?code=${foodCode}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFavorites((prev) => prev.filter((f) => f.foodCode !== foodCode));
      }
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <Star className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">로그인이 필요합니다</h1>
          <p className="mb-6 text-center text-muted-foreground">
            즐겨찾기를 사용하려면 로그인해 주세요.
          </p>
          <Button onClick={() => setLoginModalOpen(true)}>로그인하기</Button>
        </main>
        <LoginModal
          open={loginModalOpen}
          onOpenChange={setLoginModalOpen}
          onSuccess={() => {
            setIsLoggedIn(true);
            loadFavorites();
          }}
        />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6">
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <Star className="h-6 w-6 text-yellow-500" />
                식품 즐겨찾기
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {favorites.length}개의 식품
              </p>
            </div>

            {favorites.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Star className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    아직 즐겨찾기한 식품이 없습니다
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/food")}
                  >
                    식품 확인하러 가기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
              >
                {favorites.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => router.push(`/food/result/${item.foodCode}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              item.isSafe
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {item.isSafe ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <AlertCircle className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-medium">{item.foodName}</h3>
                            {item.manufacturer && (
                              <p className="truncate text-sm text-muted-foreground">
                                {item.manufacturer}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  item.isSafe
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {item.isSafe ? "안전" : "주의"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(item.foodCode);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
