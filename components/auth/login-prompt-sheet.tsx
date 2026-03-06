"use client";

import { useRouter } from "next/navigation";
import { X, ShieldCheck, Infinity, Bell, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface LoginPromptSheetProps {
  open: boolean;
  onClose: () => void;
  /** 표시 이유 */
  reason: "scan_limit" | "scan_warning" | "feature";
  /** 남은 스캔 횟수 (scan_warning 시) */
  remainingScans?: number;
}

const BENEFITS = [
  {
    icon: <Infinity className="h-4 w-4 text-primary" />,
    text: "무제한 바코드·사진 스캔",
  },
  {
    icon: <ShieldCheck className="h-4 w-4 text-green-600" />,
    text: "알레르기 프로필 저장 및 관리",
  },
  {
    icon: <History className="h-4 w-4 text-blue-600" />,
    text: "스캔 기록 영구 보관",
  },
  {
    icon: <Bell className="h-4 w-4 text-orange-500" />,
    text: "위험 성분 감지 시 즉시 알림",
  },
];

export function LoginPromptSheet({
  open,
  onClose,
  reason,
  remainingScans,
}: LoginPromptSheetProps) {
  const router = useRouter();

  const title =
    reason === "scan_limit"
      ? "오늘 무료 스캔을 모두 사용했어요"
      : reason === "scan_warning"
        ? `무료 스캔이 ${remainingScans}회 남았어요`
        : "로그인하면 더 많은 기능을 쓸 수 있어요";

  const description =
    reason === "scan_limit"
      ? "회원가입하면 매일 무제한으로 스캔할 수 있습니다"
      : reason === "scan_warning"
        ? "회원가입하면 제한 없이 계속 스캔할 수 있어요"
        : "알레르기 프로필, 스캔 기록 등 더 많은 기능을 이용하세요";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 딤 배경 */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* 바텀시트 */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
        <div className="mx-auto max-w-lg rounded-t-2xl bg-card px-6 pb-8 pt-5 shadow-2xl">
          {/* 핸들 */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>

          {/* 아이콘 */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <span className="text-3xl">
                {reason === "scan_limit"
                  ? "🔒"
                  : reason === "scan_warning"
                    ? "⚠️"
                    : "✨"}
              </span>
            </div>
          </div>

          {/* 제목 / 설명 */}
          <h2 className="text-center text-lg font-bold text-gray-900">
            {title}
          </h2>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            {description}
          </p>

          {/* 혜택 목록 */}
          <div className="mt-5 space-y-2.5 rounded-xl bg-gray-50 p-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  {b.icon}
                </div>
                <span className="text-sm text-gray-700">{b.text}</span>
              </div>
            ))}
          </div>

          {/* 버튼 */}
          <div className="mt-5 space-y-2">
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                onClose();
                router.push("/login?reason=scan_limit");
              }}
            >
              회원가입
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onClose}
            >
              {reason === "scan_limit" ? "나중에 하기" : "계속 둘러보기"}
            </Button>
          </div>
        </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
