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
  ShoppingCart,
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

  // ✅ 연속 스캔 모드
  const [continuousMode, setContinuousMode] = useState(false);
  const [scannedResults, setScannedResults] = useState<any[]>([]);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [showResultSheet, setShowResultSheet] = useState(false);

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
      if (continuousMode) {
        // 연속 스캔 모드: 결과 가져와서 하프시트 표시
        await fetchResultForContinuousMode(result);
      } else {
        // 일반 모드: 바로 결과 페이지로
        toast.success("바코드 인식 성공!");
        setTimeout(() => {
          router.push(`/food/result/${result}`);
        }, 500);
      }
    } catch {
      // ✅ QR 코드 없음 → AI 분석으로 진행
      console.log("QR 코드 없음, AI 분석으로 진행");
      setIsAnalyzing(false);

      if (!continuousMode) {
        toast.info("성분표를 분석할 준비가 되었습니다");
      }
    }
  };

  // ==========================================
  // 연속 스캔 모드: 결과 가져오기
  // ==========================================
  const fetchResultForContinuousMode = async (barcode: string) => {
    try {
      const response = await fetch(`/api/food/result?code=${barcode}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("제품 정보 조회 실패");
      }

      const data = await response.json();

      if (data.success) {
        const scanResult = {
          foodCode: barcode,
          foodName: data.result.foodName,
          manufacturer: data.result.manufacturer,
          isSafe: data.result.isSafe,
          detectedAllergens:
            data.result.detectedAllergens?.map((a: any) => a.name) || [],
          scannedAt: new Date().toISOString(),
        };

        setScannedResults((prev) => [...prev, scanResult]);
        setCurrentResult(scanResult);
        setShowResultSheet(true);
        setCapturedImage(null);
        setIsAnalyzing(false);

        toast.success("스캔 완료!");
      }
    } catch (error) {
      console.error("결과 조회 실패:", error);
      toast.error("제품 정보를 가져올 수 없습니다");
      setIsAnalyzing(false);
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
  // AI 분석 (연속 스캔 지원)
  // ==========================================
  const analyzeImage = async () => {
    if (!capturedImage) return;

    try {
      localStorage.setItem("pendingImageAnalysis", capturedImage);

      if (continuousMode) {
        await analyzeInContinuousMode();
      } else {
        router.push("/food/ai-result");
      }
    } catch (error) {
      console.error(error);
      toast.error("이미지 저장 중 오류가 발생했습니다");
    }
  };

  // ==========================================
  // 연속 스캔 모드 AI 분석
  // ==========================================
  const analyzeInContinuousMode = async () => {
    try {
      setIsAnalyzing(true);
      toast.info("AI 분석 중...");

      const imageData = localStorage.getItem("pendingImageAnalysis");
      if (!imageData) return;

      const base64Data = imageData.includes(",")
        ? imageData.split(",")[1]
        : imageData;

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
        }
      }

      // AI 분석 API 호출
      const response = await fetch("/api/food/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Data,
          userAllergens: userAllergens,
        }),
      });

      if (!response.ok) {
        throw new Error("분석 실패");
      }

      const data = await response.json();

      if (data.success) {
        const scanResult = {
          foodCode: data.foodCode || `ai-${Date.now()}`,
          foodName: data.productName || "알 수 없는 제품",
          manufacturer: data.manufacturer || "",
          isSafe: !data.hasUserAllergen,
          detectedAllergens: data.allergens || [],
          scannedAt: new Date().toISOString(),
        };

        setScannedResults((prev) => [...prev, scanResult]);
        setCurrentResult(scanResult);
        setShowResultSheet(true);
        setCapturedImage(null);
        setIsAnalyzing(false);

        toast.success("분석 완료!");
      } else {
        toast.error("분석에 실패했습니다");
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("분석 중 오류가 발생했습니다");
      setIsAnalyzing(false);
    } finally {
      localStorage.removeItem("pendingImageAnalysis");
    }
  };

  // ==========================================
  // 다음 스캔
  // ==========================================
  const handleNextScan = () => {
    setShowResultSheet(false);
    setCurrentResult(null);
    setCapturedImage(null);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    toast.success("다음 제품을 스캔하세요");
  };

  // ==========================================
  // 스캔 종료
  // ==========================================
  const handleFinishScan = () => {
    localStorage.setItem("scan_summary", JSON.stringify(scannedResults));
    router.push("/food/scan-summary");
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
  // 결과 하프시트 컴포넌트
  // ==========================================
  const ResultHalfSheet = () => {
    if (!showResultSheet || !currentResult) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowResultSheet(false)}
        />

        <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom">
          <div className="p-6">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />

            <div
              className={`mb-4 rounded-xl p-4 ${
                currentResult.isSafe
                  ? "bg-green-100 border-2 border-green-500"
                  : "bg-red-100 border-2 border-red-500"
              }`}
            >
              <div className="flex items-center gap-3">
                {currentResult.isSafe ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-red-600" />
                )}
                <div className="flex-1">
                  <h3
                    className={`text-2xl font-bold ${
                      currentResult.isSafe ? "text-green-900" : "text-red-900"
                    }`}
                  >
                    {currentResult.isSafe ? "안전해요!" : "위험해요!"}
                  </h3>
                  <p
                    className={`text-sm ${
                      currentResult.isSafe ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {currentResult.isSafe
                      ? "알레르기 성분이 없습니다"
                      : `${currentResult.detectedAllergens?.length || 0}개 알레르기 감지`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-bold">{currentResult.foodName}</h4>
              {currentResult.manufacturer && (
                <p className="text-sm text-muted-foreground">
                  {currentResult.manufacturer}
                </p>
              )}
            </div>

            {!currentResult.isSafe && currentResult.detectedAllergens && (
              <div className="mb-4 rounded-lg bg-red-50 p-3">
                <p className="mb-2 text-sm font-medium text-red-900">
                  ⚠️ 감지된 알레르기
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentResult.detectedAllergens.map(
                    (allergen: string, idx: number) => (
                      <Badge key={idx} variant="destructive">
                        {allergen}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleNextScan}
                className="flex-1"
                variant="default"
              >
                <Camera className="mr-2 h-4 w-4" />
                다음 제품 스캔
              </Button>
              <Button
                onClick={handleFinishScan}
                className="flex-1"
                variant="outline"
              >
                스캔 종료
              </Button>
            </div>

            <Button
              onClick={() =>
                router.push(`/food/result/${currentResult.foodCode}`)
              }
              variant="ghost"
              className="mt-2 w-full text-sm text-blue-600"
            >
              상세 정보 보기 →
            </Button>
          </div>
        </div>
      </>
    );
  };

  // ==========================================
  // 렌더링: 촬영된 이미지 확인
  // ==========================================
  if (capturedImage && !continuousMode) {
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
  // 렌더링: 메인 화면
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

            {/* ✅ 연속 스캔 모드 토글 */}
            <Card className="border-2 border-blue-500 bg-blue-50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">연속 스캔 모드</p>
                    <p className="text-xs text-blue-700">
                      {continuousMode ? "ON - 연속 스캔" : "OFF"}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={continuousMode}
                    onChange={(e) => {
                      setContinuousMode(e.target.checked);
                      if (e.target.checked) {
                        setScannedResults([]);
                        toast.success("연속 스캔 모드 활성화!", {
                          description: "여러 제품을 빠르게 확인하세요",
                        });
                      } else {
                        toast.info("일반 모드로 전환");
                      }
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                </label>
              </CardContent>
            </Card>

            {/* ✅ 스캔 카운터 (연속 모드일 때만) */}
            {continuousMode && scannedResults.length > 0 && (
              <Card className="border-2 border-primary bg-primary/10">
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-primary">
                    📦 {scannedResults.length}개 스캔 완료
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    안전: {scannedResults.filter((r) => r.isSafe).length}개 ·
                    위험: {scannedResults.filter((r) => !r.isSafe).length}개
                  </p>
                </CardContent>
              </Card>
            )}

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
                    카메라로 촬영
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
                    갤러리에서 선택
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
                <p className="mb-3 text-sm font-medium">📸 촬영 가이드</p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>성분표 또는 바코드가 선명하게 보이도록</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>빛 반사가 없는 곳에서</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>글자가 수평이 되도록 촬영</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>바코드가 있으면 포함해서 촬영하면 더 빠름</span>
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

      {/* 카메라 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* 숨겨진 QR reader */}
      <div id="qr-reader-hidden" className="hidden" />

      {/* 하프시트 */}
      <ResultHalfSheet />
    </div>
  );
}
