"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, RotateCw, Zap, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // ✅ 변경

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const router = useRouter();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (error) {
      console.error("카메라 접근 오류:", error);
      toast.error("카메라에 접근할 수 없습니다"); // ✅ 변경
    }
  };

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

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/food/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: capturedImage.split(",")[1] }),
      });

      const result = await response.json();

      if (result.success) {
        // 결과 페이지로 이동
        router.push(`/food/result/${result.data.foodCode}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error("이미지 분석 중 오류가 발생했습니다"); // ✅ 변경
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="relative flex-1">
        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Camera View or Captured Image */}
        {!capturedImage ? (
          <div className="relative h-screen">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Guide Box */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1/2 w-3/4 rounded-lg border-2 border-dashed border-white/50">
                <p className="mt-4 text-center text-sm text-white">
                  성분표를 이 안에 맞춰주세요
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="absolute bottom-40 left-0 right-0 px-4">
              <div className="rounded-lg bg-primary/90 p-4 text-center">
                <p className="mb-2 font-medium text-primary-foreground">
                  💡 촬영 가이드
                </p>
                <div className="space-y-1 text-sm text-primary-foreground/90">
                  <p>• 성분표가 선명하게</p>
                  <p>• 빛 반사 없이</p>
                  <p>• 글자가 수평으로</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-white/20 text-white"
              >
                <Zap className="h-6 w-6" />
              </Button>

              <Button
                onClick={capturePhoto}
                size="icon"
                className="h-16 w-16 rounded-full border-4 border-primary bg-white"
              >
                <CameraIcon className="h-8 w-8 text-primary" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-white/20 text-white"
                onClick={() => {
                  stream?.getTracks().forEach((track) => track.stop());
                  setFacingMode((prev) =>
                    prev === "user" ? "environment" : "user",
                  );
                  startCamera();
                }}
              >
                <RotateCw className="h-6 w-6" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative h-screen">
            <img
              src={capturedImage}
              alt="Captured"
              className="h-full w-full object-contain"
            />

            <div className="absolute bottom-8 left-0 right-0 flex gap-4 px-4">
              <Button onClick={retake} variant="outline" className="flex-1">
                재촬영
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
        )}
      </div>
    </div>
  );
}
