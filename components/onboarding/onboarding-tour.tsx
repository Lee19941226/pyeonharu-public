"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { X, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

// ??? ?ъ뼱 ?ㅽ뀦 ?뺤쓽 ???
// selector: ?섏씠?쇱씠?명븷 ?붿냼??CSS ?좏깮??
// ?놁쑝硫??꾩껜 ?붾㈃ ?뚭컻 (?ㅻ뱶留?
export interface TourStep {
  /** ?섏씠?쇱씠?명븷 DOM ?붿냼 CSS ?좏깮??(?놁쑝硫??꾩껜?붾㈃ ?명듃濡? */
  selector?: string
  /** ?ㅻ챸 ?쒕ぉ */
  title: string
  /** ?ㅻ챸 蹂몃Ц */
  description: string
  /** 留먰뭾???꾩튂 */
  position?: "top" | "bottom" | "left" | "right" | "center"
  /** ?대え吏 ?꾩씠肄?*/
  emoji?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "편하루 시작 가이드",
    description: "알레르기 식품 확인, 증상 체크, 병원/약국 찾기 기능을 순서대로 안내해 드립니다.",
    position: "center",
    emoji: "👋",
  },
  {
    selector: "[data-tour='search-tabs']",
    title: "통합 검색 탭",
    description: "식품 안전 확인, 증상 분석, 병원/약국 찾기, 약 정보 조회를 한 곳에서 사용할 수 있습니다.",
    position: "bottom",
    emoji: "🧭",
  },
  {
    selector: "[data-tour='tab-food']",
    title: "식품 안전 확인",
    description: "식품명이나 바코드를 입력하면 알레르기 기준으로 안전 여부를 빠르게 확인할 수 있습니다.",
    position: "bottom",
    emoji: "🥗",
  },
  {
    selector: "[data-tour='btn-camera']",
    title: "바코드 스캔",
    description: "카메라로 바코드를 촬영하면 제품 정보를 자동으로 인식해 결과를 보여줍니다.",
    position: "bottom",
    emoji: "📷",
  },
  {
    selector: "[data-tour='tab-symptom']",
    title: "증상 체크",
    description: "현재 증상을 입력하면 필요한 진료과목과 주의사항을 확인할 수 있습니다.",
    position: "bottom",
    emoji: "🩺",
  },
  {
    selector: "[data-tour='tab-search']",
    title: "병원/약국 찾기",
    description: "현재 위치 기반으로 주변 병원과 약국을 지도에서 확인하고 길찾기로 이동할 수 있습니다.",
    position: "bottom",
    emoji: "🏥",
  },
  {
    selector: "[data-tour='tab-medicine']",
    title: "약 정보 검색",
    description: "약 이름으로 복용법, 주의사항, 부작용 정보를 조회할 수 있습니다.",
    position: "bottom",
    emoji: "💊",
  },
  {
    selector: "[data-tour='meal-section']",
    title: "급식 알레르기 체크",
    description: "학교 급식 메뉴에서 알레르기 유발 식품을 확인할 수 있습니다.",
    position: "top",
    emoji: "🍱",
  },
  {
    selector: "[data-tour='bottom-nav']",
    title: "하단 네비게이션",
    description: "홈, 식품 확인, 스캔, 알림, 마이페이지로 빠르게 이동할 수 있습니다.",
    position: "top",
    emoji: "🧩",
  },
  {
    title: "이제 시작해볼까요?",
    description: "필요한 기능부터 하나씩 사용해 보세요. 언제든 다시 둘러보기를 열 수 있습니다.",
    position: "center",
    emoji: "✅",
  },
]

interface OnboardingTourProps {
  active: boolean
  onFinish: () => void
}

