"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ShoppingCart, Home, Share2 } from "lucide-react";

export default function ScanSummaryPage() {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("scan_summary");
    if (saved) {
      setResults(JSON.parse(saved));
    }
  }, []);

  const safeCount = results.filter((r) => r.isSafe).length;
  const dangerCount = results.length - safeCount;
  const safePercentage =
    results.length > 0 ? Math.round((safeCount / results.length) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 p-4">
        <div className="mx-auto max-w-2xl">
          {/* 헤더 */}
          <div className="mb-6 text-center">
            <ShoppingCart className="mx-auto mb-3 h-16 w-16 text-primary" />
            <h1 className="mb-2 text-3xl font-bold">제품 확인!</h1>
            <p className="text-muted-foreground">
              총 {results.length}개 제품을 확인했어요
            </p>
          </div>

          {/* 요약 카드 */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* 프로그레스 바 */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">안전 비율</span>
                  <span className="text-2xl font-bold text-green-600">
                    {safePercentage}%
                  </span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                    style={{ width: `${safePercentage}%` }}
                  />
                </div>
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
                  <p className="text-2xl font-bold text-green-900">
                    {safeCount}
                  </p>
                  <p className="text-sm text-green-700">안전</p>
                </div>
                <div className="rounded-lg bg-red-50 p-4 text-center">
                  <XCircle className="mx-auto mb-2 h-8 w-8 text-red-600" />
                  <p className="text-2xl font-bold text-red-900">
                    {dangerCount}
                  </p>
                  <p className="text-sm text-red-700">위험</p>
                </div>
              </div>

              {/* 격려 메시지 */}
              {safePercentage >= 80 && (
                <div className="mt-4 rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-sm font-medium text-green-900">
                    🎉 훌륭해요! 안전한 식품을 잘 선택하셨습니다
                  </p>
                </div>
              )}
              {safePercentage >= 50 && safePercentage < 80 && (
                <div className="mt-4 rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-sm font-medium text-blue-900">
                    💪 좋은 선택이에요! 조금만 더 주의하세요
                  </p>
                </div>
              )}
              {safePercentage < 50 && (
                <div className="mt-4 rounded-lg bg-orange-50 p-3 text-center">
                  <p className="text-sm font-medium text-orange-900">
                    ⚠️ 위험한 제품이 많네요. 더 신중하게 선택하세요
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 스캔 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>스캔 내역</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                  onClick={() => router.push(`/food/result/${result.foodCode}`)}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      result.isSafe
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {result.isSafe ? "✓" : "✕"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{result.foodName}</p>
                    {result.manufacturer && (
                      <p className="truncate text-sm text-muted-foreground">
                        {result.manufacturer}
                      </p>
                    )}
                    {!result.isSafe && result.detectedAllergens && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {result.detectedAllergens.map(
                          (allergen: string, i: number) => (
                            <Badge
                              key={i}
                              variant="destructive"
                              className="text-xs"
                            >
                              {allergen}
                            </Badge>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="mt-6 space-y-3">
            <Button
              onClick={() => {
                localStorage.removeItem("scan_summary");
                router.push("/food/camera");
              }}
              className="w-full"
              variant="default"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              다시 스캔
            </Button>
            <Button
              onClick={() => router.push("/")}
              className="w-full"
              variant="outline"
              size="lg"
            >
              <Home className="mr-2 h-5 w-5" />
              홈으로
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
