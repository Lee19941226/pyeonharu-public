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
  userAllergens: string[];
  detectedAllergens: Array<{
    name: string;
    amount: string;
    severity: string;
  }>;
  ingredients: string[];
  nutrition: {
    calories: number;
    sodium: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  isSafe: boolean;
}

export default function FoodResultPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<FoodResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadFoodResult();
  }, [params.id]);

  const loadFoodResult = async () => {
    try {
      const response = await fetch(`/api/food/result?code=${params.id}`);
      const data = await response.json();

      if (data.success) {
        setResult(data.result);
      }
    } catch (error) {
      console.error(error);
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
      <div className="flex min-h-screen items-center justify-center">
        <p>분석 중...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>결과를 불러올 수 없습니다</p>
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

            {/* Nutrition Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">
                  📊 영양 정보 (1회 제공량 기준)
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">열량</span>
                    <span>{result.nutrition.calories}kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">나트륨</span>
                    <span>{result.nutrition.sodium}mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">탄수화물</span>
                    <span>{result.nutrition.carbs}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">단백질</span>
                    <span>{result.nutrition.protein}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">지방</span>
                    <span>{result.nutrition.fat}g</span>
                  </div>
                </div>
              </CardContent>
            </Card>

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
