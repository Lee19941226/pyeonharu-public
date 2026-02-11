"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera as CameraIcon,
  Upload,
  RotateCw,
  X,
  Monitor,
  Smartphone,
  QrCode,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDevice } from "@/lib/hooks/use-device";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";

export default function CameraPage() {
  const { isMobile, hasCamera } = useDevice();
  const router = useRouter();

  // 모드: select, camera, upload, qr
  const [mode, setMode] = useState<"select" | "camera" | "upload" | "qr">(
    "select",
  );

  // 카메라 관련
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [isDragging, setIsDragging] = useState(false);

  // 최근 확인 제품 (localStorage에서 가져오기)
  const [recentProducts, setRecentProducts] = useState<any[]>([]);

  useEffect(() => {
    // 최근 확인 제품 로드
    const history = localStorage.getItem("food_check_history");
    if (history) {
      const parsed = JSON.parse(history);
      setRecentProducts(parsed.slice(0, 3)); // 최근 3개만
    }

    // 자동 모드 설정
    if (isMobile && hasCamera) {
      setMode("select");
    } else {
      setMode("upload");
    }
  }, [isMobile, hasCamera]);

  // 카메라 시작
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setMode("camera");
    } catch (error) {
      console.error("카메라 접근 오류:", error);
      toast.error("카메라에 접근할 수 없습니다");
      setMode("upload");
    }
  };

  // QR 스캐너 시작
  const startQRScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      qrReaderRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR 코드 인식 성공
          html5QrCode.stop();
          handleQRCodeDetected(decodedText);
        },
        (errorMessage) => {
          // 스캔 중 (에러 무시)
        },
      );
      setMode("qr");
    } catch (error) {
      console.error("QR 스캐너 시작 실패:", error);
      toast.error("QR 스캐너를 시작할 수 없습니다");
    }
  };

  // QR 코드 감지 처리
  const handleQRCodeDetected = (barcode: string) => {
    toast.success("바코드 인식 성공!");
    router.push(`/food/result/${barcode}`);
  };

  // 사진 촬영
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageData);
      stream?.getTracks().forEach((track) => track.stop());
    }
  };

  // 파일 업로드
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

      // QR 코드 자동 감지 시도
      tryQRCodeDetection(result);
    };
    reader.readAsDataURL(file);
  };

  // 업로드한 이미지에서 QR 코드 감지
  const tryQRCodeDetection = async (imageData: string) => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-upload");
      const result = await html5QrCode.scanFile(
        dataURLtoFile(imageData, "upload.jpg"),
        false,
      );

      // QR 코드 발견!
      toast.success("바코드 자동 인식!");
      setTimeout(() => {
        router.push(`/food/result/${result}`);
      }, 500);
    } catch {
      // QR 코드 없음 - AI 분석으로 진행
      console.log("QR 코드 없음, AI 분석 진행");
    }
  };

  // Data URL을 File로 변환
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

  // 드래그 앤 드롭
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImage(result);
        tryQRCodeDetection(result);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("이미지 파일만 업로드 가능합니다");
    }
  };

  //이미지 분석
  const analyzeImage = async () => {
    if (!capturedImage) return;

    try {
      // ✅ localStorage에 이미지 저장
      localStorage.setItem("pendingImageAnalysis", capturedImage);

      // ✅ 즉시 AI 결과 페이지로 이동
      router.push("/food/ai-result");
    } catch (error) {
      console.error(error);
      toast.error("이미지 저장 중 오류가 발생했습니다");
    }
  };
  // 재촬영/재업로드
  const retake = () => {
    setCapturedImage(null);
    if (mode === "camera") {
      startCamera();
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 정리
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (qrReaderRef.current) {
        qrReaderRef.current.stop().catch(console.error);
      }
    };
  }, [stream]);

  // ==============================================
  // 렌더링: 모드 선택 화면
  // ==============================================
  if (mode === "select") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-md space-y-6">
              {/* 헤더 */}
              <div className="text-center">
                <h1 className="text-2xl font-bold">식품 확인 방법</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  편리한 방법을 선택하세요
                </p>
              </div>

              {/* 방법 선택 카드 */}
              <div className="space-y-3">
                {/* QR 코드 스캔 */}
                <Card
                  className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-md"
                  onClick={startQRScanner}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <QrCode className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-semibold">QR 코드 스캔</p>
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="mr-1 h-3 w-3" />
                          가장 빠름
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        바코드를 바로 인식합니다
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 카메라 촬영 */}
                <Card
                  className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-md"
                  onClick={startCamera}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <CameraIcon className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="mb-1 font-semibold">라벨 촬영</p>
                      <p className="text-sm text-muted-foreground">
                        성분표 사진을 AI가 분석
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 이미지 업로드 */}
                <Card
                  className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Upload className="h-7 w-7 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="mb-1 font-semibold">갤러리에서 선택</p>
                      <p className="text-sm text-muted-foreground">
                        저장된 사진 불러오기
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* 최근 확인 제품 */}
              {recentProducts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>최근 확인한 제품</span>
                  </div>
                  {recentProducts.map((product, idx) => (
                    <Link key={idx} href={`/food/result/${product.foodCode}`}>
                      <Card className="cursor-pointer transition-all hover:shadow-sm">
                        <CardContent className="flex items-center gap-3 p-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              product.isSafe
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {product.isSafe ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium">
                              {product.foodName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(product.checkedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {/* 촬영 가이드 */}
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                    <p className="font-medium text-amber-900">촬영 팁</p>
                  </div>
                  <ul className="space-y-1.5 text-sm text-amber-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>성분표가 선명하게 보이도록</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>빛 반사가 없는 곳에서</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>글자가 수평이 되도록</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

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
      </div>
    );
  }

  // ==============================================
  // 렌더링: QR 스캐너
  // ==============================================
  if (mode === "qr") {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <div className="relative flex-1">
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                qrReaderRef.current?.stop();
                router.back();
              }}
              className="text-white"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
              <span className="text-sm text-white">QR 코드 스캔</span>
            </div>
          </div>

          <div id="qr-reader" className="h-full w-full" />

          <div className="absolute bottom-8 left-0 right-0 px-4">
            <Card className="bg-black/70 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <QrCode className="mx-auto mb-2 h-8 w-8 text-white" />
                <p className="text-sm font-medium text-white">
                  바코드를 스캔 영역에 맞춰주세요
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // 렌더링: 카메라 모드
  // ==============================================
  if (mode === "camera" && !capturedImage) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <div className="relative flex-1">
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stream?.getTracks().forEach((track) => track.stop());
                router.back();
              }}
              className="text-white"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
              <Smartphone className="h-4 w-4 text-white" />
              <span className="text-sm text-white">촬영 모드</span>
            </div>
          </div>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-3/4 rounded-2xl border-4 border-dashed border-white/60 shadow-2xl">
              <p className="mt-6 text-center text-base font-medium text-white drop-shadow-lg">
                성분표를 이 안에 맞춰주세요
              </p>
            </div>
          </div>

          <div className="absolute bottom-40 left-0 right-0 px-4">
            <div className="rounded-2xl bg-black/80 p-4 text-center backdrop-blur-md">
              <p className="mb-3 font-semibold text-white">📸 촬영 가이드</p>
              <div className="grid grid-cols-3 gap-3 text-sm text-white/90">
                <div className="flex flex-col items-center">
                  <CheckCircle className="mb-1 h-5 w-5" />
                  <span>선명하게</span>
                </div>
                <div className="flex flex-col items-center">
                  <CheckCircle className="mb-1 h-5 w-5" />
                  <span>반사 없이</span>
                </div>
                <div className="flex flex-col items-center">
                  <CheckCircle className="mb-1 h-5 w-5" />
                  <span>수평으로</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 px-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
              onClick={() => setMode("upload")}
            >
              <Upload className="h-6 w-6" />
            </Button>

            <Button
              onClick={capturePhoto}
              size="icon"
              className="h-20 w-20 rounded-full border-4 border-white bg-primary shadow-2xl hover:scale-105"
            >
              <CameraIcon className="h-10 w-10" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
              onClick={() => {
                stream?.getTracks().forEach((track) => track.stop());
                setFacingMode((prev) =>
                  prev === "user" ? "environment" : "user",
                );
                setTimeout(startCamera, 100);
              }}
            >
              <RotateCw className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // 렌더링: 업로드 모드 (데스크탑 중심)
  // ==============================================
  if (mode === "upload" && !capturedImage) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* 헤더 */}
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Monitor className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">이미지 업로드</h1>
                <p className="mt-2 text-muted-foreground">
                  식품 라벨 사진을 업로드하세요
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* 메인: 드래그 앤 드롭 영역 */}
                <div className="md:col-span-2">
                  <Card
                    className={`border-2 border-dashed transition-all ${
                      isDragging
                        ? "border-primary bg-primary/5 shadow-lg"
                        : "border-muted-foreground/25 hover:border-primary"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                        <Upload className="h-10 w-10 text-primary" />
                      </div>
                      <p className="mb-2 text-lg font-semibold">
                        파일을 드래그하거나 클릭하세요
                      </p>
                      <p className="mb-6 text-sm text-muted-foreground">
                        JPG, PNG, WEBP 지원 • 최대 10MB
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <div className="flex gap-3">
                        <Button onClick={() => fileInputRef.current?.click()}>
                          <Upload className="mr-2 h-4 w-4" />
                          파일 선택
                        </Button>
                        {isMobile && hasCamera && (
                          <Button variant="outline" onClick={startCamera}>
                            <CameraIcon className="mr-2 h-4 w-4" />
                            카메라
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 예시 이미지 */}
                  <Card className="mt-4">
                    <CardContent className="p-4">
                      <p className="mb-3 text-sm font-medium">
                        💡 이런 사진이 좋아요
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="aspect-square rounded-lg bg-green-100 p-2">
                          <div className="flex h-full items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <p className="mt-1 text-center text-xs text-green-700">
                            선명한 사진
                          </p>
                        </div>
                        <div className="aspect-square rounded-lg bg-green-100 p-2">
                          <div className="flex h-full items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <p className="mt-1 text-center text-xs text-green-700">
                            정면 촬영
                          </p>
                        </div>
                        <div className="aspect-square rounded-lg bg-green-100 p-2">
                          <div className="flex h-full items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <p className="mt-1 text-center text-xs text-green-700">
                            밝은 곳
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 사이드: 가이드 & 최근 제품 */}
                <div className="space-y-4">
                  {/* 사용 가이드 */}
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-600" />
                        <p className="font-semibold text-amber-900">
                          촬영 가이드
                        </p>
                      </div>
                      <ul className="space-y-2 text-sm text-amber-800">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>성분표 전체가 보이도록</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>초점이 맞고 선명하게</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>빛 반사 없이</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>QR/바코드 포함 시 더 빠름</span>
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
                            <Link
                              key={idx}
                              href={`/food/result/${product.foodCode}`}
                            >
                              <div className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted">
                                <div
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                    product.isSafe
                                      ? "bg-green-100 text-green-600"
                                      : "bg-red-100 text-red-600"
                                  }`}
                                >
                                  {product.isSafe ? "✓" : "✕"}
                                </div>
                                <p className="truncate text-sm">
                                  {product.foodName}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* QR 스캔 버튼 */}
                  {isMobile && hasCamera && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={startQRScanner}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      QR 코드 스캔
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==============================================
  // 렌더링: 촬영/업로드된 이미지 확인
  // ==============================================
  if (capturedImage) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold">이미지 확인</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  사진이 선명한지 확인하세요
                </p>
              </div>

              <Card>
                <CardContent className="p-4">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full rounded-lg"
                  />
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button onClick={retake} variant="outline" className="flex-1">
                  다시 {mode === "camera" ? "촬영" : "업로드"}
                </Button>
                <Button onClick={analyzeImage} className="flex-1">
                  <Zap className="mr-2 h-4 w-4" />
                  AI 분석하기
                </Button>
              </div>

              {/* QR 코드 숨겨진 reader */}
              <div id="qr-reader-upload" className="hidden" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
