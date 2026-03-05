"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Camera,
  ImageIcon,
  ShieldCheck,
  Loader2,
  ClipboardList,
  Sparkles,
  X,
  Store,
  Flame,
  Youtube,
  ChevronDown,
  ChevronUp,
  BarChart3,
  UtensilsCrossed,
  AlertTriangle,
  Bike,
  Salad,
  Scale,
  Shuffle,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { resizeImageForAI } from "@/lib/utils/image-resize";
import { createClient } from "@/lib/supabase/client";
import { getDeliveryLinks, openDeliveryApp, isMobileDevice } from "@/lib/utils/delivery";
import { useBackHandler } from "@/lib/hooks/use-back-handler";
import { ensureKakaoReady } from "@/lib/utils/kakao-share";

type CameraMode = "allergy" | "diet" | null;

// ─── 메뉴 추천 타입 ───
interface Reasoning { taste: string; calorie: string; nutrition: string; variety: string }
interface Recommendation { name: string; emoji: string; estimatedCal: number; reasoning: Reasoning; deliveryKeyword: string }
interface Analysis { calorieSituation: string; weeklyPattern: string; nutritionGap: string }
interface MealRecommendData {
  mealType: string; analysis: Analysis; recommendations: Recommendation[]; nutritionTip: string;
  context: { todayCalories: number; targetCalories: number; remainingCalories: number; allergens: string[]; todayMeals: string[]; weeklyAvgCal: number; weeklyOverDays: number; weeklyTopFoods: string[] }
}


