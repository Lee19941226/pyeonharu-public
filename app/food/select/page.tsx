"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, AlertCircle, ArrowRight } from "lucide-react";
import { Candidate } from "@/types/food";

function SelectProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [method, setMethod] = useState("");

  useEffect(() => {
    try {
      const candidatesStr = searchParams.get("candidates");
      const ingredientsStr = searchParams.get("ingredients");
      const methodStr = searchParams.get("method");

      if (candidatesStr) {
        setCandidates(JSON.parse(decodeURIComponent(candidatesStr)));
      }
      if (ingredientsStr) {
        setIngredients(JSON.parse(decodeURIComponent(ingredientsStr)));
      }
      if (methodStr) {
        setMethod(methodStr);
      }
    } catch (error) {
      console.error("데이터 파싱 에러:", error);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">제품 선택</h1>
              <p className="mt-2 text-muted-foreground">
                {method === "ingredients"
                  ? "재료로 검색된 제품들입니다"
                  : "여러 제품이 발견되었습니다"}
              </p>
            </div>
            {ingredients.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900">
                    <Search className="h-4 w-4" />
                    AI가 감지한 재료
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((ingredient, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-blue-100 text-blue-700"
                      >
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">확인이 필요합니다</p>
                  <p className="mt-1">
                    여러 제품이 검색되었습니다. 촬영한 제품과 가장 비슷한 것을
                    선택하세요.
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {candidates.length}개의 후보 제품
              </p>
              {candidates.map((candidate, idx) => (
                <Card
                  key={idx}
                  className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={() =>
                    router.push(`/food/result/${candidate.foodCode}`)
                  }
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{candidate.foodName}</p>
                      {candidate.manufacturer && (
                        <p className="text-sm text-muted-foreground">
                          {candidate.manufacturer}
                        </p>
                      )}
                      {candidate.matchedIngredient && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {candidate.matchedIngredient} 포함
                        </Badge>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
            {candidates.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-center font-medium">
                    제품을 찾을 수 없습니다
                  </p>
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    더 선명한 사진을 다시 시도해보세요
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => router.back()}
                  >
                    다시 촬영하기
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                다시 촬영
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/food/search")}
              >
                직접 검색
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SelectProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>로딩 중...</p>
        </div>
      }
    >
      <SelectProductContent />
    </Suspense>
  );
}
