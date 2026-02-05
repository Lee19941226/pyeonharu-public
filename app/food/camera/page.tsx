"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera as CameraIcon,
  Upload,
  RotateCw,
  X,
  Monitor,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDevice } from "@/lib/hooks/use-device";

export default function CameraPage() {
  const { isMobile, hasCamera } = useDevice();
  const router = useRouter();

  // 모드 선택: camera or upload
  const [mode, setMode] = useState<"select" | "camera" | "upload">("select");

  // 카메라 관련
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );

  // 자동으로 적절한 모드 설정
  useEffect(() => {
    if (isMobile && hasCamera) {
      // 모바일 + 카메라 있음 → 선택 화면
      setMode("select");
    } else {
      // 데스크탑 또는 카메라 없음 → 업로드만
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
      setMode("upload"); // 실패하면 업로드로 전환
    }
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

      // 카메라 정지
      stream?.getTracks().forEach((track) => track.stop());
    }
  };

  // 파일 업로드
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    // FileReader로 이미지 읽기
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCapturedImage(result);
    };
    reader.readAsDataURL(file);
  };

  // 재촬영/재업로드
  const retake = () => {
    setCapturedImage(null);
    if (mode === "camera") {
      startCamera();
    } else {
      // 파일 input 리셋
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // AI 분석
  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/food/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: capturedImage.split(",")[1],
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/food/result/${result.data.foodCode}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("이미지 분석 중 오류가 발생했습니다");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 컴포넌트 언마운트 시 카메라 정리
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  // ==============================================
  // 렌더링: 모드 선택 화면 (모바일만)
  // ==============================================
  if (mode === "select") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-md space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold">식품 확인 방법</h1>
                <p className="mt-2 text-muted-foreground">
                  촬영하거나 이미지를 업로드하세요
                </p>
              </div>

              <div className="space-y-4">
                {/* 카메라 촬영 */}
                <Card
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={startCamera}
                >
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <CameraIcon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">카메라로 촬영</p>
                      <p className="text-sm text-muted-foreground">
                        실시간으로 식품 라벨 촬영
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 이미지 업로드 */}
                <Card
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Upload className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">이미지 업로드</p>
                      <p className="text-sm text-muted-foreground">
                        갤러리에서 사진 선택
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
  // 렌더링: 카메라 모드
  // ==============================================
  if (mode === "camera" && !capturedImage) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <div className="relative flex-1">
          {/* 헤더 */}
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
            <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1">
              <Smartphone className="h-4 w-4 text-white" />
              <span className="text-sm text-white">모바일 모드</span>
            </div>
          </div>

          {/* 카메라 뷰 */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* 가이드 박스 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-3/4 rounded-lg border-2 border-dashed border-white/50">
              <p className="mt-4 text-center text-sm text-white drop-shadow-lg">
                성분표를 이 안에 맞춰주세요
              </p>
            </div>
          </div>

          {/* 촬영 팁 */}
          <div className="absolute bottom-40 left-0 right-0 px-4">
            <div className="rounded-lg bg-black/70 p-4 text-center backdrop-blur-sm">
              <p className="mb-2 font-medium text-white">💡 촬영 가이드</p>
              <div className="space-y-1 text-sm text-white/90">
                <p>• 성분표가 선명하게</p>
                <p>• 빛 반사 없이</p>
                <p>• 글자가 수평으로</p>
              </div>
            </div>
          </div>

          {/* 컨트롤 */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/20 text-white backdrop-blur-sm"
              onClick={() => setMode("upload")}
            >
              <Upload className="h-6 w-6" />
            </Button>

            <Button
              onClick={capturePhoto}
              size="icon"
              className="h-16 w-16 rounded-full border-4 border-white bg-primary"
            >
              <CameraIcon className="h-8 w-8" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-white/20 text-white backdrop-blur-sm"
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
  // 렌더링: 업로드 모드 (데스크탑 또는 선택)
  // ==============================================
  if (mode === "upload" && !capturedImage) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-2xl">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Monitor className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">이미지 업로드</h1>
                <p className="mt-2 text-muted-foreground">
                  식품 라벨 사진을 업로드하세요
                </p>
              </div>

              {/* 드래그 앤 드롭 영역 */}
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-2 text-lg font-medium">
                    이미지를 드래그하거나 클릭하세요
                  </p>
                  <p className="mb-6 text-sm text-muted-foreground">
                    JPG, PNG, WEBP 파일 지원
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    파일 선택
                  </Button>
                </CardContent>
              </Card>

              {/* 모바일에서만 카메라 옵션 표시 */}
              {isMobile && hasCamera && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={startCamera}
                >
                  <CameraIcon className="mr-2 h-4 w-4" />
                  카메라로 촬영하기
                </Button>
              )}
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
            <div className="mx-auto max-w-2xl">
              <h1 className="mb-6 text-center text-2xl font-bold">
                이미지 확인
              </h1>

              <Card className="mb-6">
                <CardContent className="p-4">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full rounded-lg"
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button onClick={retake} variant="outline" className="flex-1">
                  다시 {mode === "camera" ? "촬영" : "업로드"}
                </Button>
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? "분석 중..." : "분석하기"}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
