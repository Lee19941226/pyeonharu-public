"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, LogIn } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoginModal } from "@/components/auth/login-modal"
import { toast } from "sonner"
import type { User as SupabaseUser } from "@supabase/supabase-js"

// 온보딩용 간소화 알레르기 목록 (주요 항목만)
const ONBOARDING_ALLERGENS = [
  { category: "유제품·계란", items: [
    { code: "milk", name: "우유", emoji: "🥛" },
    { code: "egg", name: "계란", emoji: "🥚" },
  ]},
  { category: "견과류", items: [
    { code: "peanut", name: "땅콩", emoji: "🥜" },
    { code: "walnut", name: "호두", emoji: "🌰" },
    { code: "pine_nut", name: "잣", emoji: "🌲" },
  ]},
  { category: "해산물", items: [
    { code: "shrimp", name: "새우", emoji: "🦐" },
    { code: "crab", name: "게", emoji: "🦀" },
    { code: "mackerel", name: "고등어", emoji: "🐟" },
    { code: "squid", name: "오징어", emoji: "🦑" },
    { code: "shellfish", name: "조개류", emoji: "🦪" },
  ]},
  { category: "곡물", items: [
    { code: "wheat", name: "밀", emoji: "🌾" },
    { code: "buckwheat", name: "메밀", emoji: "🍜" },
    { code: "soy", name: "대두", emoji: "🫘" },
  ]},
  { category: "과일·육류", items: [
    { code: "peach", name: "복숭아", emoji: "🍑" },
    { code: "tomato", name: "토마토", emoji: "🍅" },
    { code: "pork", name: "돼지고기", emoji: "🥓" },
    { code: "beef", name: "쇠고기", emoji: "🥩" },
    { code: "chicken", name: "닭고기", emoji: "🍗" },
  ]},
  { category: "기타", items: [
    { code: "sulfites", name: "아황산류", emoji: "⚗️" },
  ]},
]

interface StepProfileProps {
  suggestedAllergens: string[] // Aha 스텝에서 전달받은 알레르기
  onNext: () => void
  onSkip: () => void
}

export function StepProfile({ suggestedAllergens, onNext, onSkip }: StepProfileProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // 인증 상태 확인
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setAuthChecked(true)
    })
  }, [])

  // Aha 스텝에서 전달받은 알레르기 자동 선택
  useEffect(() => {
    if (suggestedAllergens.length > 0) {
      const codes = new Set<string>()
      for (const name of suggestedAllergens) {
        for (const cat of ONBOARDING_ALLERGENS) {
          const found = cat.items.find((item) => item.name === name)
          if (found) codes.add(found.code)
        }
      }
      setSelected(codes)
    }
  }, [suggestedAllergens])

  const handleToggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleSave = async () => {
    if (!user) {
      setLoginModalOpen(true)
      return
    }

    if (selected.size === 0) {
      onNext()
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      // 기존 데이터 삭제 후 새로 삽입
      await supabase.from("user_allergies").delete().eq("user_id", user.id)

      const insertData = Array.from(selected).map((code) => {
        let allergenName = ""
        for (const cat of ONBOARDING_ALLERGENS) {
          const found = cat.items.find((item) => item.code === code)
          if (found) { allergenName = found.name; break }
        }
        return {
          user_id: user.id,
          allergen_code: code,
          allergen_name: allergenName,
          severity: "medium",
        }
      })

      await supabase.from("user_allergies").insert(insertData)
      toast.success(`알레르기 ${selected.size}개 저장 완료`)
      onNext()
    } catch (err) {
      console.error("알레르기 저장 실패:", err)
      toast.error("저장 중 오류가 발생했습니다")
    } finally {
      setSaving(false)
    }
  }

  const handleLoginSuccess = () => {
    // 로그인 성공 후 유저 정보 재확인
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }

  // ─── 비로그인 상태: 로그인 유도 ───
  if (authChecked && !user) {
    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <LogIn className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mb-2 text-center text-lg font-bold">
          알레르기 프로필을 저장하려면
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          회원가입하면 내 알레르기 정보를 안전하게 저장하고,{"\n"}
          식품 스캔 시 자동으로 위험을 감지합니다.
        </p>

        <Button
          onClick={() => setLoginModalOpen(true)}
          className="w-full"
          size="lg"
        >
          로그인 / 회원가입
        </Button>
        <button
          onClick={onSkip}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground"
        >
          나중에 할게요
        </button>

        <LoginModal
          open={loginModalOpen}
          onOpenChange={setLoginModalOpen}
          onSuccess={handleLoginSuccess}
        />
      </div>
    )
  }

  // ─── 로그인 상태: 알레르기 선택 ───
  return (
    <div className="flex flex-col px-6 py-6">
      <h2 className="mb-1 text-lg font-bold">내 알레르기를 선택하세요</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        선택한 알레르기는 식품 스캔 시 자동으로 체크됩니다.
        {selected.size > 0 && (
          <span className="ml-1 font-medium text-primary">
            {selected.size}개 선택됨
          </span>
        )}
      </p>

      {/* 알레르기 카테고리별 목록 */}
      <div className="mb-6 max-h-[40vh] space-y-4 overflow-y-auto pr-1">
        {ONBOARDING_ALLERGENS.map((cat) => (
          <div key={cat.category}>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {cat.category}
            </p>
            <div className="flex flex-wrap gap-2">
              {cat.items.map((item) => {
                const isSelected = selected.has(item.code)
                return (
                  <button
                    key={item.code}
                    onClick={() => handleToggle(item.code)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-base">{item.emoji}</span>
                    <span>{item.name}</span>
                    {isSelected && <span className="text-xs">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 저장 / 다음 */}
      <Button
        onClick={handleSave}
        className="w-full"
        size="lg"
        disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </>
        ) : selected.size > 0 ? (
          `${selected.size}개 알레르기 저장하고 다음`
        ) : (
          "선택 없이 다음"
        )}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        마이페이지에서 언제든 수정할 수 있어요
      </p>

      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}