export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  // ─── 카메라 상태 ───
  const [showSheet, setShowSheet] = useState(false);
  useBackHandler(showSheet, () => setShowSheet(false));
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ─── 메뉴 추천 모달 상태 ───
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  useBackHandler(showRecommendModal, () => setShowRecommendModal(false));
  const [recommendData, setRecommendData] = useState<MealRecommendData | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [todayCal, setTodayCal] = useState(0);
  const [bmr, setBmr] = useState(0);

  const openSheet = (mode: CameraMode) => {
    setCameraMode(mode);
    setShowSheet(true);
  };

  // ─── 카메라 파일 처리 (기존 로직 100% 유지) ───
  const MAX_IMAGE_SIZE = 7 * 1024 * 1024; // 7MB

  const handleFileSelected = async (file: File) => {
    if (!cameraMode) return;

    // ✅ 이미지 크기 사전 검증
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.");
      return;
    }

    setShowSheet(false);
    setIsProcessing(true);

    try {
      if (cameraMode === "allergy") {
        toast.info("사진 분석 중...");

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        try {
          const { Html5Qrcode } = await import("html5-qrcode");
          const html5QrCode = new Html5Qrcode("qr-reader-nav-hidden");
          const arr = base64.split(",");
          const mime = arr[0].match(/:(.*?);/)![1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          const imageFile = new File([u8arr], "scan.jpg", { type: mime });

          const barcode = await html5QrCode.scanFile(imageFile, false);
          toast.success("바코드 인식 성공!");
          router.push(`/food/result/${barcode}`);
        } catch {
          toast.info("AI가 성분표를 분석 중...");

          try {
            const { base64: base64Data } = await resizeImageForAI(file);

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
              if (data) userAllergens = data.map((item) => item.allergen_name);
            }

            const response = await fetch("/api/food/analyze-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageBase64: base64Data, userAllergens }),
            });

            // ✅ 413 이미지 크기 초과 처리
            if (response.status === 413) {
              toast.error("이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.");
              return;
            }

            const data = await response.json();

            if (data.success && data.foodCode) {
              sessionStorage.setItem(
                `ai_result_${data.foodCode}`,
                JSON.stringify({
                  foodCode: data.foodCode,
                  productName: data.productName,
                  manufacturer: data.manufacturer,
                  weight: data.weight,
                  allergens: data.allergens,
                  hasUserAllergen: data.hasUserAllergen,
                  matchedUserAllergens: data.matchedUserAllergens || [],
                  ingredients: data.ingredients || [],
                  rawMaterials: data.rawMaterials || "",
                  nutritionInfo: data.nutritionInfo || null,
                  dataSource: data.dataSource || "ai",
                }),
              );
              toast.success("분석 완료!");
              router.push(`/food/result/${data.foodCode}`);
            } else {
              toast.error(data.error || "분석에 실패했습니다");
            }
          } catch {
            toast.error("분석 중 오류가 발생했습니다");
          }
        }
      } else {
        // 식단 분석 모드
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/diet/analyze", {
          method: "POST",
          body: fd,
        });

        // ✅ 413 이미지 크기 초과 처리
        if (res.status === 413) {
          toast.error("이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.");
          return;
        }

        const data = await res.json();

        if (data.success) {
          toast.success(
            `${data.entry.emoji} ${data.entry.food_name} (${data.entry.estimated_cal}kcal) 추가!`,
          );
          window.dispatchEvent(new CustomEvent("diet-entry-added"));
          if (pathname !== "/diet" && !pathname.startsWith("/diet")) {
            router.push(`/diet?refresh=${Date.now()}`);
          }
        } else {
          toast.error(data.error || "분석에 실패했습니다");
        }
      }
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
    } finally {
      setIsProcessing(false);
      setCameraMode(null);
    }
  };

  // ─── 메뉴 추천 API 호출 ───
  const fetchRecommend = useCallback(async () => {
    setRecommendLoading(true);
    setRecommendError("");
    setExpandedIdx(null);
    setShowRecommendModal(true);
    try {
      const res = await fetch("/api/meal-recommend");
      if (!res.ok) throw new Error((await res.json()).error || "추천 실패");
      const result = await res.json();
      setRecommendData(result);
      if (result.context) {
        setTodayCal(result.context.todayCalories);
        setBmr(result.context.targetCalories);
      }
    } catch (err: any) {
      setRecommendError(err.message);
    } finally {
      setRecommendLoading(false);
    }
  }, []);

  // ─── 카카오 공유 ───
  const shareRecommend = async () => {
    if (!recommendData || !recommendData.recommendations.length) return;
    if (!(await ensureKakaoReady())) { toast.error("카카오톡 공유를 사용할 수 없습니다"); return; }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      toast.error("카카오톡 공유는 실제 도메인에서만 작동합니다"); return;
    }
    const shareUrl = `${window.location.origin}/food`;
    const mealLabel = recommendData.mealType === "아침" ? "🌅 아침" : recommendData.mealType === "점심" ? "☀️ 점심" : recommendData.mealType === "간식" ? "🍪 간식" : "🌇 저녁";
    const menuList = recommendData.recommendations.slice(0, 5).map(r => `${r.emoji} ${r.name} (${r.estimatedCal}kcal)`).join(", ");
    let description = menuList;
    if (recommendData.analysis?.calorieSituation) description += ` | ${recommendData.analysis.calorieSituation}`;
    if (description.length > 150) description = description.slice(0, 147) + "...";
    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: { title: `${mealLabel} AI 맞춤 메뉴 추천`, description, imageUrl: `${window.location.origin}/icons/icon-512.png`, imageWidth: 512, imageHeight: 512, link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
        buttons: [{ title: "편하루에서 메뉴 추천받기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      });
    } catch (err) { console.error("[카카오 공유 실패]", err); toast.error("공유에 실패했습니다"); }
  };

  // ─── 유틸 ───
  const remainingCal = bmr > 0 ? Math.max(bmr - todayCal, 0) : 0;
  const calPercent = bmr > 0 ? Math.min((todayCal / bmr) * 100, 100) : 0;
  const isOver = bmr > 0 && todayCal > bmr;

  const youtubeUrl = (name: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " 레시피")}`;

  const reasonMeta: Record<keyof Reasoning, { icon: typeof Flame; label: string; color: string }> = {
    taste: { icon: UtensilsCrossed, label: "입맛", color: "text-amber-600 bg-amber-50" },
    calorie: { icon: Scale, label: "칼로리", color: "text-red-600 bg-red-50" },
    nutrition: { icon: Salad, label: "영양", color: "text-green-600 bg-green-50" },
    variety: { icon: Shuffle, label: "다양성", color: "text-blue-600 bg-blue-50" },
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        data-tour="bottom-nav"
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          {/* 1. 안전확인 카메라 */}
          <button
            onClick={() => openSheet("allergy")}
            disabled={isProcessing}
            className={cn(
              "relative -mt-4 flex h-[56px] w-[56px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
              isProcessing && cameraMode === "allergy"
                ? "bg-primary/70 text-primary-foreground"
                : "bg-primary text-primary-foreground",
            )}
            aria-label="식품 안전 확인"
          >
            {isProcessing && cameraMode === "allergy" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow-sm">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
          </button>

          {/* 2. 메뉴 추천 */}
          <button
            onClick={fetchRecommend}
            disabled={recommendLoading}
            className={cn(
              "relative -mt-4 flex h-[56px] w-[56px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
              recommendLoading
                ? "bg-violet-400 text-white"
                : "bg-violet-500 text-white",
            )}
            aria-label="AI 메뉴 추천"
          >
            {recommendLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ClipboardList className="h-6 w-6" />
            )}
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow-sm">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </button>

          {/* 3. 식단관리 카메라 */}
          <button
            onClick={() => openSheet("diet")}
            disabled={isProcessing}
            className={cn(
              "relative -mt-4 flex h-[56px] w-[56px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
              isProcessing && cameraMode === "diet"
                ? "bg-orange-300 text-white"
                : "bg-orange-400 text-white",
            )}
            aria-label="식단 관리 촬영"
          >
            {isProcessing && cameraMode === "diet" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-sm text-[8px] font-bold text-white">
              🍽️
            </div>
          </button>
        </div>

        {/* 버튼 아래 라벨 */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-around max-w-md mx-auto px-4 pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <span className="text-[9px] text-muted-foreground w-14 text-center">
            {isProcessing && cameraMode === "allergy" ? "분석중..." : "안전확인"}
          </span>
          <span className="text-[9px] text-muted-foreground w-14 text-center">
            {recommendLoading ? "추천중..." : "메뉴추천"}
          </span>
          <span className="text-[9px] text-muted-foreground w-14 text-center">
            {isProcessing && cameraMode === "diet" ? "분석중..." : "식단관리"}
          </span>
        </div>
      </nav>

      {/* 바코드 스캔용 hidden div */}
      <div id="qr-reader-nav-hidden" className="hidden" />

      {/* ═══ 카메라/앨범 선택 바텀시트 ═══ */}
      {showSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:hidden"
          onClick={() => setShowSheet(false)}
        >
          <div
            className="w-full max-w-md animate-in slide-in-from-bottom duration-200 rounded-t-2xl bg-background p-5 space-y-3"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />
            <div className="text-center">
              <h3 className="text-base font-bold">
                {cameraMode === "allergy" ? "🛡️ 알레르기 안전 확인" : "🍽️ 먹은 음식 기록"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cameraMode === "allergy"
                  ? "바코드 또는 성분표를 촬영/선택하세요"
                  : "음식 사진을 촬영/선택하면 자동으로 등록돼요"}
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">카메라로 촬영</p>
                  <p className="text-xs text-muted-foreground">
                    {cameraMode === "allergy" ? "바코드·성분표를 바로 촬영" : "음식을 바로 촬영"}
                  </p>
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = "" }} />
              </label>
              <label className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/10">
                  <ImageIcon className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">앨범에서 선택</p>
                  <p className="text-xs text-muted-foreground">
                    {cameraMode === "allergy" ? "저장된 바코드·성분표 이미지 선택" : "저장된 음식 사진 선택"}
                  </p>
                </div>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = "" }} />
              </label>
            </div>
            <button onClick={() => setShowSheet(false)}
              className="flex w-full items-center justify-center rounded-xl border p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
              취소
            </button>
          </div>
        </div>
      )}

      {/* ═══ AI 메뉴 추천 모달 (풀 리포트) ═══ */}
      {showRecommendModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setShowRecommendModal(false)}>
          <div
            className="w-full max-w-md max-h-[85vh] animate-in slide-in-from-bottom duration-200 rounded-t-2xl bg-background overflow-hidden flex flex-col"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-violet-50 to-amber-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">AI 맞춤 메뉴 추천</h3>
                  <p className="text-[10px] text-muted-foreground">알레르기·식단·영양 분석</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {recommendData && !recommendLoading && (
                  <>
                    <button onClick={shareRecommend} className="flex items-center justify-center rounded-lg border border-violet-300 px-2 py-1.5 text-violet-500 hover:bg-violet-50 transition-colors" title="카카오톡으로 공유">
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={fetchRecommend} className="flex items-center gap-1 rounded-lg bg-violet-500 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-violet-600 transition-colors">
                      <Sparkles className="h-3 w-3" />다시 추천
                    </button>
                  </>
                )}
                <button onClick={() => setShowRecommendModal(false)} className="ml-1 p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* 모달 컨텐츠 (스크롤) */}
            <div className="flex-1 overflow-y-auto">
              {bmr > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
                  <Flame className="h-3 w-3 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px]">
                      <span>오늘 {todayCal.toLocaleString()}kcal</span>
                      <span className={`font-medium ${isOver ? "text-red-600" : ""}`}>
                        {isOver ? `${(todayCal - bmr).toLocaleString()}kcal 초과` : `잔여 ${remainingCal.toLocaleString()}kcal`}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isOver ? "bg-red-400" : "bg-gradient-to-r from-green-400 to-amber-400"}`} style={{ width: `${Math.min(calPercent, 100)}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {recommendLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                  <p className="text-xs text-muted-foreground">식단·영양 패턴 분석 중...</p>
                </div>
              )}

              {recommendError && !recommendLoading && (
                <div className="flex items-center gap-2 p-4">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">{recommendError}</p>
                </div>
              )}

              {recommendData && !recommendLoading && (
                <div className="p-3 space-y-2.5">
                  {recommendData.analysis && (
                    <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
                      <p className="text-[11px] font-bold flex items-center gap-1">
                        <BarChart3 className="h-3.5 w-3.5 text-violet-500" /> 식단 분석
                      </p>
                      {recommendData.analysis.calorieSituation && (
                        <div className="flex items-start gap-1.5">
                          <Scale className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-muted-foreground">{recommendData.analysis.calorieSituation}</p>
                        </div>
                      )}
                      {recommendData.analysis.weeklyPattern && (
                        <div className="flex items-start gap-1.5">
                          <BarChart3 className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-muted-foreground">{recommendData.analysis.weeklyPattern}</p>
                        </div>
                      )}
                      {recommendData.analysis.nutritionGap && (
                        <div className="flex items-start gap-1.5">
                          <Salad className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-muted-foreground">{recommendData.analysis.nutritionGap}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {recommendData.recommendations.map((rec, i) => {
                    const isExpanded = expandedIdx === i;
                    return (
                      <div key={i} className="rounded-xl border bg-background overflow-hidden">
                        <button
                          onClick={() => setExpandedIdx(isExpanded ? null : i)}
                          className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/30 transition-colors text-left"
                        >
                          <span className="text-xl">{rec.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{rec.name}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {rec.reasoning?.taste || rec.reasoning?.calorie || ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-medium text-orange-600">{rec.estimatedCal}kcal</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t px-2.5 pb-2.5 pt-2 space-y-2.5">
                            {rec.reasoning && (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold">📋 추천 근거</p>
                                {(Object.entries(rec.reasoning) as [keyof Reasoning, string][]).map(([key, text]) => {
                                  if (!text) return null;
                                  const meta = reasonMeta[key];
                                  const Icon = meta.icon;
                                  return (
                                    <div key={key} className="flex items-start gap-1.5">
                                      <span className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-medium shrink-0 ${meta.color}`}>
                                        <Icon className="h-2.5 w-2.5" />{meta.label}
                                      </span>
                                      <p className="text-[10px] text-muted-foreground leading-relaxed">{text}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="border-t" />

                            {/* ✅ 배달 주문 — 앱 딥링크 (mobile-nav는 모바일 전용이므로 항상 앱 호출) */}
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                <Store className="h-3 w-3" /> 배달 주문
                              </p>
                              <div className="flex gap-1.5">
                                {getDeliveryLinks(rec.deliveryKeyword).map((app) => (
                                  <button
                                    key={app.name}
                                    onClick={() => openDeliveryApp(app)}
                                    className={`flex-1 flex items-center justify-center gap-0.5 rounded-lg ${app.color} py-2 text-[10px] font-bold text-white hover:opacity-90 transition-opacity active:scale-95`}
                                  >
                                    <Bike className="h-3 w-3" />{app.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <a href={youtubeUrl(rec.name)} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#FF0000] py-2 text-[11px] font-bold text-white hover:bg-[#CC0000] transition-colors">
                              <Youtube className="h-4 w-4" />직접 만들기 — 유튜브 레시피
                            </a>
                            {recommendData.context.allergens.length > 0 && (
                              <div className="flex items-start gap-1 rounded-lg bg-green-50 border border-green-200 p-1.5">
                                <AlertTriangle className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                                <p className="text-[9px] text-green-700">
                                  <b>{recommendData.context.allergens.join(", ")}</b> 알레르기를 고려한 추천입니다.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {recommendData.nutritionTip && (
                    <div className="rounded-lg bg-blue-50/50 border border-blue-100 px-2.5 py-2">
                      <p className="text-[10px] text-blue-700">💡 {recommendData.nutritionTip}</p>
                    </div>
                  )}

                  <p className="text-[8px] text-center text-muted-foreground/60">
                    AI 추천은 참고용입니다. 알레르기 반응 우려 시 성분을 직접 확인하세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