export function OnboardingTour({ active, onFinish }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [isAnimating, setIsAnimating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ?꾩옱 ?ㅽ뀦???寃??붿냼 ?꾩튂 怨꾩궛
  const calculateTooltipPosition = useCallback((rect: DOMRect, position: string) => {
    const pad = 16
    const tooltipW = Math.min(320, window.innerWidth - 32)

    let top = 0
    let left = 0

    switch (position) {
      case "bottom":
        top = rect.bottom + pad
        left = Math.max(pad, Math.min(rect.left + rect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - pad))
        break
      case "top":
        top = rect.top - pad - 160
        left = Math.max(pad, Math.min(rect.left + rect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - pad))
        if (top < pad) top = rect.bottom + pad
        break
      case "left":
        top = rect.top + rect.height / 2 - 80
        left = Math.max(pad, rect.left - tooltipW - pad)
        break
      case "right":
        top = rect.top + rect.height / 2 - 80
        left = Math.min(rect.right + pad, window.innerWidth - tooltipW - pad)
        break
    }

    setTooltipStyle({ position: "fixed", top, left, width: tooltipW })
  }, [])

  const updatePosition = useCallback(() => {
    const currentStep = TOUR_STEPS[step]
    if (!currentStep?.selector) {
      setTargetRect(null)
      setTooltipStyle({})
      return
    }

    const el = document.querySelector(currentStep.selector)
    if (!el) {
      setTargetRect(null)
      setTooltipStyle({})
      return
    }

    const rect = el.getBoundingClientRect()
    setTargetRect(rect)

    // ?붿냼媛 酉고룷?몄뿉 蹂댁씠?꾨줉 ?ㅽ겕濡?
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
    if (!isVisible) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      // ?ㅽ겕濡????꾩튂 ?ш퀎??
      setTimeout(() => {
        const newRect = el.getBoundingClientRect()
        setTargetRect(newRect)
        calculateTooltipPosition(newRect, currentStep.position || "bottom")
      }, 400)
      return
    }

    calculateTooltipPosition(rect, currentStep.position || "bottom")
  }, [step])

  useEffect(() => {
    if (!active) return
    setIsAnimating(true)
    const timer = setTimeout(() => {
      updatePosition()
      setIsAnimating(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [active, step, updatePosition])

  // 由ъ궗?댁쫰/?ㅽ겕濡????ш퀎??
  useEffect(() => {
    if (!active) return
    const handler = () => updatePosition()
    window.addEventListener("resize", handler)
    window.addEventListener("scroll", handler, true)
    return () => {
      window.removeEventListener("resize", handler)
      window.removeEventListener("scroll", handler, true)
    }
  }, [active, updatePosition])

  const goNext = () => {
    if (step >= TOUR_STEPS.length - 1) {
      onFinish()
    } else {
      setStep((s) => s + 1)
    }
  }

  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const handleSkip = () => {
    onFinish()
  }

  if (!active || !mounted) return null

  const currentStep = TOUR_STEPS[step]
  const isCenter = !currentStep.selector || currentStep.position === "center"
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0

  // SVG 留덉뒪?щ줈 ?섏씠?쇱씠???곸뿭留??щ챸?섍쾶 援щ찉 ?リ린
  const renderOverlay = () => {
    const p = 8 // ?섏씠?쇱씠???곸뿭 ?⑤뵫
    const r = 12 // border-radius

    return (
      <svg
        className="pointer-events-none fixed inset-0 z-[9998]"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="tour-mask">
            {/* ?꾩껜 ?곗깋(遺덊닾紐? */}
            <rect width="100%" height="100%" fill="white" />
            {/* ?섏씠?쇱씠???곸뿭留?寃???щ챸) */}
            {targetRect && !isCenter && (
              <rect
                x={targetRect.left - p}
                y={targetRect.top - p}
                width={targetRect.width + p * 2}
                height={targetRect.height + p * 2}
                rx={r}
                ry={r}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* ?ㅻ뱶 諛곌꼍 */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
        />
      </svg>
    )
  }

  // ?먯꽑 ?섏씠?쇱씠??蹂대뜑
  const renderHighlight = () => {
    if (!targetRect || isCenter) return null
    const p = 8
    return (
      <div
        className="pointer-events-none fixed z-[9999] rounded-xl border-2 border-dashed border-white/80"
        style={{
          left: targetRect.left - p,
          top: targetRect.top - p,
          width: targetRect.width + p * 2,
          height: targetRect.height + p * 2,
          boxShadow: "0 0 0 4px rgba(255,255,255,0.15), 0 0 20px rgba(255,255,255,0.1)",
          transition: "all 0.3s ease-in-out",
        }}
      />
    )
  }

  // ?ㅻ챸 ?댄똻
  const renderTooltip = () => {
    const content = (
      <div
        ref={tooltipRef}
        className={cn(
          "z-[10000] rounded-2xl bg-white p-5 shadow-2xl",
          "transition-all duration-300",
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100",
        )}
        style={
          isCenter
            ? {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) ${isAnimating ? "scale(0.95)" : "scale(1)"}`,
                width: Math.min(340, window.innerWidth - 32),
              }
            : tooltipStyle
        }
      >
        {/* ?대え吏 + ?쒕ぉ */}
        <div className="mb-2 flex items-start gap-3">
          {currentStep.emoji && (
            <span className="shrink-0 text-2xl">{currentStep.emoji}</span>
          )}
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {currentStep.title}
            </h3>
          </div>
        </div>

        {/* ?ㅻ챸 */}
        <p className="mb-4 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
          {currentStep.description}
        </p>

        {/* ?섎떒: ?꾨줈洹몃젅??+ 踰꾪듉 */}
        <div className="flex items-center justify-between">
          {/* ?꾨줈洹몃젅???꾪듃 */}
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-5 bg-primary"
                    : i < step
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-muted",
                )}
              />
            ))}
          </div>

          {/* 踰꾪듉 */}
          <div className="flex items-center gap-2">
            {!isFirst && !isLast && (
              <button
                onClick={goPrev}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {isLast ? (
              <button
                onClick={onFinish}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                ?쒖옉?섍린
              </button>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                ?ㅼ쓬
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    )

    return content
  }

  return createPortal(
    <>
      {/* ?대┃?쇰줈 ?ㅼ쓬 吏꾪뻾 (?ㅻ뱶 ?곸뿭 ?대┃) */}
      <div
        className="fixed inset-0 z-[9997] cursor-pointer"
        onClick={goNext}
      />

      {/* SVG ?ㅻ쾭?덉씠 (?ㅻ뱶 + ?섏씠?쇱씠??援щ찉) */}
      {renderOverlay()}

      {/* ?먯꽑 ?섏씠?쇱씠??蹂대뜑 */}
      {renderHighlight()}

      {/* 嫄대꼫?곌린 踰꾪듉 (醫뚯긽?? */}
      <button
        onClick={handleSkip}
        className="fixed right-4 top-4 z-[10001] flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-500 shadow-lg backdrop-blur transition-colors hover:bg-white hover:text-gray-700"
      >
        嫄대꼫?곌린
        <X className="h-3 w-3" />
      </button>

      {/* ?ㅻ챸 ?댄똻 */}
      {renderTooltip()}
    </>,
    document.body,
  )
}
