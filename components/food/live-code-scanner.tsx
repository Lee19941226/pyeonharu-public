"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";
import { toast } from "sonner";

type ScannerLike = {
  start: (
    cameraConfig: unknown,
    config: unknown,
    onSuccess: (decodedText: string) => void,
    onError?: (err: string) => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => Promise<void>;
};

function normalizeCode(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, "").trim();
  if (!cleaned) return null;
  const digitMatches = cleaned.match(/\d{8,14}/g);
  if (digitMatches && digitMatches.length > 0) {
    return digitMatches.sort((a, b) => b.length - a.length)[0];
  }
  return cleaned;
}

interface LiveCodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
  onFallbackUpload: () => void;
}

export function LiveCodeScanner({
  open,
  onOpenChange,
  onDetected,
  onFallbackUpload,
}: LiveCodeScannerProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const scannerRef = useRef<ScannerLike | null>(null);
  const detectedRef = useRef(false);
  const scannerId = useId().replace(/[:]/g, "");

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // ignore
    }
    try {
      await scanner.clear();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!open) return;
      setIsStarting(true);
      setIsReady(false);
      detectedRef.current = false;

      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new mod.Html5Qrcode(scannerId, {
          verbose: false,
          formatsToSupport: [
            mod.Html5QrcodeSupportedFormats.QR_CODE,
            mod.Html5QrcodeSupportedFormats.EAN_13,
            mod.Html5QrcodeSupportedFormats.EAN_8,
            mod.Html5QrcodeSupportedFormats.UPC_A,
            mod.Html5QrcodeSupportedFormats.UPC_E,
            mod.Html5QrcodeSupportedFormats.CODE_128,
            mod.Html5QrcodeSupportedFormats.ITF,
          ],
        }) as unknown as ScannerLike;

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: (vw: number, vh: number) => {
              const width = Math.floor(Math.min(vw * 0.9, 420));
              const height = Math.floor(Math.min(vh * 0.28, 180));
              return { width, height };
            },
            disableFlip: false,
          },
          async (decodedText: string) => {
            if (detectedRef.current) return;
            const code = normalizeCode(decodedText);
            if (!code) return;

            detectedRef.current = true;
            onDetected(code);
            onOpenChange(false);
            await stopScanner();
          },
        );

        if (!cancelled) {
          setIsReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("실시간 스캐너 시작 실패:", error);
          toast.error("카메라 스캐너를 시작할 수 없습니다. 이미지 업로드를 이용해주세요.");
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [onDetected, onOpenChange, open, scannerId, stopScanner]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md p-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            실시간 QR/바코드 스캔
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-2 overflow-hidden rounded-xl border bg-black">
          <div id={scannerId} className="min-h-[340px] w-full" />

          {!isReady && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-xs text-white">
              {isStarting ? "카메라 시작 중..." : "카메라 준비 중..."}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-4 rounded-xl border-2 border-white/80" />
            <div className="absolute left-6 right-6 top-1/2 h-[2px] -translate-y-1/2 bg-red-500/90" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onFallbackUpload();
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            이미지 업로드
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}