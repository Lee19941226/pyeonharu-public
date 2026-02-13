"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Home,
  RefreshCw,
  ChevronDown,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";

export default function SymptomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("💥 증상 분석 에러:", error);
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
              <div className="rounded-full bg-red-100 p-3">
                <Stethoscope className="h-8 w-8 text-red-600" />
              </div>
            </div>

            {/* 메시지 */}
            <h1 className="mb-2 text-center text-xl font-bold">
              증상 분석 중 오류가 발생했습니다
            </h1>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              AI 분석 서비스에 일시적인 문제가 발생했습니다.
            </p>

            {/* 중요 안내 */}
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    응급 상황이라면
                  </p>
                  <p className="mt-1 text-xs text-red-800">
                    즉시 119에 연락하거나 가까운 응급실을 방문하세요
                  </p>
                </div>
              </div>
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
            <div className="space-y-3">
              <Button onClick={reset} className="w-full" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 시도
              </Button>

              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  홈으로
                </Button>
              </Link>

              <Link href="/hospital" className="block">
                <Button variant="ghost" className="w-full text-blue-600">
                  🏥 근처 병원 찾기
                </Button>
              </Link>
            </div>

            {/* 안내 문구 */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              문제가 계속되면 잠시 후 다시 시도해주세요
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
