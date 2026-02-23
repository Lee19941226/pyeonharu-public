"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  HeartPulse,
  User,
  Bookmark,
  Camera,
  ImageIcon,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { resizeImageForAI } from "@/lib/utils/image-resize";

type CameraMode = "allergy" | "diet" | null;

interface MobileNavProps {
  mainTab?: "meal" | "sick";
  onMainTabChange?: (tab: "meal" | "sick") => void;
}

export function MobileNav({ mainTab, onMainTabChange }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  const [showSheet, setShowSheet] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openSheet = (mode: CameraMode) => {
    setCameraMode(mode);
    setShowSheet(true);
  };

  const handleFileSelected = async (file: File) => {
    if (!cameraMode) return;
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
            // ✅ 원본 file에서 직접 리사이즈
            const { base64: base64Data } = await resizeImageForAI(file);

            const { createClient } = await import("@/lib/supabase/client");
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

            const data = await response.json();

            if (data.success && data.foodCode) {
              const { default: nextRouter } = await import("next/navigation");
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
          } catch (aiError) {
            toast.error("분석 중 오류가 발생했습니다");
          }
        }
      } else {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/diet/analyze", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();

        if (data.success) {
          toast.success(
            `${data.entry.emoji} ${data.entry.food_name} (${data.entry.estimated_cal}kcal) 추가!`,
          );
          router.refresh();
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

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        data-tour="bottom-nav"
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-around">
          {/* 1. 식사(홈) */}
          {isHome && onMainTabChange ? (
            <button
              onClick={() => onMainTabChange("meal")}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
                mainTab === "meal" ? "text-amber-600" : "text-muted-foreground",
              )}
            >
              <UtensilsCrossed className="h-5 w-5" />
              <span className="font-medium">식사</span>
            </button>
          ) : (
            <Link
              href="/"
              className="flex flex-col items-center gap-1 px-2 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <UtensilsCrossed className="h-5 w-5" />
              <span>식사</span>
            </Link>
          )}

          {/* 2. 아파요 */}
          {isHome && onMainTabChange ? (
            <button
              onClick={() => onMainTabChange("sick")}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
                mainTab === "sick" ? "text-rose-600" : "text-muted-foreground",
              )}
            >
              <HeartPulse className="h-5 w-5" />
              <span className="font-medium">아파요</span>
            </button>
          ) : (
            <Link
              href="/"
              className="flex flex-col items-center gap-1 px-2 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <HeartPulse className="h-5 w-5" />
              <span>아파요</span>
            </Link>
          )}

          {/* 3. 안전확인 카메라 (중앙 왼쪽) */}
          <button
            onClick={() => openSheet("allergy")}
            disabled={isProcessing}
            className={cn(
              "relative -mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
              isProcessing && cameraMode === "allergy"
                ? "bg-primary/70 text-primary-foreground"
                : pathname.startsWith("/food")
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/90 text-primary-foreground",
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

          {/* 4. 식단관리 카메라 (중앙 오른쪽) */}
          <button
            onClick={() => openSheet("diet")}
            disabled={isProcessing}
            className={cn(
              "relative -mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
              isProcessing && cameraMode === "diet"
                ? "bg-orange-300 text-white"
                : pathname.startsWith("/diet")
                  ? "bg-orange-500 text-white"
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

          {/* 5. 즐겨찾기 */}
          <Link
            href="/bookmarks"
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
              pathname.startsWith("/bookmarks")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Bookmark className="h-5 w-5" />
            <span>즐겨찾기</span>
          </Link>

          {/* 6. 마이페이지 */}
          <Link
            href="/mypage"
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 text-[11px] transition-colors",
              pathname.startsWith("/mypage")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <User className="h-5 w-5" />
            <span>MY</span>
          </Link>
        </div>

        {/* 카메라 버튼 아래 라벨 */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-14 pointer-events-none">
          <span className="text-[9px] text-muted-foreground">
            {isProcessing && cameraMode === "allergy"
              ? "분석중..."
              : "안전확인"}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {isProcessing && cameraMode === "diet" ? "분석중..." : "식단관리"}
          </span>
        </div>
      </nav>

      {/* 바코드 스캔용 hidden div */}
      <div id="qr-reader-nav-hidden" className="hidden" />

      {/* ── 카메라/앨범 선택 바텀시트 ── */}
      {showSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:hidden"
          onClick={() => setShowSheet(false)}
        >
          <div
            className="w-full max-w-md animate-in slide-in-from-bottom duration-200 rounded-t-2xl bg-background p-5 space-y-3"
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />

            <div className="text-center">
              <h3 className="text-base font-bold">
                {cameraMode === "allergy"
                  ? "🛡️ 알레르기 안전 확인"
                  : "🍽️ 먹은 음식 기록"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cameraMode === "allergy"
                  ? "바코드 또는 성분표를 촬영/선택하세요"
                  : "음식 사진을 촬영/선택하면 자동으로 등록돼요"}
              </p>
            </div>

            <div className="space-y-2">
              {/* 카메라 촬영 */}
              <label className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">카메라로 촬영</p>
                  <p className="text-xs text-muted-foreground">
                    {cameraMode === "allergy"
                      ? "바코드·성분표를 바로 촬영"
                      : "음식을 바로 촬영"}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                    e.target.value = "";
                  }}
                />
              </label>

              {/* 앨범에서 선택 */}
              <label className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/10">
                  <ImageIcon className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">앨범에서 선택</p>
                  <p className="text-xs text-muted-foreground">
                    {cameraMode === "allergy"
                      ? "저장된 바코드·성분표 이미지 선택"
                      : "저장된 음식 사진 선택"}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <button
              onClick={() => setShowSheet(false)}
              className="flex w-full items-center justify-center rounded-xl border p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </>
  );
}
