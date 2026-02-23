"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Upload, Scan } from "lucide-react";
import { toast } from "sonner";
import { useDevice } from "@/lib/hooks/use-device";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";
import { resizeImageForAI } from "@/lib/utils/image-resize";
import { saveAiResult } from "@/lib/utils/ai-result-storage";

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadSheet({ open, onOpenChange }: UploadSheetProps) {
  const router = useRouter();
  const { isMobile } = useDevice();

  // ==========================================
  // 파일 업로드 (AI 분석만)
  // ==========================================
  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (isMobile) {
      input.setAttribute("capture", "environment");
    }

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      onOpenChange(false);

      // 먼저 바코드 감지 시도
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;

        try {
          toast.info("바코드 확인 중...");

          const html5QrCode = new Html5Qrcode("qr-reader-hidden");

          // base64 → File 변환
          const arr = imageData.split(",");
          const mime = arr[0].match(/:(.*?);/)![1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const imageFile = new File([u8arr], "scan.jpg", { type: mime });

          // 바코드 스캔 시도
          const barcode = await html5QrCode.scanFile(imageFile, false);

          // ✅ 바코드 발견!
          toast.success("바코드 인식 성공!");
          router.push(`/food/result/${barcode}`);
        } catch (error) {
          // ❌ 바코드 없음 → AI 분석
          console.log("바코드 없음, AI 분석 시작");
          toast.info("AI가 성분표를 분석 중...");

          try {
            // ✅ 원본 file에서 직접 리사이즈
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

            const data = await response.json();

            if (data.success && data.foodCode) {
              saveAiResult(data.foodCode, {
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
              });
              toast.success("분석 완료!");
              router.push(`/food/result/${data.foodCode}`);
            } else {
              toast.error(data.error || "분석에 실패했습니다");
            }
          } catch (aiError) {
            console.error("AI 분석 오류:", aiError);
            toast.error("분석 중 오류가 발생했습니다");
          }
        }
      };

      reader.readAsDataURL(file);
    };

    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>식품 안전 확인</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {/* 통합된 업로드 버튼 */}
          <button
            onClick={handleFileUpload}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-primary bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              {isMobile ? (
                <Camera className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-primary">
                {isMobile ? "사진 촬영하기" : "이미지 업로드"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isMobile
                  ? "바코드 또는 성분표를 촬영하세요"
                  : "바코드 또는 성분표 스크린샷을 업로드하세요"}
              </p>
            </div>
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-900">
            💡 <strong>자동 처리:</strong> 바코드가 있으면 즉시 인식, 없으면
            AI가 성분표를 분석합니다
          </p>
          {!isMobile && (
            <p className="mt-2 text-xs text-blue-700">
              <strong>팁:</strong> Windows + Shift + S 로 QR 코드 부분만
              캡처하세요
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
