"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // 에러 로깅 (Sentry 등)
    console.error("💥 전역 에러:", error);

    // TODO: Sentry 연동 시 추가
    // Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              {/* 아이콘 */}
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>

              {/* 메시지 */}
              <h1 className="mb-2 text-center text-xl font-bold">
                문제가 발생했습니다
              </h1>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
              </p>

              {/* 에러 상세 (접기/펼치기) */}
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
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    홈으로
                  </Button>
                </Link>
              </div>

              {/* 안내 문구 */}
              <p className="mt-4 text-center text-xs text-muted-foreground">
                문제 발생 시 고객센터로 문의해주세요
              </p>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
