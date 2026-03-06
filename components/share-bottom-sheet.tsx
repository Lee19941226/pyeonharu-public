"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { shareToKakao, type KakaoShareOptions } from "@/lib/utils/kakao-share";

export type { KakaoShareOptions };
export type ShareBottomSheetData = KakaoShareOptions;

interface ShareBottomSheetProps {
  open: boolean;
  onClose: () => void;
  data: ShareBottomSheetData;
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#3C1E1E]">
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.8 6.7-.2.8-.6 2.8-.7 3.2 0 .2 0 .4.2.5.1.1.3.1.4 0 .5-.3 3.7-2.4 4.3-2.8.3 0 .7.1 1 .1 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
    </svg>
  );
}

export function ShareBottomSheet({ open, onClose, data }: ShareBottomSheetProps) {
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    setHasNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const handleKakao = async () => {
    onClose();
    const result = await shareToKakao(data);
    if (result.success) {
      toast.success("카카오톡으로 공유했습니다");
    } else if (result.fallback === "clipboard") {
      toast.success("링크가 복사되었습니다");
    } else {
      toast.error("카카오톡 공유에 실패했습니다");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      toast.success("링크가 복사되었습니다");
      onClose();
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: data.title,
        text: data.description,
        url: data.shareUrl,
      });
      onClose();
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("공유에 실패했습니다");
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-t-2xl bg-background p-5 space-y-3"
            style={{
              paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <h3 className="text-base font-semibold">공유하기</h3>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {data.title}
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Share options */}
            <div className="space-y-2">
              {/* 카카오톡 공유 */}
              <button
                onClick={handleKakao}
                className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-opacity active:opacity-75"
                style={{ backgroundColor: "#FEE500", color: "#000000" }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
                >
                  <KakaoIcon />
                </div>
                <div>
                  <p className="text-sm font-semibold">카카오톡으로 공유</p>
                  <p className="text-xs opacity-60">카카오톡 앱으로 연결</p>
                </div>
              </button>

              {/* 링크 복사 */}
              <button
                onClick={handleCopy}
                className="flex w-full items-center gap-4 rounded-xl border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Copy className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">링크 복사</p>
                  <p className="text-xs text-muted-foreground">클립보드에 복사</p>
                </div>
              </button>

              {/* 다른 앱으로 공유 (navigator.share 지원 환경만 노출) */}
              {hasNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex w-full items-center gap-4 rounded-xl border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Share2 className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">다른 앱으로 공유</p>
                    <p className="text-xs text-muted-foreground">
                      메시지, 메일 등
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* 취소 */}
            <button
              onClick={onClose}
              className="w-full rounded-xl border py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
            >
              취소
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
