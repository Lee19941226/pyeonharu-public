"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  Heart,
  MapPin,
  Info,
  AlertCircle,
  ChevronLeft,
  Lightbulb,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getAllergenInfo } from "@/lib/allergen-info";
import type { AllergenInfo } from "@/lib/allergen-info";
import { createClient } from "@/lib/supabase/client";
import { FoodResult } from "@/types/food";
import { AllergenDisclaimer } from "@/components/food/allergen-disclaimer";
import { getAiResult } from "@/lib/utils/ai-result-storage";
import { classifyApiError, getToastDuration } from "@/lib/utils/api-error";
import { DataSourceBadge } from "@/components/food/data-source-badge";
import { shareToKakao } from "@/lib/utils/kakao-share";
export default function FoodResultPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<FoodResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const lastLoadedIdRef = useRef<string | undefined>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("me");
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [altLoading, setAltLoading] = useState(false);
  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    // 같은 ID면 스킵
    if (lastLoadedIdRef.current === id) {
      return;
    }

    // 새로운 ID 저장 후 로드
    lastLoadedIdRef.current = id;
    loadFoodResult();

    // Kakao SDK 초기화
    if (typeof window !== "undefined" && window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_KEY);
      }
    }
  }, [params.id]);

  // ✅ result가 로드된 후에 즐겨찾기 확인
  useEffect(() => {
    if (result && result.foodCode) {
      checkFavorite();
    }
  }, [result]);
  useEffect(() => {
    const getUserInfo = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);

        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", user.id)
          .single();

        if (profile?.nickname) {
          setUserName(profile.nickname);
        } else {
          setUserName(user.email?.split("@")[0] || "회원");
        }

        // ✅ 가족 구성원 로드 (user 확인 후 여기서 호출)
        fetch("/api/family")
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setFamilyMembers(d.members);
          });
      } else {
        setIsLoggedIn(false);
      }
    };

    getUserInfo();
  }, []);
  const shareToKakao = () => {
    if (!result) return;

    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      toast.error("카카오톡 공유는 실제 도메인에서만 작동합니다");
      return;
    }

    const shareUrl =
      result.foodCode?.startsWith("ai-") || result.dataSource === "ai"
        ? `${window.location.origin}/food`
        : `${window.location.origin}/food/result/${result.foodCode}`;

    const isSafe = result.isSafe;
    const allergenText =
      !isSafe && result.detectedAllergens?.length > 0
        ? result.detectedAllergens.map((a: any) => a.name).join(", ")
        : "";

    const ogImageUrl = new URL(`${window.location.origin}/api/og`);
    ogImageUrl.searchParams.set("name", result.foodName);
    ogImageUrl.searchParams.set("safe", isSafe.toString());
    ogImageUrl.searchParams.set("allergens", allergenText);
    ogImageUrl.searchParams.set("manufacturer", result.manufacturer || "");

    const title = `${result.foodName} 알레르기 정보`;
    const description = isSafe
      ? `✅ 안전해요! 알레르기 성분이 없습니다`
      : `⚠️ 주의! ${allergenText} 알레르기 성분 포함`;

    // ✅ Share 모듈 확인 후 분기
    const kakao = window.Kakao;

    if (!kakao) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("링크를 복사했어요!");
      return;
    }

    if (!kakao.isInitialized()) {
      kakao.init(process.env.NEXT_PUBLIC_KAKAO_KEY);
    }

    // ✅ Share 없으면 즉시 링크 복사로 대체
    if (!kakao.Share || typeof kakao.Share.sendDefault !== "function") {
      console.warn("Kakao.Share 미지원 → 링크 복사");
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("링크를 복사했어요! 카카오톡에 붙여넣기 해주세요 💬");
      });
      return;
    }

    kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description,
        imageUrl: ogImageUrl.toString(),
        imageWidth: 1200,
        imageHeight: 630,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        {
          title: "편하루에서 확인하기",
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    });
  };

  const loadFoodResult = async () => {
    try {
      setIsLoading(true);

      const id = Array.isArray(params.id) ? params.id[0] : params.id;

      console.log("🔍 결과 로드 시작:", id);

      // ==========================================
      // 0단계: 빠른 캐시 확인 (즉시 표시)
      // ==========================================
      const cacheKey = `food_quick_${id}`;
      const quickCache = sessionStorage.getItem(cacheKey);

      if (quickCache) {
        const cached = JSON.parse(quickCache);

        // 5분 이내 캐시만 사용
        if (Date.now() - cached.timestamp < 300000) {
          console.log("⚡ 빠른 캐시 사용 - 즉시 표시");

          const quickResult: FoodResult = {
            foodCode: cached.foodCode,
            foodName: cached.foodName,
            manufacturer: cached.manufacturer || "",
            weight: cached.weight || "",
            allergens: cached.allergens || [],
            userAllergens: [],
            detectedAllergens: (cached.matchedUserAllergens || []).map(
              (a: string) => ({
                name: a,
                amount: "",
                severity: "medium" as const,
                code: "",
              }),
            ),
            ingredients: cached.ingredients || [],
            isSafe: !cached.hasAllergen,
            dataSource: cached.dataSource || "db",
            alternatives: [],
            nutritionDetails: undefined,
            servingSize: undefined,
            hasNutritionInfo: false,
          };

          setResult(quickResult);
          setIsLoading(false);

          if (id) {
            fetchDetailedInfo(id);
          }
          return;
        }
      }

      // ==========================================
      // 1단계: 무조건 API 우선 호출 (AI든 일반이든)
      // ==========================================
      try {
        console.log("📡 API 호출:", `/api/food/result?code=${id}`);

        const response = await fetch(`/api/food/result?code=${id}`, {
          credentials: "include",
        });

        // ✅ API 성공
        if (response.ok) {
          const data = await response.json();

          if (data.success) {
            console.log("✅ API 성공 - 완전한 결과 로드");
            console.log("  - 제품명:", data.result.foodName);
            console.log("  - 데이터 소스:", data.result.dataSource);
            console.log(
              "  - 원재료:",
              data.result.ingredients?.length || 0,
              "개",
            );
            console.log(
              "  - 대체품:",
              data.result.alternatives?.length || 0,
              "개",
            );

            setResult(data.result);

            setTimeout(() => {
              saveToHistory(data.result);
              fetchAlternatives(data.result);
            }, 0);

            return;
          }
        }

        const errInfo = classifyApiError(null, response.status);
        console.warn("⚠️ API 응답 실패:", response.status, errInfo.type);

        // 서버 오류일 때 사용자에게 알림 (AI 결과가 없을 경우만)
        if (response.status >= 500 && !id?.startsWith("ai-")) {
          toast.error("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요", {
            duration: 4000,
          });
        }
      } catch (apiError) {
        const errInfo = classifyApiError(apiError);
        console.error("❌ API 호출 오류:", errInfo.type, apiError);
        if (errInfo.type === "network") {
          toast.error("인터넷 연결을 확인해주세요", { duration: 5000 });
        }
      }

      // ==========================================
      // 2단계: API 실패 시 sessionStorage 백업 (AI만)
      // ==========================================
      if (id?.startsWith("ai-")) {
        // ✅ localStorage로 변경 (sessionStorage → 탭 전환 시 소실 문제 해결)
        const analysisData = getAiResult(id);

        if (analysisData) {
          console.log("✅ sessionStorage에서 복구");
          const analysisResult = analysisData;

          // ✅ FoodResult 형식으로 변환
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
                severity: analysisResult.matchedUserAllergens?.includes(
                  allergen,
                )
                  ? "high"
                  : "medium",
              }),
            ),
            ingredients:
              analysisResult.ingredients ||
              analysisResult.detectedIngredients ||
              [],
            isSafe: !analysisResult.hasUserAllergen,
            dataSource: analysisResult.dataSource || "ai",
            detectedIngredients: analysisResult.detectedIngredients || [],

            // ✅ 영양정보
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
            alternatives: [], // sessionStorage에는 대체품 없음
          };

          setResult(aiResult);

          setTimeout(() => {
            saveToHistory(aiResult);
          }, 0);

          return; // ✅ 백업 사용 성공
        }

        // ❌ sessionStorage에도 없음
        console.error("❌ sessionStorage에도 데이터 없음");
        setError("AI 분석 결과를 찾을 수 없습니다");
        return;
      }

      // ==========================================
      // 3단계: 일반 제품인데 API 실패 → 에러
      // ==========================================
      console.error("❌ 제품 정보를 불러올 수 없음");
      setError("제품 정보를 불러올 수 없습니다");
    } catch (error) {
      const errInfo = classifyApiError(error);
      console.error("💥 loadFoodResult 전체 오류:", errInfo.type, error);
      setError(errInfo.message);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchDetailedInfo = async (id: string) => {
    if (!id) return;
    try {
      console.log("🔄 백그라운드에서 상세 정보 로딩...");

      const response = await fetch(`/api/food/result?code=${id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("✅ 상세 정보 추가 완료");

          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  nutritionDetails: data.result.nutritionDetails,
                  servingSize: data.result.servingSize,
                  hasNutritionInfo: data.result.hasNutritionInfo,
                  alternatives: data.result.alternatives,
                }
              : data.result,
          );
        }
      }
    } catch (error) {
      console.warn("⚠️ 상세 정보 로드 실패 (무시):", error);
    }
  };
  const fetchAlternatives = async (foodResult: FoodResult) => {
    // 안전한 제품이거나 알레르기 없으면 스킵
    if (foodResult.isSafe || !foodResult.userAllergens?.length) return;

    setAltLoading(true);
    try {
      const allergenParam = foodResult.userAllergens.join(",");
      const res = await fetch(
        `/api/food/alternatives?name=${encodeURIComponent(foodResult.foodName)}&allergens=${encodeURIComponent(allergenParam)}&code=${foodResult.foodCode}`,
      );
      const data = await res.json();
      if (data.success) setAlternatives(data.alternatives);
    } catch (e) {
      console.warn("대체품 로드 실패:", e);
    } finally {
      setAltLoading(false);
    }
  };
  useEffect(() => {
    loadFoodResult();
  }, [params.id]);
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
    if (!result || !result.foodCode) {
      console.log("⚠️ result 또는 foodCode 없음");
      return;
    }

    try {
      console.log("🔍 즐겨찾기 확인:", result.foodCode);

      const response = await fetch(
        `/api/food/favorites/check?code=${result.foodCode}`,
      );

      if (!response.ok) {
        console.error("❌ 즐겨찾기 확인 실패:", response.status);
        return;
      }

      const data = await response.json();
      console.log("✅ 즐겨찾기 상태:", data.favorited);
      setIsFavorite(data.favorited);
    } catch (error) {
      console.error("❌ 즐겨찾기 확인 오류:", error);
    }
  };

  // ✅ toggleFavorite 수정 - 로그인 확인 추가
  const toggleFavorite = async () => {
    if (!result || !result.foodCode) {
      toast.error("제품 정보를 불러오는 중입니다");
      return;
    }

    // ✅ 로그인 확인
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("로그인이 필요합니다", {
        action: {
          label: "로그인",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    try {
      if (isFavorite) {
        // ✅ 삭제
        const response = await fetch(
          `/api/food/favorites?code=${result.foodCode}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          throw new Error("삭제 실패");
        }

        const data = await response.json();

        if (data.success) {
          setIsFavorite(false);
          toast.success("즐겨찾기에서 제거되었습니다");
        }
      } else {
        // ✅ 추가
        const response = await fetch("/api/food/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foodCode: result.foodCode,
            foodName: result.foodName,
            manufacturer: result.manufacturer || "정보없음",
            isSafe: result.isSafe,
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            toast.error("이미 즐겨찾기에 있습니다");
            setIsFavorite(true); // ✅ 상태 동기화
            return;
          }
          throw new Error("추가 실패");
        }

        const data = await response.json();

        if (data.success) {
          setIsFavorite(true);
          toast.success("즐겨찾기에 추가되었습니다");
        }
      }
    } catch (error) {
      console.error("❌ 즐겨찾기 처리 실패:", error);
      toast.error("즐겨찾기 처리 중 오류가 발생했습니다");
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
  const safeUserAllergens = result.userAllergens || [];
  const safeCrossContaminationRisks = result.crossContaminationRisks || [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        {result && (
          <AllergenDisclaimer dataSource={result.dataSource} variant="banner" />
        )}
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-4xl">
            {/* 뒤로가기 버튼 */}
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => {
                // ✅ 검색 페이지로 직접 이동 (재검색 방지)
                const searchQuery = sessionStorage.getItem("last_search_query");
                if (searchQuery) {
                  router.push(
                    `/food/search?q=${encodeURIComponent(searchQuery)}`,
                  );
                } else {
                  router.push("/food/search");
                }
              }}
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
                  <DataSourceBadge
                    source={result.dataSource}
                    size="md"
                    withTooltip={true}
                  />
                )}
              </div>

              {/* 오른쪽: 버튼 영역 */}
              <div className="flex items-center gap-2">
                {/* 카카오톡 공유 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={shareToKakao}
                  title="카카오톡 공유"
                  className="
    group
    rounded-full
    transition-all duration-200
    hover:bg-yellow-400
    hover:shadow-md
    hover:scale-110
  "
                >
                  <svg
                    className="
      h-6 w-6
      fill-[#3C1E1E]
      transition-colors duration-200
      group-hover:fill-black
    "
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.8 6.7-.2.8-.6 2.8-.7 3.2 0 .2 0 .4.2.5.1.1.3.1.4 0 .5-.3 3.7-2.4 4.3-2.8.3 0 .7.1 1 .1 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
                  </svg>
                </Button>

                {/* 즐겨찾기 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavorite}
                  disabled={result.isSafe}
                  className="
    group
    rounded-full
    transition-all duration-200
    hover:bg-red-50
    hover:scale-110
  "
                >
                  <Heart
                    className={`
      h-5 w-5
      transition-all duration-200
      ${
        isFavorite
          ? "fill-red-500 text-red-500 scale-110"
          : "text-gray-400 group-hover:text-red-500 group-hover:fill-red-500"
      }
    `}
                  />
                </Button>
              </div>
            </div>
            {/* ✅ AI 생성 제품 경고 (조건부 표시) */}
            {result.dataSource === "ai" && (
              <Card className="mb-6 border-amber-300 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 text-sm font-semibold text-amber-900">
                        AI 추정 정보
                      </h3>
                      <p className="text-xs leading-relaxed text-amber-800">
                        이 제품은 AI가 분석한 추정 정보입니다. 실제 제품과 다를
                        수 있으므로
                        <strong className="font-semibold">
                          {" "}
                          구매 전 제품 포장지를 반드시 확인
                        </strong>
                        하시거나 판매처에 직접 문의하시길 권장드립니다.
                      </p>
                      {!result.isSafe && (
                        <AllergenDisclaimer
                          dataSource={result.dataSource}
                          isDangerous={!result.isSafe}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* 가족 구성원 선택기 */}
            {isLoggedIn && familyMembers.length > 0 && (
              <div className="rounded-xl border bg-card p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  누구의 알레르기로 확인할까요?
                </p>
                <div className="flex flex-wrap gap-2">
                  {/* 내 알레르기 */}
                  <button
                    onClick={() => setSelectedMemberId("me")}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedMemberId === "me"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    👤 나
                  </button>

                  {familyMembers.map((m) => {
                    // 이 구성원 기준으로 위험 여부 계산
                    const memberAllergenNames = m.family_member_allergies.map(
                      (a: any) => a.allergen_name,
                    );
                    const memberDanger = result?.allergens.some((a: string) =>
                      memberAllergenNames.includes(a),
                    );

                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMemberId(m.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          selectedMemberId === m.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : memberDanger
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-green-200 bg-green-50 text-green-700"
                        }`}
                      >
                        {m.avatar_emoji} {m.name}
                        {memberDanger && selectedMemberId !== m.id && (
                          <span className="text-red-500">⚠️</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 선택된 구성원 알레르기 경고 */}
                {selectedMemberId !== "me" &&
                  (() => {
                    const member = familyMembers.find(
                      (m) => m.id === selectedMemberId,
                    );
                    if (!member || !result) return null;

                    const memberAllergenNames =
                      member.family_member_allergies.map(
                        (a: any) => a.allergen_name,
                      );
                    const matched = result.allergens.filter((a: string) =>
                      memberAllergenNames.includes(a),
                    );

                    return matched.length > 0 ? (
                      <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
                        <p className="text-xs font-semibold text-red-700">
                          ⚠️ {member.name}님의 알레르기 성분 포함:{" "}
                          {matched.join(", ")}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
                        <p className="text-xs font-semibold text-green-700">
                          ✅ {member.name}님의 알레르기 성분 없음
                        </p>
                      </div>
                    );
                  })()}
              </div>
            )}
            {/* 안전 여부 카드 - 안전 */}
            {result.isSafe && (
              <Card className="mb-6 border-green-600 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-green-900">
                        안전합니다!
                      </h2>
                      {isLoggedIn ? (
                        <>
                          <p className="text-sm text-green-700">
                            {userName ? `${userName}님의` : ""} 알레르기 성분이
                            포함되지 않았습니다
                          </p>
                          <p className="text-sm text-green-700">
                            안심하고 드셔도 좋습니다
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-green-700">
                            확인된 알레르기 성분이 없습니다
                          </p>
                          <Link
                            href="/food/profile"
                            className="text-sm text-green-600 underline hover:text-green-800"
                          >
                            내 알레르기 정보를 등록하고 정확하게 확인하세요 →
                          </Link>
                        </>
                      )}
                    </div>
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
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-destructive">
                        ⚠️ 주의! 알레르기 위험
                      </h2>
                      <p className="text-sm text-destructive/80 font-medium">
                        {safeDetectedAllergens
                          .filter((a) => a && a.name)
                          .map((a) => a.name)
                          .join(", ")}{" "}
                        함유
                      </p>
                      {isLoggedIn ? (
                        <p className="text-sm text-destructive/80">
                          {userName ? `${userName}님의` : ""} 알레르기와
                          일치합니다
                        </p>
                      ) : (
                        <p className="text-sm text-destructive/80">
                          주의가 필요한 알레르기 성분입니다
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href="/hospital" className="flex-1">
                      <Button className="w-full" variant="destructive">
                        <MapPin className="mr-2 h-4 w-4" />
                        병원 찾기
                      </Button>
                    </Link>
                    {isLoggedIn ? (
                      <Link
                        href={`/food/guide/${params.id}`}
                        className="flex-1"
                      >
                        <Button className="w-full" variant="outline">
                          💊 대처법
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/food/profile" className="flex-1">
                        <Button className="w-full" variant="outline">
                          🔐 내 정보 등록
                        </Button>
                      </Link>
                    )}
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

            {/* 원재료 통합 섹션 */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  📝 원재료명 및 함량
                </h3>

                {(() => {
                  // ✅ 1순위: ingredients 배열
                  if (safeIngredients.length > 0) {
                    return (
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
                    );
                  }

                  // ✅ 2순위: rawMaterials 파싱 (OpenAPI, Nutrition)
                  if (result.rawMaterials && result.rawMaterials.length > 10) {
                    const parsedIngredients = result.rawMaterials
                      .split(/[,、]/) // 쉼표, 중점으로 분리
                      .map((item) => item.trim())
                      .filter((item) => item.length > 0);

                    return (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <DataSourceBadge
                            source={result.dataSource}
                            withTooltip={false}
                          />
                          <span className="text-xs text-muted-foreground">
                            {parsedIngredients.length}개 원재료
                          </span>
                        </div>
                        <div className="max-h-[600px] space-y-2 overflow-y-auto pr-2">
                          {parsedIngredients.map((ingredient, idx) => (
                            <div key={idx} className="flex gap-3 text-sm">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                                {idx + 1}
                              </span>
                              <span className="flex-1 leading-relaxed">
                                {ingredient}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // ✅ 3순위: AI 감지 재료
                  if (
                    result.detectedIngredients &&
                    result.detectedIngredients.length > 0
                  ) {
                    return (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            AI 분석
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            주요 원재료만 표시
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.detectedIngredients.map((ingredient, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="px-3 py-1.5 text-sm"
                            >
                              {ingredient}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 rounded-lg bg-blue-50 p-3">
                          <p className="text-xs text-blue-700">
                            💡 AI가 주요 원재료를 추출했어요. 전체 원재료는 제품
                            포장을 확인하세요.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // ✅ 4순위: 정보 없음
                  return (
                    <div className="rounded-lg bg-muted p-8 text-center">
                      <div className="mb-2 text-4xl">📦</div>
                      <p className="text-sm font-medium text-muted-foreground">
                        원재료 정보가 제공되지 않습니다
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        제품 포장의 원재료명을 직접 확인하세요
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            {/* 영양성분 정보 */}
            {result.nutritionDetails && result.nutritionDetails.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    🥗 영양성분
                  </h3>

                  {result.servingSize && (
                    <div className="mb-4 rounded-lg bg-muted p-3">
                      <p className="text-sm text-muted-foreground">
                        1회 제공량: <strong>{result.servingSize}</strong>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {result.nutritionDetails.map((nutrition, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border bg-card p-3 text-center"
                      >
                        <p className="text-xs font-medium text-muted-foreground">
                          {nutrition.name}
                        </p>
                        <p className="mt-1 text-lg font-bold">
                          {nutrition.content}
                          {nutrition.unit && (
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                              {nutrition.unit}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* 대체 식품 추천 (위험할 때만 표시) */}
            {!result.isSafe && (altLoading || alternatives.length > 0) && (
              <Card className="border-2 border-blue-500 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-900">대신 이거 안전해요!</span>
                  </CardTitle>
                  <p className="text-sm text-blue-700">
                    비슷한 제품 중 알레르기 없는 대체품을 추천해드려요
                  </p>
                </CardHeader>
                <CardContent>
                  {/* 가로 스크롤 카드 */}
                  {altLoading && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="min-w-[180px] animate-pulse rounded-lg border-2 border-gray-200 bg-gray-100 p-3 h-28"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {alternatives.map((alt: any, idx: number) => (
                      <div
                        key={idx}
                        className="min-w-[200px] flex-shrink-0 cursor-pointer rounded-lg border-2 border-green-300 bg-white p-3 transition-all hover:shadow-md"
                        onClick={() =>
                          alt.barcode
                            ? router.push(`/food/result/${alt.barcode}`)
                            : toast.info(
                                "바코드로 검색해보세요: " + alt.productName,
                              )
                        }
                      >
                        {/* 안전 배지 */}
                        <div className="mb-2 flex items-center justify-between">
                          <Badge className="bg-green-600 text-white">
                            ✓ 안전
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {alt.category}
                          </span>
                        </div>

                        {/* 제품명 */}
                        <h4 className="mb-1 font-bold text-gray-900">
                          {alt.productName}
                        </h4>

                        {/* 제조사 */}
                        {alt.manufacturer && (
                          <p className="mb-2 text-xs text-muted-foreground">
                            {alt.manufacturer}
                          </p>
                        )}

                        {/* 추천 이유 */}
                        {alt.reason && (
                          <p className="text-xs text-blue-700">
                            💡 {alt.reason}
                          </p>
                        )}

                        {/* 바코드 */}
                        <p className="mt-2 text-[10px] text-gray-400">
                          {alt.barcode}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 유사 제품 버튼 */}
                  <Button
                    variant="outline"
                    className="mt-3 w-full text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      const keyword = result.foodName.slice(0, 4);
                      router.push(
                        `/food/search?q=${encodeURIComponent(keyword)}`,
                      );
                    }}
                  >
                    유사 제품 더 검색하기 →
                  </Button>
                  {/* 안내 메시지 */}
                  <div className="mt-3 rounded-lg bg-blue-100 p-2 text-xs text-blue-800">
                    💡 <strong>팁:</strong> AI 추천 제품은 참고용이에요. 구매 전
                    성분표를 꼭 확인하세요!
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
