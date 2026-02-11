"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  GraduationCap, Search, Loader2, CheckCircle, PartyPopper, MapPin,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface SchoolSearchResult {
  schoolCode: string
  officeCode: string
  schoolName: string
  address: string
}

interface StepSchoolProps {
  onComplete: () => void
  onSkip: () => void
}

type ViewState = "search" | "complete"

export function StepSchool({ onComplete, onSkip }: StepSchoolProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [view, setView] = useState<ViewState>("search")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SchoolSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [hasExistingSchool, setHasExistingSchool] = useState(false)
  const [registeredSchoolName, setRegisteredSchoolName] = useState("")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // 인증 + 기존 학교 확인
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // 이미 학교 등록했는지 확인
        try {
          const res = await fetch("/api/school/register")
          const data = await res.json()
          if (data.schools && data.schools.length > 0) {
            setHasExistingSchool(true)
            setRegisteredSchoolName(data.schools[0].school_name)
          }
        } catch { /* 무시 */ }
      }
    }
    init()
  }, [])

  // 학교 검색 (디바운스)
  const handleSearch = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/school/search?q=${encodeURIComponent(value.trim())}`
        )
        const data = await res.json()
        setResults(data.schools || [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  // 학교 등록
  const handleRegister = async (school: SchoolSearchResult) => {
    if (!user) {
      toast.error("로그인이 필요합니다")
      return
    }

    setRegistering(true)
    try {
      const res = await fetch("/api/school/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: school.schoolCode,
          officeCode: school.officeCode,
          schoolName: school.schoolName,
        }),
      })
      const data = await res.json()

      if (data.success || res.ok) {
        setRegisteredSchoolName(school.schoolName)
        await markOnboardingComplete()
        setView("complete")
      } else {
        toast.error(data.error || "학교 등록에 실패했습니다")
      }
    } catch {
      toast.error("학교 등록 중 오류가 발생했습니다")
    } finally {
      setRegistering(false)
    }
  }

  // onboarding_completed 마킹
  const markOnboardingComplete = async () => {
    if (!user) return
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      })
    } catch { /* 무시 */ }
  }

  const handleSkipSchool = async () => {
    // 학교 등록 건너뛰기해도 온보딩 완료 처리
    if (user) await markOnboardingComplete()
    onSkip()
  }

  // ─── 완료 화면 ───
  if (view === "complete" || (hasExistingSchool && view === "search")) {
    const schoolName = registeredSchoolName || "학교"

    if (hasExistingSchool && view === "search") {
      // 이미 학교가 등록되어 있으면 바로 완료
      return (
        <CompletionView
          schoolName={schoolName}
          alreadyRegistered
          onComplete={async () => {
            if (user) await markOnboardingComplete()
            onComplete()
          }}
        />
      )
    }

    return (
      <CompletionView
        schoolName={schoolName}
        onComplete={onComplete}
      />
    )
  }

  // ─── 비로그인: 학교 등록 불가 ───
  if (!user) {
    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
          <GraduationCap className="h-7 w-7 text-orange-600" />
        </div>
        <h2 className="mb-2 text-center text-lg font-bold">
          학교 급식 알레르기 체크
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          로그인 후 학교를 등록하면 매일 급식 메뉴에서{"\n"}
          알레르기 위험 식품을 자동으로 알려드려요.
        </p>

        <Button onClick={handleSkipSchool} className="w-full" size="lg">
          시작하기
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          마이페이지에서 언제든 학교를 등록할 수 있어요
        </p>
      </div>
    )
  }

  // ─── 학교 검색 UI ───
  return (
    <div className="flex flex-col px-6 py-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
          <GraduationCap className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">학교를 등록해보세요</h2>
          <p className="text-xs text-muted-foreground">
            매일 급식 알레르기를 알려드려요
          </p>
        </div>
      </div>

      {/* 검색 입력 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="학교 이름을 검색하세요"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 검색 결과 */}
      <div className="mb-4 max-h-[35vh] space-y-2 overflow-y-auto">
        {searching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!searching && results.length > 0 && results.map((school) => (
          <Card
            key={`${school.officeCode}-${school.schoolCode}`}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => handleRegister(school)}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50">
                <GraduationCap className="h-4 w-4 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{school.schoolName}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {school.address}
                </p>
              </div>
              {registering ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <span className="shrink-0 text-xs text-primary">등록</span>
              )}
            </CardContent>
          </Card>
        ))}

        {!searching && query.length >= 2 && results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다
          </p>
        )}

        {!searching && query.length < 2 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            학교 이름을 2글자 이상 입력해주세요
          </p>
        )}
      </div>

      {/* 건너뛰기 */}
      <button
        onClick={handleSkipSchool}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        건너뛰기
      </button>
    </div>
  )
}

// ─── 완료 뷰 ───
function CompletionView({
  schoolName,
  alreadyRegistered,
  onComplete,
}: {
  schoolName: string
  alreadyRegistered?: boolean
  onComplete: () => void
}) {
  return (
    <div className="flex flex-col items-center px-6 py-8">
      {/* 축하 아이콘 */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <PartyPopper className="h-8 w-8 text-green-600" />
      </div>

      <h2 className="mb-2 text-center text-xl font-bold">
        🎉 설정 완료!
      </h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {alreadyRegistered
          ? `이미 ${schoolName}이(가) 등록되어 있어요.`
          : `${schoolName} 등록이 완료되었어요!`}
        {"\n"}이제 편하루와 함께 안심하세요.
      </p>

      {/* 요약 */}
      <div className="mb-6 w-full space-y-2">
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
          <span className="text-sm">식품 알레르기 스캔 준비 완료</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
          <span className="text-sm">급식 알레르기 알림 준비 완료</span>
        </div>
      </div>

      <Button onClick={onComplete} className="w-full" size="lg">
        시작하기
      </Button>
    </div>
  )
}
