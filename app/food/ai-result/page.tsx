"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Leaf,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AIAnalysisResult {
  productName?: string;
  manufacturer?: string;
  detectedIngredients: string[];
  allergens: string[];
  hasUserAllergen: boolean;
  matchedUserAllergens: string[];
  foodCode?: string;
  dataSource?: string;
  rawMaterials?: string;
  isProcessing: boolean;
}

export default function AIResultPage() {
  const router = useRouter();
  const hasAnalyzed = useRef(false);
  const [result, setResult] = useState<AIAnalysisResult>({
    detectedIngredients: [],
    allergens: [],
    hasUserAllergen: false,
    matchedUserAllergens: [],
    isProcessing: true,
  });

  useEffect(() => {
    // ✅ 이미 실행했으면 중단
    if (hasAnalyzed.current) return;
    hasAnalyzed.current = true;

    startAnalysis();
  }, []);

  const startAnalysis = async () => {
    console.log("🚀 분석 시작...");

    // localStorage에서 이미지 가져오기
    const imageData = localStorage.getItem("pendingImageAnalysis");

    if (!imageData) {
      console.log("❌ 이미지 없음, 카메라로 이동");
      router.push("/food/camera");
      return;
    }

    console.log("✅ 이미지 발견");

    // 사용자 알레르기 가져오기
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userAllergens: string[] = [];
    if (user) {
      const { data } = await supabase
        .from("user_allergies")
        .select("allergen_name")
        .eq("user_id", user.id);

      if (data) {
        userAllergens = data.map((item) => item.allergen_name);
        console.log("👤 사용자 알레르기:", userAllergens);
      }
    }

    try {
      // Base64 데이터만 추출
      const base64Data = imageData.includes(",")
        ? imageData.split(",")[1]
        : imageData;

      console.log("📡 AI 분석 API 호출 시작...");

      // AI 분석 API 호출
      const response = await fetch("/api/food/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Data,
          userAllergens: userAllergens,
        }),
      });

      console.log("📡 API 응답 상태:", response.status);

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log("📦 API 응답 데이터:", data);

      if (!data.success) {
        console.log("❌ 분석 실패:", data.error);
        localStorage.removeItem("pendingImageAnalysis");
        toast.error(data.error || "분석에 실패했습니다");
        setResult((prev) => ({ ...prev, isProcessing: false }));
        return;
      }

      console.log("✅ 분석 성공!");

      // localStorage 정리
      localStorage.removeItem("pendingImageAnalysis");

      // 스캔 로그 저장 (비동기로 실행, 기다리지 않음)
      fetch("/api/food/scan-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodCode: data.foodCode || `ai-${Date.now()}`,
          foodName: data.productName || "알 수 없는 제품",
          manufacturer: data.manufacturer || "정보없음",
          isSafe: !data.hasUserAllergen,
          detectedAllergens: data.allergens || [],
        }),
      }).catch(() => {}); // 에러 무시

      // ✅ foodCode가 있으면 DB에 저장되어 있음 → 바로 이동
      if (data.foodCode) {
        console.log(
          "🔀 DB에 저장된 제품, result 페이지로 이동:",
          data.foodCode,
        );
        router.push(`/food/result/${data.foodCode}`);
        return;
      }

      // ✅ foodCode 없음 → sessionStorage에 저장 후 이동
      console.log("💾 AI 결과를 sessionStorage에 저장");
      const analysisResult = {
        productName: data.productName || "제품명 없음",
        manufacturer: data.manufacturer || "",
        detectedIngredients: data.detectedIngredients || [],
        allergens: data.allergens || [],
        hasUserAllergen: data.hasUserAllergen || false,
        matchedUserAllergens: data.matchedUserAllergens || [],
        dataSource: data.dataSource || "ai",
        rawMaterials: data.rawMaterials || "",
        nutritionInfo: data.nutritionInfo,
        weight: data.weight || "",
      };

      const aiResultId = `ai-${Date.now()}`;
      sessionStorage.setItem(aiResultId, JSON.stringify(analysisResult));

      console.log(
        "🔀 sessionStorage 저장 완료, result 페이지로 이동:",
        aiResultId,
      );
      router.push(`/food/result/${aiResultId}`);
    } catch (error) {
      console.error("💥 분석 오류:", error);
      localStorage.removeItem("pendingImageAnalysis");
      toast.error("이미지 분석 중 오류가 발생했습니다");
      setResult((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleViewDetail = () => {
    if (result.foodCode) {
      router.push(`/food/result/${result.foodCode}`);
    } else {
      toast.error("상세 정보를 찾을 수 없습니다");
    }
  };

  const handleRetake = () => {
    router.push("/food/camera");
  };

  // 로딩 중
  if (result.isProcessing) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">
              AI가 제품을 분석하고 있어요...
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              제품명, 원재료, 알레르기 성분을 확인 중입니다
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 분석 완료
  const isSafe = !result.hasUserAllergen;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-6">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {/* 제품 정보 */}
            {result.productName && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Package className="h-8 w-8 shrink-0 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        인식된 제품
                      </p>
                      <p className="text-lg font-bold">{result.productName}</p>
                      {result.manufacturer && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          제조사: {result.manufacturer}
                        </p>
                      )}
                      {result.dataSource && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {result.dataSource === "openapi"
                            ? "📊 식약처 공식 데이터"
                            : "🤖 AI 분석 결과"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 알레르기 검사 결과 - 메인 */}
            <Card
              className={`border-2 ${isSafe ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
            >
              <CardContent className="p-6 text-center">
                {isSafe ? (
                  <>
                    <ShieldCheck className="mx-auto h-20 w-20 text-green-600" />
                    <h2 className="mt-4 text-2xl font-bold text-green-900">
                      안전한 제품입니다
                    </h2>
                    <p className="mt-2 text-sm text-green-700">
                      {result.allergens.length === 0
                        ? "알레르기 유발 물질이 검출되지 않았습니다"
                        : "내 알레르기 유발 물질이 검출되지 않았습니다"}
                    </p>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="mx-auto h-20 w-20 text-red-600" />
                    <h2 className="mt-4 text-2xl font-bold text-red-900">
                      ⚠️ 주의가 필요합니다
                    </h2>
                    <p className="mt-2 text-sm text-red-700">
                      내 알레르기 성분이 포함되어 있습니다
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 내 알레르기 검출 결과 */}
            {result.matchedUserAllergens.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-900">
                      검출된 내 알레르기 ({result.matchedUserAllergens.length}
                      개)
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedUserAllergens.map((allergen, idx) => (
                      <Badge
                        key={idx}
                        variant="destructive"
                        className="text-sm"
                      >
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI가 감지한 재료 */}
            {result.detectedIngredients.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold">AI가 감지한 원재료</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.detectedIngredients.map((ingredient, idx) => (
                      <Badge key={idx} variant="secondary">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* 원재료 정보 (Open API) */}
            {result.rawMaterials && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold">원재료명 및 함량</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {result.rawMaterials}
                  </p>
                </CardContent>
              </Card>
            )}
            {/* 제품의 모든 알레르기 성분 */}
            {result.allergens.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold">제품의 알레르기 성분</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.allergens.map((allergen, idx) => {
                      const isUserAllergen =
                        result.matchedUserAllergens.includes(allergen);
                      return (
                        <Badge
                          key={idx}
                          variant={isUserAllergen ? "destructive" : "outline"}
                          className={
                            isUserAllergen
                              ? ""
                              : "border-orange-300 bg-orange-50"
                          }
                        >
                          {allergen}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 분석 완료 - 알레르기 없음 */}
            {result.allergens.length === 0 &&
              result.detectedIngredients.length === 0 &&
              !result.productName && (
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      이미지에서 제품 정보를 찾지 못했습니다
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      제품의 성분표나 바코드가 선명하게 보이도록 다시
                      촬영해주세요
                    </p>
                  </CardContent>
                </Card>
              )}

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleRetake}
                className="flex-1"
              >
                다시 촬영
              </Button>
              {result.foodCode && (
                <Button onClick={handleViewDetail} className="flex-1 gap-2">
                  상세 정보 보기
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* 안내 메시지 */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3">
                <p className="text-xs text-blue-900">
                  💡 AI 분석은 참고용이며, 정확한 정보는 제품 성분표를 직접
                  확인하세요.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
