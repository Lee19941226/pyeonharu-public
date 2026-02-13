"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Home,
  RefreshCw,
  ChevronDown,
  Package,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";

export default function FoodError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("💥 식품 페이지 에러:", error);
    // TODO: Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            {/* 아이콘 */}
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-orange-100 p-3">
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            {/* 메시지 */}
            <h1 className="mb-2 text-center text-xl font-bold">
              식품 정보를 불러올 수 없습니다
            </h1>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              일시적인 오류로 식품 정보를 가져오지 못했습니다.
            </p>

            {/* 가능한 원인 */}
            <div className="mb-4 rounded-lg border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium">가능한 원인:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• 네트워크 연결 문제</li>
                <li>• 식약처 API 일시 중단</li>
                <li>• 잘못된 바코드 번호</li>
                <li>• 서버 일시 오류</li>
              </ul>
            </div>

            {/* 에러 상세 */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mb-4 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <span>상세 정보</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
              />
            </button>

            {showDetails && (
              <div className="mb-4 rounded-lg bg-muted p-3">
                <p className="text-xs font-mono text-muted-foreground">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <Button onClick={reset} className="flex-1" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 시도
              </Button>
              <Link href="/food" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  검색으로
                </Button>
              </Link>
            </div>

            {/* 대안 제시 */}
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-900">
                💡 <strong>다른 방법:</strong> 바코드를 다시 스캔하거나
                제품명으로 검색해보세요
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
