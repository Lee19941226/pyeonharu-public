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
  nutritionDetails?: Array<{
    name: string;
    content: string;
    unit: string;
    percentage?: string;
  }>;
  servingSize?: string;
  isSafe: boolean;
  hasNutritionInfo?: boolean;
  detectedIngredients?: string[];
  dataSource?: string;
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
  }, [params.id, router]);

  const loadFoodResult = async () => {
    try {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;

      if (!id) {
        setError("잘못된 요청입니다");
        setIsLoading(false);
        return;
      }

      // ✅ AI 결과도 먼저 API로 조회 시도 (DB에 저장되어 있을 수 있음)
      console.log("🔍 API로 데이터 조회:", id);
      const response = await fetch(`/api/food/result?code=${id}`);
      const data = await response.json();

      console.log("📦 API 응답:", data);

      if (data.success && data.result) {
        // ✅ API에서 데이터 찾음
        setResult(data.result);
        setIsLoading(false);

        // ✅ saveToHistory는 setResult 이후, 비동기로 실행
        setTimeout(() => {
          if (data.result) saveToHistory(data.result);
        }, 0);

        return;
      }

      // ✅ API에서 못 찾았고, ai-로 시작하면 sessionStorage 확인
      if (id.startsWith("ai-")) {
        console.log("🤖 sessionStorage에서 AI 결과 확인");
        const aiData = sessionStorage.getItem(id);

        if (!aiData) {
          console.error("❌ sessionStorage에도 없음");
          setError("분석 결과를 찾을 수 없습니다");
          setIsLoading(false);
          return;
        }

        const analysisResult = JSON.parse(aiData);

        // ✅ 원재료 처리
        let processedIngredients = analysisResult.detectedIngredients || [];
        if (analysisResult.rawMaterials) {
          processedIngredients = analysisResult.rawMaterials
            .split(/[,\(\)]+/)
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);
        }

        const aiResult: FoodResult = {
          foodCode: id,
          foodName: analysisResult.productName || "제품명 없음",
          manufacturer: analysisResult.manufacturer || "",
          weight: analysisResult.weight || "",
          allergens: analysisResult.allergens || [],
          userAllergens: analysisResult.matchedUserAllergens || [],
          detectedAllergens: (analysisResult.allergens || []).map(
            (allergen: string) => ({
              name: allergen,
              amount: "",
              severity: analysisResult.matchedUserAllergens?.includes(allergen)
                ? "high"
                : "medium",
            }),
          ),
          ingredients: processedIngredients,
          isSafe: !analysisResult.hasUserAllergen,
          dataSource: analysisResult.dataSource || "ai",
          detectedIngredients: processedIngredients,

          // 영양정보
          nutritionDetails: analysisResult.nutritionInfo
            ? [
                {
                  name: "열량",
                  content: analysisResult.nutritionInfo.calories || "",
                  unit: "",
                },
                {
                  name: "나트륨",
                  content: analysisResult.nutritionInfo.sodium || "",
                  unit: "",
                },
                {
                  name: "탄수화물",
                  content: analysisResult.nutritionInfo.carbs || "",
                  unit: "",
                },
                {
                  name: "당류",
                  content: analysisResult.nutritionInfo.sugars || "",
                  unit: "",
                },
                {
                  name: "지방",
                  content: analysisResult.nutritionInfo.fat || "",
                  unit: "",
                },
                {
                  name: "단백질",
                  content: analysisResult.nutritionInfo.protein || "",
                  unit: "",
                },
              ].filter((item) => item.content)
            : undefined,
          servingSize: analysisResult.nutritionInfo?.servingSize,
          hasNutritionInfo: !!analysisResult.nutritionInfo,
        };

        setResult(aiResult);
        setIsLoading(false);

        // saveToHistory는 setResult 이후, 비동기로 실행
        setTimeout(() => {
          saveToHistory(aiResult);
        }, 0);

        return;
      }

      // ✅ 둘 다 실패
      setError("분석 결과를 찾을 수 없습니다");
      setIsLoading(false);
    } catch (error) {
      console.error("💥 로딩 에러:", error);
      setError("결과를 불러오는 중 오류가 발생했습니다");
      setIsLoading(false);
    }
  };
  const saveToHistory = async (result: FoodResult) => {
    // ✅ result가 없으면 바로 리턴
    if (!result) {
      console.warn("⚠️ saveToHistory: result가 없습니다");
      return;
    }

    // ✅ 브라우저 환경 체크 (SSR 방지)
    if (typeof window === "undefined") return;

    const historyItem = {
      barcode: result.foodCode,
      product_name: result.foodName,
      manufacturer: result.manufacturer || "정보없음",
      is_safe: result.isSafe,
      detected_allergens: result.detectedAllergens?.map((a) => a.name) || [],
      checked_at: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // ==========================================
      // 로그인 사용자 → Supabase에 저장
      // ==========================================
      if (user) {
        const { error } = await supabase.from("food_check_history").insert({
          user_id: user.id,
          member_id: null, // 나중에 가족 기능 추가 시 사용
          barcode: historyItem.barcode,
          product_name: historyItem.product_name,
          manufacturer: historyItem.manufacturer,
          is_safe: historyItem.is_safe,
          detected_allergens: historyItem.detected_allergens,
          checked_at: historyItem.checked_at,
        });

        if (error) {
          console.error("❌ Supabase 저장 실패:", error);
          // ✅ DB 실패 시 localStorage에 fallback
          saveToLocalStorage(historyItem);
        } else {
          console.log("✅ Supabase에 스캔 기록 저장 완료");
        }

        // DB에도 스캔 로그 저장 (주간 리포트용 - 기존 유지)
        fetch("/api/food/scan-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foodCode: result.foodCode,
            foodName: result.foodName,
            manufacturer: result.manufacturer || "정보없음",
            isSafe: result.isSafe,
            detectedAllergens:
              result.detectedAllergens?.map((a) => a.name) || [],
          }),
        }).catch(() => {});
      }
      // ==========================================
      // 비로그인 사용자 → localStorage에 저장
      // ==========================================
      else {
        console.log("👤 비로그인 사용자, localStorage에 저장");
        saveToLocalStorage(historyItem);
      }
    } catch (error) {
      console.error("❌ saveToHistory 오류:", error);
      // 에러 발생 시 localStorage에 fallback
      saveToLocalStorage(historyItem);
    }
  };

  // ==========================================
  // localStorage 저장 헬퍼 함수
  // ==========================================
  const saveToLocalStorage = (historyItem: any) => {
    try {
      const existing = localStorage.getItem("food_check_history");
      let history = existing ? JSON.parse(existing) : [];

      // 중복 제거 (같은 barcode)
      history = history.filter(
        (item: any) => item.barcode !== historyItem.barcode,
      );

      // 최신 항목을 맨 앞에 추가
      history.unshift(historyItem);

      // 최대 50개까지만 저장
      if (history.length > 50) {
        history = history.slice(0, 50);
      }

      localStorage.setItem("food_check_history", JSON.stringify(history));
      console.log("✅ localStorage에 저장 완료");
    } catch (error) {
      console.error("❌ localStorage 저장 실패:", error);
    }
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
          <Button onClick={() => router.push("/food")}>
            검색으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }
  const safeAllergens = result?.allergens || [];
  const safeDetectedAllergens = result?.detectedAllergens || [];
  const safeIngredients = result?.ingredients || [];
  const safeNutritionDetails = result?.nutritionDetails || [];
  const safeCrossContamination = result?.crossContamination || [];
  const safeUserAllergens = result.userAllergens || [];
  const safeCrossContaminationRisks = result.crossContaminationRisks || [];

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
              {/* 왼쪽: 제품명 + 뱃지 */}
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{result.foodName}</h1>

                {result.dataSource && (
                  <Badge variant="outline" className="text-xs">
                    {result.dataSource === "database" && "DB"}
                    {result.dataSource === "openapi" && "식약처 공식"}
                    {result.dataSource === "ai" && "AI 분석"}
                  </Badge>
                )}
              </div>

              {/* 오른쪽 버튼 영역 */}
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

            {/* 알레르기 정보 */}
            {safeAllergens.length > 0 && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    알레르기 성분
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {safeAllergens.map((allergen, index) => (
                      <Badge key={index} variant="destructive">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                        {safeDetectedAllergens.map((a) => a.name).join(", ")}{" "}
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

            {/* 원재료 통합 섹션 */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  📝 원재료명 및 함량
                </h3>

                {safeIngredients.length > 0 ? (
                  // ✅ Open API 원재료 (상세) - 번호 매긴 리스트
                  <div className="max-h-[600px] space-y-2 overflow-y-auto pr-2">
                    {safeIngredients.map((ingredient, idx) => (
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
                ) : result.detectedIngredients &&
                  result.detectedIngredients.length > 0 ? (
                  // ✅ AI 감지 재료 - 배지 형태
                  <div>
                    <p className="mb-3 text-sm text-muted-foreground">
                      ✔ 주요 원재료
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.detectedIngredients.map((ingredient, idx) => (
                        <Badge key={idx} variant="secondary">
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  // ✅ 원재료 정보 없음
                  <div className="rounded-lg bg-muted p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      원재료 정보가 제공되지 않습니다
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 알레르기 성분별 주요 증상 */}
            {safeAllergens.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    💊 알레르기 성분별 주요 증상
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    이 제품에 포함된 알레르기 유발 성분과 대표 증상입니다
                  </p>
                  <div className="space-y-4">
                    {safeAllergens
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
            {safeUserAllergens.length > 0 ? (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 font-semibold">
                    🚨 귀하의 알레르기와 일치하는 성분 (
                    {safeDetectedAllergens.length}개 검출)
                  </h3>
                  {safeDetectedAllergens.length > 0 ? (
                    <div className="space-y-3">
                      {safeDetectedAllergens.map((allergen, idx) => (
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
              safeAllergens.length > 0 && (
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <h3 className="mb-4 font-semibold">
                      🔬 알레르기 유발 성분 ({safeAllergens.length}개)
                    </h3>
                    <div className="space-y-2">
                      {safeAllergens.map((allergen, idx) => (
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
            {safeCrossContaminationRisks.length > 0 && (
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
                    {safeCrossContaminationRisks.map((risk, idx) => (
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

            {/* 알레르기 미등록 안내 */}
            {safeUserAllergens.length === 0 && (
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
