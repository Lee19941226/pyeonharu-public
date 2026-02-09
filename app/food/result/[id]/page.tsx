"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  Share2,
  Heart,
  MapPin,
  Info,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getAllergenInfo } from "@/lib/allergen-info";
import type { AllergenInfo } from "@/lib/allergen-info";

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
  hasNutritionInfo?: boolean;
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
      console.error("로딩 에러:", error);
      setError("결과를 불러오는 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const saveToHistory = (result: FoodResult) => {
    const historyItem = {
      foodCode: result.foodCode,
      foodName: result.foodName,
      manufacturer: result.manufacturer,
      checkedAt: new Date().toISOString(),
      isSafe: result.isSafe,
    };

    const existing = localStorage.getItem("food_check_history");
    let history = existing ? JSON.parse(existing) : [];

    history = history.filter((item: any) => item.foodCode !== result.foodCode);
    history.unshift(historyItem);

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
      console.error("즐겨찾기 확인 실패:", error);
    }
  };

  const toggleFavorite = async () => {
    if (!result) return;

    try {
      if (isFavorite) {
        const response = await fetch(
          `/api/food/favorites?code=${result.foodCode}`,
          { method: "DELETE" },
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
      console.error("즐겨찾기 처리 실패:", error);
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
          <div className="mb-4 text-4xl">❌</div>
          <p className="mb-2 text-lg font-medium">
            {error || "결과를 불러올 수 없습니다"}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            식품 정보를 찾을 수 없거나 오류가 발생했습니다
          </p>
          <Button onClick={() => router.back()}>돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            {/* 뒤로가기 버튼 */}
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => router.back()}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              뒤로가기
            </Button>

            {/* 헤더 */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">{result.foodName}</h1>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavorite}
                  disabled={!result.isSafe}
                >
                  <Heart
                    className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                  />
                </Button>
              </div>
            </div>

            {/* 안전 여부 카드 - 위험 */}
            {!result.isSafe && (
              <Card className="mb-6 border-destructive bg-destructive/10">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-destructive">
                        주의! 알레르기 위험
                      </h2>
                      <p className="text-sm text-destructive/80">
                        {result.detectedAllergens.map((a) => a.name).join(", ")}{" "}
                        함유
                      </p>
                      <p className="text-sm text-destructive/80">
                        귀하의 알레르기와 일치합니다
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href="/" className="flex-1">
                      <Button className="w-full" variant="destructive">
                        <MapPin className="mr-2 h-4 w-4" />
                        병원 찾기
                      </Button>
                    </Link>
                    <Link href={`/food/guide/${params.id}`} className="flex-1">
                      <Button className="w-full" variant="outline">
                        💊 대처법
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 안전 여부 카드 - 안전 */}
            {result.isSafe && (
              <Card className="mb-6 border-green-600 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-green-900">
                        안전합니다!
                      </h2>
                      <p className="text-sm text-green-700">
                        귀하의 알레르기 성분이 포함되지 않았습니다
                      </p>
                      <p className="text-sm text-green-700">
                        안심하고 드셔도 좋습니다
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 원재료명 및 함량 */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  📝 원재료명 및 함량
                </h3>
                {result.ingredients.length > 0 ? (
                  <div className="max-h-[600px] space-y-2 overflow-y-auto pr-2">
                    {result.ingredients.map((ingredient, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {idx + 1}
                        </span>
                        <span className="flex-1 leading-relaxed">
                          {ingredient}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      원재료 정보가 제공되지 않습니다
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 알레르기 성분별 주요 증상 */}
            {result.allergens && result.allergens.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    💊 알레르기 성분별 주요 증상
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    이 제품에 포함된 알레르기 유발 성분과 대표 증상입니다
                  </p>
                  <div className="space-y-4">
                    {result.allergens
                      .map((allergen) => getAllergenInfo(allergen))
                      .filter((info): info is AllergenInfo => info !== null)
                      .map((info, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg border-l-4 p-4 ${
                            info.severity === "high"
                              ? "border-red-500 bg-red-50"
                              : info.severity === "medium"
                                ? "border-orange-500 bg-orange-50"
                                : "border-yellow-500 bg-yellow-50"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <h4 className="font-semibold">{info.name}</h4>
                            <Badge
                              variant={
                                info.severity === "high"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {info.severity === "high"
                                ? "높은 위험"
                                : info.severity === "medium"
                                  ? "중간 위험"
                                  : "낮은 위험"}
                            </Badge>
                          </div>
                          <p className="mb-3 text-sm text-muted-foreground">
                            {info.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {info.symptoms.map((symptom, sIdx) => (
                              <span
                                key={sIdx}
                                className={`rounded-full px-2.5 py-1 text-xs ${
                                  info.severity === "high"
                                    ? "bg-red-100 text-red-700"
                                    : info.severity === "medium"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 내 알레르기 검출 (조건부) */}
            {result.userAllergens && result.userAllergens.length > 0 ? (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 font-semibold">
                    🚨 귀하의 알레르기와 일치하는 성분 (
                    {result.detectedAllergens.length}개 검출)
                  </h3>
                  {result.detectedAllergens.length > 0 ? (
                    <div className="space-y-3">
                      {result.detectedAllergens.map((allergen, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-destructive/10 p-4"
                        >
                          <p className="font-medium text-destructive">
                            ⚠️ {allergen.name} ({allergen.amount})
                          </p>
                          <p className="text-sm text-destructive/80">
                            심각도: {allergen.severity} 🔴
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-green-50 p-8 text-center">
                      <div className="mb-2 text-4xl">✓</div>
                      <p className="text-sm font-medium text-green-800">
                        검출된 알레르기 성분이 없습니다 (0개)
                      </p>
                      <p className="mt-1 text-xs text-green-600">
                        귀하의 알레르기와 일치하는 성분이 없습니다
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              result.allergens &&
              result.allergens.length > 0 && (
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <h3 className="mb-4 font-semibold">
                      🔬 알레르기 유발 성분 ({result.allergens.length}개)
                    </h3>
                    <div className="space-y-2">
                      {result.allergens.map((allergen, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg bg-amber-50 p-3"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                          <p className="text-sm text-amber-900">{allergen}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">
                        💡 로그인하고 알레르기를 등록하면 자동으로 위험 성분을
                        확인해드려요
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}

            {/* 교차오염 위험 (사용자 알레르기 일치) */}
            {result.crossContaminationRisks &&
              result.crossContaminationRisks.length > 0 && (
                <Card className="mb-6 border-orange-500 bg-orange-50">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-orange-900">
                          교차오염 주의!
                        </h2>
                        <p className="text-sm text-orange-800">
                          제조시설에서 귀하의 알레르기 성분을 취급합니다
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {result.crossContaminationRisks.map((risk, idx) => (
                        <div key={idx} className="rounded-lg bg-orange-100 p-3">
                          <p className="font-medium text-orange-900">
                            ⚠️ {risk.name} (심각도: {risk.severity})
                          </p>
                          <p className="text-sm text-orange-800">
                            같은 제조시설에서 {risk.name}를 사용한 제품을
                            제조합니다
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* 알레르기 유발물질 표시 */}
            {result.allergyWarning && (
              <Card className="mb-6 border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <h3 className="mb-4 font-semibold text-orange-900">
                    ⚠️ 알레르기 유발물질 표시
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-orange-800">
                    {result.allergyWarning}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 교차오염 정보 (일반) */}
            {result.crossContamination &&
              result.crossContamination.length > 0 && (
                <Card className="mb-6 border-yellow-200 bg-yellow-50">
                  <CardContent className="p-6">
                    <h3 className="mb-4 font-semibold text-yellow-900">
                      ⚠️ 제조공정 교차오염 가능
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.crossContamination.map((item, idx) => (
                        <span
                          key={idx}
                          className="rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-sm text-yellow-900"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-yellow-800">
                      이 제품은 위 알레르기 유발 식품과 같은 제조시설에서
                      제조됩니다
                    </p>
                  </CardContent>
                </Card>
              )}

            {/* 영양정보 */}
            {result.nutritionDetails && result.nutritionDetails.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold">
                    📊 영양정보
                  </h3>
                  {result.servingSize && (
                    <p className="mb-4 text-sm text-muted-foreground">
                      1회 제공량: {result.servingSize}
                    </p>
                  )}
                  <div className="space-y-3">
                    {result.nutritionDetails.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <span className="text-sm font-medium">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">
                            {parseFloat(item.content).toLocaleString()}
                            {item.unit}
                          </span>
                          {item.percentage && (
                            <span className="text-xs text-muted-foreground">
                              ({item.percentage}%)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 제품 코드 (최하단) */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Info className="h-5 w-5" />
                  제품 정보
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">바코드</span>
                    <span className="font-mono font-medium">
                      {result.foodCode}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 알레르기 미등록 안내 */}
            {result.userAllergens.length === 0 && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        알레르기를 등록하시면 자동으로 위험 성분을
                        확인해드립니다
                      </p>
                      <Link href="/food/profile">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-blue-600"
                        >
                          알레르기 등록하러 가기 →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 즐겨찾기 버튼 */}
            {result.isSafe && (
              <Button
                onClick={toggleFavorite}
                className="w-full"
                variant={isFavorite ? "outline" : "default"}
              >
                {isFavorite ? "★ 즐겨찾기 제거" : "☆ 즐겨찾기 추가"}
              </Button>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
