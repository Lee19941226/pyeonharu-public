"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trash2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface HistoryItem {
  foodCode: string;
  foodName: string;
  manufacturer?: string;
  checkedAt: string;
  isSafe: boolean;
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  // localStorage에서 히스토리 불러오기
  const loadHistory = () => {
    const saved = localStorage.getItem("food_check_history");
    if (saved) {
      const parsed = JSON.parse(saved);
      // 최신순 정렬
      const sorted = parsed.sort(
        (a: HistoryItem, b: HistoryItem) =>
          new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime(),
      );
      setHistory(sorted);
    }
  };

  // 전체 삭제
  const clearAllHistory = () => {
    if (confirm("모든 확인 기록을 삭제하시겠습니까?")) {
      localStorage.removeItem("food_check_history");
      setHistory([]);
    }
  };

  // 개별 삭제
  const removeItem = (foodCode: string) => {
    const updated = history.filter((item) => item.foodCode !== foodCode);
    setHistory(updated);
    localStorage.setItem("food_check_history", JSON.stringify(updated));
  };

  // 날짜 포맷팅
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

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            {/* 헤더 */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  <Clock className="h-6 w-6" />
                  최근 확인한 제품
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {history.length}개의 제품 확인 기록
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

            {/* 히스토리 목록 */}
            {history.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    아직 확인한 제품이 없습니다
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/food")}
                  >
                    제품 확인하러 가기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <Card
                    key={item.foodCode}
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => router.push(`/food/result/${item.foodCode}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* 안전 여부 아이콘 */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            item.isSafe
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {item.isSafe ? "✓" : "✕"}
                        </div>

                        {/* 제품 정보 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {item.foodName}
                          </h3>
                          {item.manufacturer && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.manufacturer}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(item.checkedAt)}
                          </p>
                        </div>

                        {/* 삭제 버튼 */}
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
