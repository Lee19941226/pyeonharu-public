"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

// 실제 식약처 API로 조회할 인기 과자 바코드
const SAMPLE_PRODUCTS = [
  { name: "초코파이", emoji: "🍫", barcode: "8801062637379" },
  { name: "새우깡", emoji: "🦐", barcode: "8801062276264" },
  { name: "포카칩", emoji: "🥔", barcode: "8801062502370" },
]

// 데모용 알레르기 프리셋 (우유, 계란)
const DEMO_ALLERGENS = ["우유", "계란"]

interface DemoResult {
  foodName: string
  allergens: string[]
  detectedAllergens: { name: string; severity: string }[]
  isSafe: boolean
}

interface StepDemoProps {
  onNext: (result: DemoResult) => void
  onSkip: () => void
}

export function StepDemo({ onNext, onSkip }: StepDemoProps) {
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const handleTap = async (index: number) => {
    if (loading) return
    setSelectedIndex(index)
    setLoading(true)

    const product = SAMPLE_PRODUCTS[index]

    try {
      // 실제 식약처 API 호출
      const res = await fetch(`/api/food/result?code=${product.barcode}`)
      const data = await res.json()

      if (data.success && data.result) {
        const result = data.result
        // 데모 알레르기(우유, 계란)와 매칭
        const detected = (result.allergens || [])
          .filter((a: string) =>
            DEMO_ALLERGENS.some((d) => a.includes(d) || d.includes(a))
          )
          .map((a: string) => ({
            name: a,
            severity: "high",
          }))

        // 약간의 딜레이 (체감 신뢰성)
        await new Promise((r) => setTimeout(r, 600))

        onNext({
          foodName: result.foodName || product.name,
          allergens: result.allergens || [],
          detectedAllergens: detected,
          isSafe: detected.length === 0,
        })
      } else {
        // API 실패 시 폴백 (하드코딩 최소한)
        await new Promise((r) => setTimeout(r, 600))
        const fallbackAllergens: Record<number, string[]> = {
          0: ["우유", "계란", "밀", "대두"], // 초코파이
          1: ["밀", "새우", "대두"],          // 새우깡
          2: ["우유", "밀", "대두"],          // 포카칩
        }
        const allergens = fallbackAllergens[index] || []
        const detected = allergens
          .filter((a) => DEMO_ALLERGENS.includes(a))
          .map((a) => ({ name: a, severity: "high" }))

        onNext({
          foodName: product.name,
          allergens,
          detectedAllergens: detected,
          isSafe: detected.length === 0,
        })
      }
    } catch {
      // 네트워크 에러 시 폴백
      await new Promise((r) => setTimeout(r, 600))
      onNext({
        foodName: product.name,
        allergens: ["우유", "계란", "밀"],
        detectedAllergens: [{ name: "우유", severity: "high" }],
        isSafe: false,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center px-6 py-8">
      {/* 안내 */}
      <p className="mb-2 text-center text-xs text-muted-foreground">
        데모 알레르기: <strong>우유, 계란</strong> 기준
      </p>
      <h2 className="mb-1 text-center text-lg font-bold">
        탭하면 스캔 결과를 볼 수 있어요
      </h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        아래 과자 중 하나를 선택해보세요
      </p>

      {/* 샘플 제품 카드 3개 */}
      <div className="mb-8 grid w-full grid-cols-3 gap-3">
        {SAMPLE_PRODUCTS.map((product, i) => (
          <Card
            key={product.barcode}
            className={`cursor-pointer transition-all duration-200 ${
              selectedIndex === i
                ? "ring-2 ring-primary shadow-md scale-[0.97]"
                : "hover:shadow-md hover:scale-[1.02] active:scale-[0.97]"
            } ${loading && selectedIndex !== i ? "opacity-40 pointer-events-none" : ""}`}
            onClick={() => handleTap(i)}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 py-6">
              {loading && selectedIndex === i ? (
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
              ) : (
                <span className="mb-2 text-3xl">{product.emoji}</span>
              )}
              <span className="text-xs font-medium">{product.name}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 건너뛰기 */}
      <button
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground"
        disabled={loading}
      >
        건너뛰기
      </button>
    </div>
  )
}
