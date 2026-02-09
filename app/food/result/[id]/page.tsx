"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  Share2,
  Heart,
  MapPin,
  Info,
  AlertCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getAllergenInfo } from "@/lib/allergen-info";
import type { AllergenInfo } from "@/lib/allergen-info";
import { Badge } from "@/components/ui/badge";

interface FoodResult {
  foodCode: string;
  foodName: string;
  manufacturer: string;
  weight: string;
  allergens: string[];
  allergyWarning?: string;
  crossContamination?: string[];
  crossContaminationRisks?: Array<{
    name: string;
    type: string;
    severity: string;
  }>;
  userAllergens: string[];
  detectedAllergens: Array<{
    name: string;
    amount: string;
    severity: string;
  }>;
  ingredients: string[];
  nutritionDetails?: Array<{
    name: string;
    content: string;
    unit: string;
    percentage?: string;
  }>;
  servingSize?: string;
  isSafe: boolean;
}

export default function FoodResultPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<FoodResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadFoodResult();
    checkFavorite();
  }, [params.id]);

  const loadFoodResult = async () => {
    try {
      const response = await fetch(`/api/food/result?code=${params.id}`);
      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        saveToHistory(data.result);
      } else {
        setError(data.error || "결과를 불러올 수 없습니다");
      }
    } catch (error) {
      setError("결과를 불러오는 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  // [Phase 0] SSR 가드 추가
  const saveToHistory = (result: FoodResult) => {
    if (typeof window === "undefined") return;

    const historyItem = {
      foodCode: result.foodCode,
      foodName: result.foodName,
      manufacturer: result.manufacturer,
      checkedAt: new Date().toISOString(),
      isSafe: result.isSafe,
    };

    const existing = localStorage.getItem("food_check_history");
    let history = existing ? JSON.parse(existing) : [];

    // 중복 제거 (같은 바코드는 최신 것만)
    history = history.filter((item: any) => item.foodCode !== result.foodCode);

    // 최신 항목을 앞에 추가
    history.unshift(historyItem);

    // 최대 50개까지만 저장
    if (history.length > 50) {
      history = history.slice(0, 50);
    }

    localStorage.setItem("food_check_history", JSON.stringify(history));
  };

  const checkFavorite = async () => {
    try {
      const response = await fetch(
        `/api/food/favorites/check?code=${params.id}`,
      );
      const data = await response.json();
      setIsFavorite(data.favorited);
    } catch (error) {
      // 에러 무시
    }
  };

  const toggleFavorite = async () => {
    if (!result) return;

    try {
      if (isFavorite) {
        const response = await fetch(
          `/api/food/favorites?code=${result.foodCode}`,
          {
            method: "DELETE",
          },
        );
        const data = await response.json();

        if (data.success) {
          setIsFavorite(false);
          toast.success("즐겨찾기에서 제거되었습니다");
        }
      } else {
        const response = await fetch("/api/food/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foodCode: result.foodCode,
            foodName: result.foodName,
            manufacturer: result.manufacturer,
            isSafe: result.isSafe,
          }),
        });
        const data = await response.json();

        if (data.success) {
          setIsFavorite(true);
          toast.success("즐겨찾기에 추가되었습니다");
        } else if (response.status === 409) {
          toast.error("이미 즐겨찾기에 있습니다");
        }
      }
    } catch (error) {
      toast.error("오류가 발생했습니다");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">🔍</div>
          <p className="text-lg font-medium">분석 중...</p>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4 text-4xl">😥</div>
          <p className="text-lg font-medium">
            {error || "결과를 찾을 수 없습니다"}
          </p>
          <Button className="mt-4" onClick={() => router.push("/food")}>
            다시 검색하기
          </Button>
        </div>
      </div>
    );
  }

  // 알레르기 정보 가져오기
  const allergenInfoMap: Record<string, AllergenInfo> = {};
  result.detectedAllergens.forEach((da) => {
    const info = getAllergenInfo(da.name);
    if (info) allergenInfoMap[da.name] = info;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* 안전 판정 배너 */}
            <Card
              className={
                result.isSafe
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
            >
              <CardContent className="flex items-center gap-4 p-6">
                {result.isSafe ? (
                  <CheckCircle className="h-12 w-12 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-12 w-12 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <h1 className="text-xl font-bold">
                    {result.isSafe ? "안전합니다 ✅" : "주의가 필요합니다 ⚠️"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {result.isSafe
                      ? "등록된 알레르기 성분이 검출되지 않았습니다"
                      : `${result.detectedAllergens.length}개의 알레르기 성분이 감지되었습니다`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 제품 정보 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{result.foodName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {result.manufacturer}
                    </p>
                    {result.weight && result.weight !== "정보없음" && (
                      <p className="text-sm text-muted-foreground">
                        {result.weight}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFavorite}
                    >
                      <Heart
                        className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `${result.foodName} 알레르기 확인`,
                            text: result.isSafe
                              ? "안전한 식품입니다"
                              : "알레르기 주의!",
                            url: window.location.href,
                          });
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("링크가 복사되었습니다");
                        }
                      }}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 감지된 알레르기 */}
            {result.detectedAllergens.length > 0 && (
              <Card className="border-red-200">
                <CardContent className="p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    감지된 알레르기 성분
                  </h3>
                  <div className="space-y-3">
                    {result.detectedAllergens.map((allergen, idx) => {
                      const info = allergenInfoMap[allergen.name];
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-red-100 bg-red-50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {info?.emoji || "⚠️"}
                              </span>
                              <span className="font-medium">
                                {allergen.name}
                              </span>
                            </div>
                            <Badge
                              variant={
                                allergen.severity === "high"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {allergen.severity === "high"
                                ? "심각"
                                : allergen.severity === "medium"
                                  ? "보통"
                                  : "경미"}
                            </Badge>
                          </div>
                          {info?.symptoms && (
                            <p className="mt-1 text-xs text-red-600">
                              증상: {info.symptoms.join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 교차오염 위험 */}
            {result.crossContaminationRisks &&
              result.crossContaminationRisks.length > 0 && (
                <Card className="border-amber-200">
                  <CardContent className="p-6">
                    <h3 className="mb-4 flex items-center gap-2 font-bold text-amber-700">
                      <Info className="h-5 w-5" />
                      교차오염 위험
                    </h3>
                    <div className="space-y-2">
                      {result.crossContaminationRisks.map((risk, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 p-3"
                        >
                          <span className="text-sm font-medium">
                            {risk.name}
                          </span>
                          <Badge variant="outline" className="text-amber-700">
                            교차오염
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      * 같은 제조시설에서 해당 성분을 포함한 식품을 생산합니다
                    </p>
                  </CardContent>
                </Card>
              )}

            {/* 알레르기 주의사항 */}
            {result.allergyWarning && (
              <Card className="border-amber-200">
                <CardContent className="p-6">
                  <h3 className="mb-2 flex items-center gap-2 font-bold text-amber-700">
                    <AlertCircle className="h-5 w-5" />
                    제조사 주의사항
                  </h3>
                  <p className="text-sm text-amber-800">
                    {result.allergyWarning}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 전체 알레르기 성분 */}
            {result.allergens.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-3 font-bold">포함된 알레르기 유발 성분</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.allergens.map((allergen, idx) => (
                      <Badge key={idx} variant="secondary">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 영양 정보 */}
            {result.nutritionDetails && result.nutritionDetails.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-3 font-bold">영양 정보</h3>
                  {result.servingSize && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      1회 제공량: {result.servingSize}
                    </p>
                  )}
                  <div className="space-y-2">
                    {result.nutritionDetails.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b border-border/50 py-1 last:border-0"
                      >
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">
                          {item.content}
                          {item.unit}
                          {item.percentage && (
                            <span className="ml-1 text-muted-foreground">
                              ({item.percentage}%)
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 원재료 */}
            {result.ingredients.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-3 font-bold">원재료</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.ingredients.map((ingredient, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-muted px-2 py-1 text-xs"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 위험 시 가이드 + 병원 찾기 */}
            {!result.isSafe && (
              <div className="space-y-3">
                <Link href={`/food/guide/${result.foodCode}`}>
                  <Button className="w-full" size="lg">
                    🆘 대응 가이드 보기
                  </Button>
                </Link>
                <Link href="/search">
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    <MapPin className="h-4 w-4" />
                    주변 병원 찾기
                  </Button>
                </Link>
              </div>
            )}

            {/* 돌아가기 */}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/food")}
            >
              다른 식품 확인하기
            </Button>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
