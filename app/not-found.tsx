"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          {/* 404 아이콘 */}
          <div className="mb-4 text-center">
            <div className="mb-4 text-6xl font-bold text-primary">404</div>
            <div className="mx-auto mb-4 text-4xl">🔍</div>
          </div>

          {/* 메시지 */}
          <h1 className="mb-2 text-center text-xl font-bold">
            페이지를 찾을 수 없습니다
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>

          {/* 액션 버튼 */}
          <div className="space-y-3">
            <Link href="/" className="block">
              <Button className="w-full" variant="default">
                <Home className="mr-2 h-4 w-4" />
                홈으로 이동
              </Button>
            </Link>

            <Link href="/" className="block">
              <Button className="w-full" variant="outline">
                <Search className="mr-2 h-4 w-4" />
                식품 검색
              </Button>
            </Link>

            <Button
              onClick={() => window.history.back()}
              className="w-full"
              variant="ghost"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              이전 페이지
            </Button>
          </div>

          {/* 안내 문구 */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            찾으시는 페이지가 있다면 검색을 이용해보세요
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
