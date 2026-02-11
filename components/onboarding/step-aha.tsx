"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react"

interface DemoResult {
  foodName: string
  allergens: string[]
  detectedAllergens: { name: string; severity: string }[]
  isSafe: boolean
}

// 대체 안전 식품 (데모 알레르기: 우유, 계란 기준)
const SAFE_ALTERNATIVES = [
  { name: "오레오", emoji: "🟢" },
  { name: "콘칩", emoji: "🟢" },
  { name: "감자칩 (오리지널)", emoji: "🟢" },
]

interface StepAhaProps {
  demoResult: DemoResult | null
  onNext: (allergens: string[]) => void
  onSkip: () => void
}

export function StepAha({ demoResult, onNext, onSkip }: StepAhaProps) {
  if (!demoResult) return null

  const isDangerous = !demoResult.isSafe && demoResult.detectedAllergens.length > 0
  const detectedNames = demoResult.detectedAllergens.map((a) => a.name)

  return (
    <div className="flex flex-col px-6 py-8">
      {/* ─── 위험/안전 결과 카드 ─── */}
      <div
        className={`mb-6 rounded-xl p-5 text-center ${
          isDangerous
            ? "bg-red-50 dark:bg-red-950/30"
            : "bg-green-50 dark:bg-green-950/30"
        }`}
      >
        {isDangerous ? (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="mb-1 text-base font-bold text-red-700 dark:text-red-400">
              이 과자에 주의 성분이 포함되어 있어요!
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">
              {demoResult.foodName}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-1 text-base font-bold text-green-700 dark:text-green-400">
              이 제품은 안전해요!
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              {demoResult.foodName}
            </p>
          </>
        )}
      </div>

      {/* ─── 감지된 알레르기 뱃지 ─── */}
      {isDangerous && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">감지된 알레르기 성분</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {demoResult.detectedAllergens.map((a) => (
              <Badge
                key={a.name}
                variant="destructive"
                className="px-3 py-1 text-xs"
              >
                {a.name} ({a.severity === "high" ? "심각" : "주의"})
              </Badge>
            ))}
          </div>
          {demoResult.allergens.length > demoResult.detectedAllergens.length && (
            <p className="mt-2 text-xs text-muted-foreground">
              전체 포함 성분: {demoResult.allergens.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* ─── 대체 안전 식품 ─── */}
      {isDangerous && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium">
            대신 이건 안전해요!
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {SAFE_ALTERNATIVES.map((item) => (
              <div
                key={item.name}
                className="flex shrink-0 items-center gap-2 rounded-lg border bg-green-50/50 px-4 py-3 dark:bg-green-950/20"
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 핵심 메시지 ─── */}
      <div className="mb-6 rounded-lg border-l-4 border-primary bg-primary/5 p-4">
        <p className="text-sm font-medium">
          {isDangerous
            ? "편하루가 있으면 장보기 전에 안전한 제품을 바로 확인할 수 있어요."
            : "편하루로 모든 식품의 알레르기 성분을 빠르게 확인하세요."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          내 알레르기를 등록하면, 자동으로 위험 식품을 걸러줍니다.
        </p>
      </div>

      {/* ─── CTA ─── */}
      <Button
        onClick={() => onNext(detectedNames)}
        className="w-full"
        size="lg"
      >
        내 알레르기로 설정하기
      </Button>
      <button
        onClick={onSkip}
        className="mt-3 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        나중에 할게요
      </button>
    </div>
  )
}
