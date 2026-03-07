"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { HistoryItem } from "@/types/food";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // localStorage에서 히스토리 불러오기
  function loadHistory() {
    const saved = localStorage.getItem("food_check_history");
    if (saved) {
      const parsed = JSON.parse(saved);
      const sorted = parsed.sort(
        (a: HistoryItem, b: HistoryItem) =>
          new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime(),
      );
      setHistory(sorted);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const clearAllHistory = () => {
    if (confirm("모든 확인 기록을 삭제하시겠습니까?")) {
      localStorage.removeItem("food_check_history");
      setHistory([]);
    }
  };

  const removeItem = (foodCode: string) => {
    const updated = history.filter((item) => item.foodCode !== foodCode);
    setHistory(updated);
    localStorage.setItem("food_check_history", JSON.stringify(updated));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  <Clock className="h-6 w-6" />
                  최근 확인한 식품
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {history.length}개의 식품 확인 기록
                </p>
              </div>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllHistory}
                  className="text-muted-foreground"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  전체 삭제
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    아직 확인한 식품이 없습니다
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
                {history.map((item) => (
                  <motion.div
                    key={item.foodCode}
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
                            {item.isSafe ? "✅" : "⚠️"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-medium">{item.foodName}</h3>
                            {item.manufacturer && (
                              <p className="truncate text-sm text-muted-foreground">
                                {item.manufacturer}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(item.checkedAt)}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.foodCode);
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
