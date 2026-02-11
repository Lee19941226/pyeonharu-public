"use client"

import { Button } from "@/components/ui/button"
import { ShieldCheck, Camera, Stethoscope } from "lucide-react"

interface StepWelcomeProps {
  onNext: () => void
  onSkip: () => void
}

export function StepWelcome({ onNext, onSkip }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center px-6 py-8">
      {/* 로고 */}
      <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-primary/10">
        <span className="text-4xl">🛡️</span>
      </div>

      {/* 헤드라인 */}
      <h2 className="mb-2 text-center text-xl font-bold leading-tight">
        바코드 찍으면 3초 만에
      </h2>
      <p className="mb-8 text-center text-sm text-muted-foreground leading-relaxed">
        우리 아이가 먹어도 되는지 바로 확인하세요
      </p>

      {/* 핵심 기능 3가지 미리보기 */}
      <div className="mb-8 w-full space-y-3">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
            <Camera className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium">바코드 스캔</p>
            <p className="text-xs text-muted-foreground">식품 알레르기 즉시 확인</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100">
            <ShieldCheck className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium">급식 알레르기 체크</p>
            <p className="text-xs text-muted-foreground">매일 학교 급식 안전 여부 알림</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Stethoscope className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium">AI 증상 분석</p>
            <p className="text-xs text-muted-foreground">증상 입력 → 주변 병원 추천</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Button onClick={onNext} className="w-full" size="lg">
        데모 체험하기
      </Button>
      <button
        onClick={onSkip}
        className="mt-3 text-sm text-muted-foreground hover:text-foreground"
      >
        건너뛰기
      </button>
    </div>
  )
}
