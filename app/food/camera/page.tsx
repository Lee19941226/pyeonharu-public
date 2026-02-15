"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  X,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CameraPage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 최근 확인 제품
  const [recentProducts, setRecentProducts] = useState<any[]>([]);

  useEffect(() => {
    // 최근 확인 제품 로드
    const history = localStorage.getItem("food_check_history");
    if (history) {
      const parsed = JSON.parse(history);
      setRecentProducts(parsed.slice(0, 5));
    }
  }, []);

  // ==========================================
  // 파일 업로드 (카메라 or 갤러리)
  // ==========================================
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCapturedImage(result);

      // 자동으로 QR 코드 감지 시도
      tryQRCodeDetection(result);
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // QR 코드 자동 감지
  // ==========================================
  const tryQRCodeDetection = async (imageData: string) => {
    try {
      setIsAnalyzing(true);
      toast.info("바코드 확인 중...");

      const html5QrCode = new Html5Qrcode("qr-reader-hidden");
      const result = await html5QrCode.scanFile(
        dataURLtoFile(imageData, "upload.jpg"),
        false,
      );

      // ✅ QR 코드 발견!
      toast.success("바코드 인식 성공!");
      setTimeout(() => {
        router.push(`/food/result/${result}`);
      }, 500);
    } catch {
      // ✅ QR 코드 없음 → AI 분석으로 진행
      console.log("QR 코드 없음, AI 분석으로 진행");
      setIsAnalyzing(false);
      toast.info("성분표를 분석할 준비가 되었습니다");
    }
  };

  // ==========================================
  // Data URL → File 변환
  // ==========================================
  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // ==========================================
  // AI 분석
  // ==========================================
  const analyzeImage = async () => {
    if (!capturedImage) return;

    try {
      localStorage.setItem("pendingImageAnalysis", capturedImage);
      router.push("/food/ai-result");
    } catch (error) {
      console.error(error);
      toast.error("이미지 저장 중 오류가 발생했습니다");
    }
  };

  // ==========================================
  // 재촬영
  // ==========================================
  const retake = () => {
    setCapturedImage(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // 렌더링: 촬영된 이미지 확인
  // ==========================================
  if (capturedImage) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-2xl space-y-6">
              {/* 헤더 */}
              <div className="text-center">
                <h1 className="text-2xl font-bold">이미지 확인</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  사진이 선명한지 확인하세요
                </p>
              </div>

              {/* 이미지 미리보기 */}
              <Card>
                <CardContent className="p-4">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full rounded-lg"
                  />
                </CardContent>
              </Card>

              {/* QR 감지 결과 */}
              {!isAnalyzing && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 shrink-0 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                          바코드가 없거나 인식되지 않았습니다
                        </p>
                        <p className="mt-1 text-xs text-blue-700">
                          AI가 성분표를 직접 분석합니다
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3">
                <Button onClick={retake} variant="outline" className="flex-1">
                  <Camera className="mr-2 h-4 w-4" />
                  다시 촬영
                </Button>
                <Button
                  onClick={analyzeImage}
                  className="flex-1"
                  disabled={isAnalyzing}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {isAnalyzing ? "분석 중..." : "AI 분석하기"}
                </Button>
              </div>

              {/* 촬영 가이드 */}
              <Card>
                <CardContent className="p-4">
                  <p className="mb-3 text-sm font-medium">
                    💡 더 정확한 분석을 위한 팁
                  </p>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>성분표가 선명하게 보이는지 확인</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>빛 반사가 없는지 확인</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>글자가 수평이 되도록 촬영</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* 숨겨진 QR reader */}
        <div id="qr-reader-hidden" className="hidden" />
      </div>
    );
  }

  // ==========================================
  // 렌더링: 메인 화면 (1개 버튼)
  // ==========================================
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md space-y-6">
            {/* 헤더 */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">식품 안전 확인</h1>
              <p className="mt-2 text-muted-foreground">
                식품 사진을 촬영하거나 업로드하세요
              </p>
            </div>

            {/* 메인 촬영 버튼 */}
            <Card className="border-2 border-primary shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">식품 촬영하기</h3>
                  <p className="text-sm text-muted-foreground">
                    바코드가 있으면 자동 인식, 없으면 AI가 성분표 분석
                  </p>
                </div>

                {/* 촬영 버튼 */}
                <div className="space-y-3">
                  {/* 모바일: 카메라 직접 실행 */}
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    size="lg"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    카메라 촬영
                  </Button>

                  {/* 갤러리 업로드 */}
                  <Button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("capture");
                        fileInputRef.current.click();
                      }
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <ImageIcon className="mr-2 h-5 w-5" />
                    이미지 업로드
                  </Button>
                </div>

                {/* 안내 */}
                <div className="mt-4 rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-blue-900">
                    <strong>💡 자동 처리:</strong> 바코드 → 즉시 결과 확인 /
                    성분표 → AI 분석
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 촬영 가이드 */}
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-medium">📸 이렇게 찍어주세요</p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>성분표나 바코드가 또렷하게 보이게 찍어주세요</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>빛 반사가 없는 밝은 곳에서 촬영하면 더 좋아요</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>글자가 기울지 않게 정면에서 찍어주세요</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>
                      바코드까지 함께 찍어주시면 더 빠르게 확인할 수 있어요
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 최근 확인 제품 */}
            {recentProducts.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">최근 확인</p>
                  </div>
                  <div className="space-y-2">
                    {recentProducts.map((product, idx) => (
                      <Link key={idx} href={`/food/result/${product.foodCode}`}>
                        <div className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              product.isSafe
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {product.isSafe ? "✓" : "✕"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {product.foodName}
                            </p>
                            {product.manufacturer && (
                              <p className="truncate text-xs text-muted-foreground">
                                {product.manufacturer}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.back()}
            >
              취소
            </Button>
          </div>
        </div>
      </main>

      {/* ✅ 카메라 직접 실행 (모바일) + 갤러리 (공통) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment" // ✅ 모바일에서 카메라 앱 직접 실행
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* 숨겨진 QR reader */}
      <div id="qr-reader-hidden" className="hidden" />
    </div>
  );
}
