"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { X, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── 투어 스텝 정의 ───
// selector: 하이라이트할 요소의 CSS 선택자
// 없으면 전체 화면 소개 (딤드만)
export interface TourStep {
  /** 하이라이트할 DOM 요소 CSS 선택자 (없으면 전체화면 인트로) */
  selector?: string
  /** 설명 제목 */
  title: string
  /** 설명 본문 */
  description: string
  /** 말풍선 위치 */
  position?: "top" | "bottom" | "left" | "right" | "center"
  /** 이모지 아이콘 */
  emoji?: string
}

const TOUR_STEPS: TourStep[] = [
  // ── 0. 전체 인트로 ──
  {
    title: "음식을 드시기 전 알레르기가 불안하신가요?",
    description: "바코드만 찍으면 먹어도 되는지 5초 안에 알려드려요.\n편하루가 안전한 식사를 도와드릴게요.",
    position: "center",
    emoji: "🛡️",
  },
  // ── 1. 4탭 통합 검색 카드 ──
  {
    selector: "[data-tour='search-tabs']",
    title: "여기서 모든 걸 할 수 있어요",
    description: "식품 안전 확인, 증상 분석, 병원 찾기, 약 검색까지\n4가지 핵심 기능이 이 카드에 모여 있어요.",
    position: "bottom",
    emoji: "🔍",
  },
  // ── 2. 이거 먹어도 돼? 탭 ──
  {
    selector: "[data-tour='tab-food']",
    title: "이거 먹어도 돼?",
    description: "음식 이름이나 바코드 사진으로 검색하면\n내 알레르기 기준으로 안전 여부를 알려줘요.",
    position: "bottom",
    emoji: "🍽️",
  },
  // ── 3. 사진 업로드 버튼 ──
  {
    selector: "[data-tour='btn-camera']",
    title: "바코드 스캔",
    description: "과자나 식품 뒷면의 바코드를 찍으면\n식약처 데이터로 알레르기 성분을 바로 확인해요.",
    position: "bottom",
    emoji: "📸",
  },
  // ── 4. 몸이 아파요 탭 ──
  {
    selector: "[data-tour='tab-symptom']",
    title: "몸이 아파요",
    description: "증상을 입력하면 AI가 어떤 진료과를 가야 하는지\n추천해드려요. 응급 상황 판단에도 도움이 돼요.",
    position: "bottom",
    emoji: "🩺",
  },
  // ── 5. 병원/약국 조회 탭 ──
  {
    selector: "[data-tour='tab-search']",
    title: "병원/약국 조회",
    description: "현재 위치를 기반으로 가까운 병원과 약국을\n찾아주고, 전화·길찾기까지 바로 할 수 있어요.",
    position: "bottom",
    emoji: "🏥",
  },
  // ── 6. 약 정보 검색 탭 ──
  {
    selector: "[data-tour='tab-medicine']",
    title: "약 정보 검색",
    description: "약 이름을 검색하면 복용법, 주의사항,\n부작용 정보를 한눈에 확인할 수 있어요.",
    position: "bottom",
    emoji: "💊",
  },
  // ── 7. 급식 영역 ──
  {
    selector: "[data-tour='meal-section']",
    title: "학교 급식 알레르기 체크",
    description: "학교를 등록하면 매일 급식 메뉴에서\n위험한 알레르기 식품을 자동으로 표시해줘요.",
    position: "top",
    emoji: "🍱",
  },
  // ── 8. 하단 네비게이션 ──
  {
    selector: "[data-tour='bottom-nav']",
    title: "빠른 이동",
    description: "홈, 안전식품, 바코드 스캔, 알림, 마이페이지로\n한 번에 이동할 수 있어요.",
    position: "top",
    emoji: "📱",
  },
  // ── 9. 마무리 ──
  {
    title: "준비 완료!",
    description: "이제 편하루를 자유롭게 사용해보세요.\n알레르기 정보를 등록하면 더 정확한 결과를 받을 수 있어요.",
    position: "center",
    emoji: "🎉",
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

  // 현재 스텝의 타겟 요소 위치 계산
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

    // 요소가 뷰포트에 보이도록 스크롤
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
    if (!isVisible) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      // 스크롤 후 위치 재계산
      setTimeout(() => {
        const newRect = el.getBoundingClientRect()
        setTargetRect(newRect)
        calculateTooltipPosition(newRect, currentStep.position || "bottom")
      }, 400)
      return
    }

    calculateTooltipPosition(rect, currentStep.position || "bottom")
  }, [step])

  const calculateTooltipPosition = (rect: DOMRect, position: string) => {
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
        top = rect.top - pad - 160 // 대략적인 툴팁 높이
        left = Math.max(pad, Math.min(rect.left + rect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - pad))
        if (top < pad) top = rect.bottom + pad // 위에 공간 없으면 아래로
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
  }

  useEffect(() => {
    if (!active) return
    setIsAnimating(true)
    const timer = setTimeout(() => {
      updatePosition()
      setIsAnimating(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [active, step, updatePosition])

  // 리사이즈/스크롤 시 재계산
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

  // SVG 마스크로 하이라이트 영역만 투명하게 구멍 뚫기
  const renderOverlay = () => {
    const p = 8 // 하이라이트 영역 패딩
    const r = 12 // border-radius

    return (
      <svg
        className="pointer-events-none fixed inset-0 z-[9998]"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="tour-mask">
            {/* 전체 흰색(불투명) */}
            <rect width="100%" height="100%" fill="white" />
            {/* 하이라이트 영역만 검정(투명) */}
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
        {/* 딤드 배경 */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
        />
      </svg>
    )
  }

  // 점선 하이라이트 보더
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

  // 설명 툴팁
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
        {/* 이모지 + 제목 */}
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

        {/* 설명 */}
        <p className="mb-4 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
          {currentStep.description}
        </p>

        {/* 하단: 프로그레스 + 버튼 */}
        <div className="flex items-center justify-between">
          {/* 프로그레스 도트 */}
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

          {/* 버튼 */}
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
                시작하기
              </button>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                다음
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
      {/* 클릭으로 다음 진행 (딤드 영역 클릭) */}
      <div
        className="fixed inset-0 z-[9997] cursor-pointer"
        onClick={goNext}
      />

      {/* SVG 오버레이 (딤드 + 하이라이트 구멍) */}
      {renderOverlay()}

      {/* 점선 하이라이트 보더 */}
      {renderHighlight()}

      {/* 건너뛰기 버튼 (좌상단) */}
      <button
        onClick={handleSkip}
        className="fixed right-4 top-4 z-[10001] flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-500 shadow-lg backdrop-blur transition-colors hover:bg-white hover:text-gray-700"
      >
        건너뛰기
        <X className="h-3 w-3" />
      </button>

      {/* 설명 툴팁 */}
      {renderTooltip()}
    </>,
    document.body,
  )
}
