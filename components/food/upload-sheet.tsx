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

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadSheet({ open, onOpenChange }: UploadSheetProps) {
  const router = useRouter();
  const { isMobile } = useDevice();

  // ==========================================
  // 파일 업로드 (AI 분석)
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
      toast.info("이미지 분석 중...");

      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/food/analyze-image", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success && data.analysisId) {
          toast.success("분석 완료!");
          router.push(`/food/result/${data.analysisId}`);
        } else {
          toast.error(data.error || "분석에 실패했습니다");
        }
      } catch (error) {
        console.error("이미지 분석 오류:", error);
        toast.error("이미지 분석 중 오류가 발생했습니다");
      }
    };

    input.click();
  };

  // ==========================================
  // 바코드 스캔 (모바일 = 연속, 데스크탑 = 웹캠)
  // ==========================================
  const handleBarcodeClick = () => {
    onOpenChange(false);
    if (isMobile) {
      router.push("/food/camera?mode=continuous");
    } else {
      router.push("/food/camera?mode=webcam");
    }
  };

  // ==========================================
  // 렌더: 메인 선택 화면
  // ==========================================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>식품 안전 확인</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {/* 사진/갤러리 */}
          <button
            onClick={handleFileUpload}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-card p-4 transition-colors hover:border-primary hover:bg-muted/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              {isMobile ? (
                <Camera className="h-6 w-6 text-green-600" />
              ) : (
                <Upload className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">
                {isMobile ? "사진 촬영 / 갤러리" : "파일 업로드"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isMobile
                  ? "카메라로 촬영하거나 갤러리에서 선택"
                  : "성분표 사진을 업로드하면 AI가 분석"}
              </p>
            </div>
          </button>

          {/* 바코드 스캔 */}
          <button
            onClick={handleBarcodeClick}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-primary bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <Scan className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-primary">바코드 스캔</p>
              <p className="text-sm text-muted-foreground">
                {isMobile
                  ? "여러 제품을 연속으로 빠르게 확인"
                  : "웹캠으로 실시간 바코드 인식"}
              </p>
            </div>
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-900">
            💡 <strong>바코드 스캔:</strong>{" "}
            {isMobile
              ? "장보기에 최적! 여러 제품을 계속 스캔하고 위험 제품만 필터링"
              : "가장 빠르고 정확한 방법"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
