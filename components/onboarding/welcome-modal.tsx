"use client";

import { useState } from "react";
import { X, Mail, Heart, Copy, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WelcomeModalProps {
  active: boolean;
  onFinish: () => void;
}

export function WelcomeModal({ active, onFinish }: WelcomeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!active) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("3333-03-3043-114");
      setCopied(true);
      toast.success("계좌번호가 복사되었습니다");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const content = (
    <>
      {/* 딤드 배경 */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onFinish}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full max-w-md max-h-[85vh] overflow-y-auto",
            "rounded-2xl bg-white shadow-2xl",
            "animate-in fade-in zoom-in-95 duration-300",
          )}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onFinish}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* 상단 그라디언트 헤더 */}
          <div className="rounded-t-2xl bg-gradient-to-br from-primary/90 to-primary px-6 pb-6 pt-8 text-white">
            <div className="mb-3 text-4xl">👋</div>
            <h2 className="text-xl font-bold leading-tight">
              편하루에 오신 것을
              <br />
              진심으로 환영합니다!
            </h2>
            <p className="mt-2 text-sm text-white/80">
              처음 이용해주셔서 정말 감사합니다.
            </p>
          </div>

          {/* 본문 */}
          <div className="space-y-5 px-6 py-6">
            {/* 팀 소개 */}
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-900">
                🧑‍💻 저희는 신입 개발자 2명으로 이루어진 팀입니다.
              </p>
              <p className="text-sm leading-relaxed text-gray-600">
                식사할 때 조금이라도 편하게 이용하실 수 있도록,
                그리고 학교 커뮤니티에서 소통할 수 있도록 구성해보았습니다.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                졸업생·재학생 구분, 졸업 기수 표기 등 커뮤니티 기능도 계속 발전시킬 예정이에요.
              </p>
            </div>

            {/* 사용법 안내 */}
            <div className="rounded-xl bg-green-50 p-4">
              <p className="mb-2 text-sm font-semibold text-green-900">
                📸 사진 한 장이면 끝!
              </p>
              <p className="text-sm leading-relaxed text-green-800">
                알레르기 확인, 식단 관리 모두 사진만 촬영하시면 됩니다.
                AI 분석이 불안하시다면 직접 입력도 가능해요.
              </p>
            </div>

            {/* 피드백 환영 */}
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="mb-1 text-sm font-semibold text-blue-900">
                💬 쓴소리도 환영합니다
              </p>
              <p className="text-sm leading-relaxed text-blue-800">
                부족한 점은 저희의 역량 부족입니다.
                모든 피드백을 받아들일 준비가 되어있어요.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-100/60 px-3 py-2">
                <Mail className="h-4 w-4 shrink-0 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  pyeonharu@gmail.com
                </span>
              </div>
            </div>

            {/* 후원 안내 */}
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-900">
                  후원해주시면 큰 힘이 됩니다
                </p>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-amber-800">
                하고 싶지만 현실적인 문제로 못해본 것들이 너무 많습니다.
                후원은 팀이 유지되는 데 정말 큰 도움이 됩니다.
              </p>
              <div className="flex items-center justify-between rounded-lg bg-amber-100 px-4 py-3">
                <div>
                  <p className="text-xs text-amber-700">카카오뱅크</p>
                  <p className="text-base font-bold text-amber-900">
                    3333-03-3043-114
                  </p>
                  <p className="text-xs text-amber-700">이진원</p>
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-amber-200 text-amber-900 hover:bg-amber-300 active:scale-95",
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      복사
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="border-t px-6 py-4">
            <button
              onClick={onFinish}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              편하루 시작하기 🚀
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}
