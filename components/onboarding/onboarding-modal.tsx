"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepWelcome } from "./step-welcome";
import { StepDemo } from "./step-demo";
import { StepAha } from "./step-aha";
import { StepProfile } from "./step-profile";
import { StepSchool } from "./step-school";
import { useBackHandler } from "@/lib/hooks/use-back-handler";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const STEP_LABELS = ["소개", "체험", "결과", "프로필", "학교"];

export function OnboardingModal({
  open,
  onOpenChange,
  onComplete,
}: OnboardingModalProps) {
  useBackHandler(open, () => onOpenChange(false));
  const [step, setStep] = useState<OnboardingStep>(1);

  // 데모 스캔에서 선택한 제품 결과를 Aha 스텝으로 전달
  const [demoResult, setDemoResult] = useState<{
    foodName: string;
    allergens: string[];
    detectedAllergens: { name: string; severity: string }[];
    isSafe: boolean;
  } | null>(null);

  // Aha 스텝에서 감지된 알레르기를 프로필 스텝으로 전달
  const [suggestedAllergens, setSuggestedAllergens] = useState<string[]>([]);

  const goNext = useCallback(() => {
    setStep((prev) => {
      if (prev >= 5) return prev;
      return (prev + 1) as OnboardingStep;
    });
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleComplete = useCallback(() => {
    // onboarding_completed 처리는 step-school에서 수행
    onComplete?.();
    onOpenChange(false);
  }, [onComplete, onOpenChange]);

  // 모달이 닫히면 스텝 초기화
  useEffect(() => {
    if (!open) {
      // 약간의 딜레이 후 초기화 (닫힘 애니메이션 후)
      const timer = setTimeout(() => {
        setStep(1);
        setDemoResult(null);
        setSuggestedAllergens([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0",
          // 모바일: 바텀시트 스타일
          "sm:max-w-lg",
          "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto",
          "max-sm:translate-x-0 max-sm:translate-y-0",
          "max-sm:rounded-b-none max-sm:rounded-t-2xl",
          "max-sm:data-[state=open]:slide-in-from-bottom",
        )}
        // 기본 X 버튼 숨김 (커스텀으로 그림)
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">시작 가이드</DialogTitle>
        {/* ─── 상단: 프로그레스 바 + X 버튼 ─── */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          {/* 프로그레스 */}
          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === step;
              const isDone = stepNum < step;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300",
                      isDone && "bg-primary text-primary-foreground",
                      isActive &&
                        "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1",
                      !isDone && !isActive && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? "✓" : stepNum}
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={cn(
                        "hidden h-0.5 w-3 rounded-full sm:block",
                        isDone ? "bg-primary" : "bg-muted",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* X 버튼 */}
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── 스텝 콘텐츠 ─── */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && <StepWelcome onNext={goNext} onSkip={handleClose} />}
          {step === 2 && (
            <StepDemo
              onNext={(result) => {
                setDemoResult(result);
                goNext();
              }}
              onSkip={handleClose}
            />
          )}
          {step === 3 && (
            <StepAha
              demoResult={demoResult}
              onNext={(allergens) => {
                setSuggestedAllergens(allergens);
                goNext();
              }}
              onSkip={handleClose}
            />
          )}
          {step === 4 && (
            <StepProfile
              suggestedAllergens={suggestedAllergens}
              onNext={goNext}
              onSkip={handleClose}
            />
          )}
          {step === 5 && (
            <StepSchool onComplete={handleComplete} onSkip={handleComplete} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}