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
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  }, [params.id]);

  const loadFoodResult = async () => {
    console.log("🔍 페이지에서 로딩 시작, ID:", params.id); // 디버깅

    try {
      const response = await fetch(`/api/food/result?code=${params.id}`);
      console.log("📡 API 응답 상태:", response.status); // 디버깅

      const data = await response.json();
      console.log("📦 API 응답 데이터:", data); // 디버깅

      if (data.success) {
        setResult(data.result);
        console.log("✅ 결과 설정 완료:", data.result); // 디버깅
      } else {
        setError(data.error || "결과를 불러올 수 없습니다");
        console.error("❌ API 에러:", data.error); // 디버깅
      }
    } catch (error) {
      console.error("💥 로딩 에러:", error); // 디버깅
      setError("결과를 불러오는 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!result) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (isFavorite) {
      await supabase
        .from("favorite_foods")
        .delete()
        .eq("user_id", user.id)
        .eq("food_code", result.foodCode);
      setIsFavorite(false);
    } else {
      await supabase.from("favorite_foods").insert({
        user_id: user.id,
        food_code: result.foodCode,
        food_name: result.foodName,
      });
      setIsFavorite(true);
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
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">{result.foodName}</h1>
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

            {/* Alert Box - Danger */}
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
                    <Link href="/search" className="flex-1">
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

            {/* Alert Box - Safe */}
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

            {/* Product Info */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Info className="h-5 w-5" />
                  상품 정보
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">제품명</span>
                    <span className="font-medium">{result.foodName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">제조사</span>
                    <span className="font-medium">{result.manufacturer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">중량/용량</span>
                    <span>{result.weight}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* 원재료명 및 함량 */}
            {result.ingredients.length > 0 ? (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 font-semibold">📝 원재료명 및 함량</h3>
                  <div className="space-y-2">
                    {result.ingredients.map((ingredient, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded bg-muted p-3 text-sm"
                      >
                        <span className="font-medium text-muted-foreground">
                          {idx + 1}.
                        </span>
                        <span>{ingredient}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 font-semibold">📝 원재료명 및 함량</h3>
                  <p className="text-center text-sm text-muted-foreground">
                    원재료 정보가 제공되지 않습니다
                  </p>
                </CardContent>
              </Card>
            )}
            {/* 제품의 알레르기 성분 (모든 사용자에게 표시) */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">
                  🔬 이 제품에 포함된 알레르기 성분
                </h3>
                {result.allergens.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.allergens.map((allergen, idx) => (
                      <span
                        key={idx}
                        className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-sm text-gray-700"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    알레르기 성분 정보가 없습니다
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 사용자 알레르기와 일치하는 성분 (알레르기 등록한 사용자에게만) */}
            {result.userAllergens.length > 0 && (
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
                    <div className="rounded-lg bg-muted p-8 text-center">
                      <div className="mb-2 text-4xl">✓</div>
                      <p className="text-sm text-muted-foreground">
                        귀하의 알레르기 성분이 검출되지 않았습니다
                      </p>
                    </div>
                  )}
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
                  <p className="text-sm text-orange-800 leading-relaxed">
                    {result.allergyWarning}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ✅ 추가: 교차오염 정보 (일반) */}
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
            {/* 교차오염 위험 경고 (사용자 알레르기와 일치하는 경우) */}
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
            {/* Allergen Info */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">
                  🔬 알레르기 유발 성분 ({result.detectedAllergens.length}개
                  검출)
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
                          귀하의 알레르기: {allergen.severity} 🔴
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted p-8 text-center">
                    <div className="mb-2 text-4xl">✓</div>
                    <p className="text-sm text-muted-foreground">
                      검출된 알레르기 성분이 없습니다 (0개)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* 알레르기 미등록 사용자 안내 */}
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
            {/* Favorite Button for Safe Foods */}
            {result.isSafe && !isFavorite && (
              <Button onClick={toggleFavorite} className="mt-6 w-full">
                ♡ 즐겨찾기에 추가
              </Button>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
