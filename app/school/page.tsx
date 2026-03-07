"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Search,
  School,
  MapPin,
  Phone,
  Plus,
  Trash2,
  ChevronRight,
  UtensilsCrossed,
  Loader2,
  GraduationCap,
} from "lucide-react"

interface SchoolResult {
  schoolCode: string
  officeCode: string
  officeName: string
  schoolName: string
  schoolType: string
  address: string
  phone: string
}

interface MySchool {
  id: string
  school_code: string
  office_code: string
  school_name: string
  school_address: string
  created_at: string
  enrollment_status: "enrolled" | "graduated" | null
  graduation_year: number | null
  enrollment_year: number | null
}

export default function SchoolPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SchoolResult[]>([])
  const [mySchools, setMySchools] = useState<MySchool[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMy, setIsLoadingMy] = useState(true)
  const [registeringCode, setRegisteringCode] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [editingSchool, setEditingSchool] = useState<string | null>(null)
  const [statusForm, setStatusForm] = useState<{
    enrollmentStatus: "enrolled" | "graduated" | null
    graduationYear: string
    enrollmentYear: string
  }>({ enrollmentStatus: null, graduationYear: "", enrollmentYear: "" })
  const [savingStatus, setSavingStatus] = useState(false)
  const [enrollmentPrompt, setEnrollmentPrompt] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setIsLoggedIn(true)
      loadMySchools()
    } else {
      setIsLoadingMy(false)
    }
  }

  const loadMySchools = async () => {
    try {
      const res = await fetch("/api/school/register")
      if (res.ok) {
        const data = await res.json()
        setMySchools(data.schools || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingMy(false)
    }
  }

  const handleSearch = async () => {
    if (!query || query.length < 2) {
      toast.error("학교 이름을 2글자 이상 입력하세요")
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    setResults([])
    try {
      const res = await fetch(`/api/school/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.schools || [])
      if (data.schools?.length === 0) {
        toast.info("검색 결과가 없습니다")
      }
    } catch (e) {
      toast.error("검색에 실패했습니다")
    } finally {
      setIsSearching(false)
    }
  }

  const handleRegister = async (school: SchoolResult) => {
    if (!isLoggedIn) {
      toast.error("로그인 후 학교를 등록할 수 있습니다")
      router.push("/login")
      return
    }

    setRegisteringCode(school.schoolCode)
    try {
      const res = await fetch("/api/school/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: school.schoolCode,
          officeCode: school.officeCode,
          schoolName: school.schoolName,
          schoolAddress: school.address,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`${school.schoolName} 등록 완료`)
        await loadMySchools()
        setEnrollmentPrompt(school.schoolCode)
      } else {
        toast.error(data.error || "등록 실패")
      }
    } catch (e) {
      toast.error("등록에 실패했습니다")
    } finally {
      setRegisteringCode(null)
    }
  }

  const handleUnregister = async (schoolCode: string, schoolName: string) => {
    if (!confirm(`${schoolName}을(를) 해제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/school/register?schoolCode=${schoolCode}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("학교 해제 완료")
        setMySchools(prev => prev.filter(s => s.school_code !== schoolCode))
      } else {
        toast.error("해제에 실패했습니다")
      }
    } catch (e) {
      toast.error("해제에 실패했습니다")
    }
  }

  const isRegistered = (code: string) => mySchools.some(s => s.school_code === code)

  const openStatusEdit = (school: MySchool) => {
    setEditingSchool(school.school_code)
    setStatusForm({
      enrollmentStatus: school.enrollment_status,
      graduationYear: school.graduation_year?.toString() || "",
      enrollmentYear: school.enrollment_year?.toString() || "",
    })
  }

  const handleSaveStatus = async (schoolCode: string) => {
    setSavingStatus(true)
    try {
      const res = await fetch("/api/school/register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode,
          enrollmentStatus: statusForm.enrollmentStatus,
          graduationYear: statusForm.enrollmentStatus === "graduated" && statusForm.graduationYear
            ? parseInt(statusForm.graduationYear) : null,
          enrollmentYear: statusForm.enrollmentYear ? parseInt(statusForm.enrollmentYear) : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("상태가 저장되었습니다")
        setMySchools(prev => prev.map(s =>
          s.school_code === schoolCode ? { ...s, ...data.school } : s
        ))
        setEditingSchool(null)
      } else {
        toast.error(data.error || "저장 실패")
      }
    } catch {
      toast.error("저장에 실패했습니다")
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="relative z-10 flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-5">
          <div className="mx-auto max-w-3xl">

            {/* 헤더 */}
            <div className="glass-surface mb-6 rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">학교 급식 알레르기 체크</h1>
                  <p className="text-xs text-muted-foreground">학교를 등록하면 매일 급식 알레르기를 확인할 수 있어요</p>
                </div>
              </div>
            </div>

            {/* 검색 */}
            <div className="glass-surface mb-6 rounded-2xl p-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="학교 이름 검색 (예: 군포초등학교)"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !isSearching && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
                </Button>
              </div>
            </div>

            {/* 내 학교 목록 */}
            {isLoggedIn && (
              <div className="mb-6">
                <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4" />
                  내 학교 ({mySchools.length}/5)
                </h2>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  🎓 버튼을 눌러 재학/졸업 상태를 설정하면 커뮤니티에서 선후배·동창을 확인할 수 있어요
                </p>

                {isLoadingMy ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : mySchools.length === 0 ? (
                  <Card className="glass-surface border-dashed shadow-none">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                      <School className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">등록된 학교가 없습니다</p>
                      <p className="text-xs text-muted-foreground">위에서 학교를 검색해 등록하세요</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {mySchools.map(school => (
                      <Card key={school.id} className="glass-surface shadow-none transition-all hover:bg-muted/40">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => router.push(`/school/${school.office_code}-${school.school_code}`)}
                              className="flex flex-1 items-center gap-3 text-left"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                                <School className="h-5 w-5 text-orange-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{school.school_name}</p>
                                  {school.enrollment_status === "enrolled" && (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5 py-0">재학생</Badge>
                                  )}
                                  {school.enrollment_status === "graduated" && (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] px-1.5 py-0">
                                      졸업생{school.graduation_year ? ` ('${String(school.graduation_year).slice(2)})` : ""}
                                    </Badge>
                                  )}
                                </div>
                                {school.school_address && (
                                  <p className="text-xs text-muted-foreground truncate">{school.school_address}</p>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 shrink-0 text-muted-foreground hover:text-primary"
                                onClick={() => editingSchool === school.school_code ? setEditingSchool(null) : openStatusEdit(school)}
                                aria-label="재학/졸업 설정"
                              >
                                <GraduationCap className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleUnregister(school.school_code, school.school_name)}
                                aria-label={`${school.school_name} 학교 해제`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* 재학/졸업 설정 패널 */}
                          {editingSchool === school.school_code && (
                            <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-3">
                              <p className="text-xs font-medium text-muted-foreground">재학/졸업 상태 설정</p>
                              <div className="flex gap-2">
                                {([
                                  { value: null, label: "미설정" },
                                  { value: "enrolled" as const, label: "재학생" },
                                  { value: "graduated" as const, label: "졸업생" },
                                ]).map(opt => (
                                  <button
                                    key={opt.label}
                                    onClick={() => setStatusForm(prev => ({ ...prev, enrollmentStatus: opt.value }))}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                      statusForm.enrollmentStatus === opt.value
                                        ? opt.value === "enrolled"
                                          ? "border-green-500 bg-green-50 text-green-700"
                                          : opt.value === "graduated"
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:bg-muted"
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>

                              {statusForm.enrollmentStatus === "graduated" && (
                                <div>
                                  <label className="text-xs text-muted-foreground">졸업년도</label>
                                  <Input
                                    type="number"
                                    placeholder="예: 2020"
                                    value={statusForm.graduationYear}
                                    onChange={e => setStatusForm(prev => ({ ...prev, graduationYear: e.target.value }))}
                                    className="mt-1 h-9"
                                    min={1950}
                                    max={new Date().getFullYear()}
                                  />
                                </div>
                              )}

                              {statusForm.enrollmentStatus && (
                                <div>
                                  <label className="text-xs text-muted-foreground">입학년도 (선택)</label>
                                  <Input
                                    type="number"
                                    placeholder="예: 2017"
                                    value={statusForm.enrollmentYear}
                                    onChange={e => setStatusForm(prev => ({ ...prev, enrollmentYear: e.target.value }))}
                                    className="mt-1 h-9"
                                    min={1950}
                                    max={new Date().getFullYear()}
                                  />
                                </div>
                              )}

                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingSchool(null)}>
                                  취소
                                </Button>
                                <Button size="sm" onClick={() => handleSaveStatus(school.school_code)} disabled={savingStatus}>
                                  {savingStatus ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                                  저장
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 검색 결과 */}
            {hasSearched && (
              <div>
                <h2 className="mb-3 text-sm font-semibold">
                  검색 결과 {results.length > 0 && `(${results.length}개)`}
                </h2>

                {isSearching ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : results.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {results.map(school => {
                      const registered = isRegistered(school.schoolCode)
                      return (
                        <Card key={school.schoolCode} className="glass-surface shadow-none transition-all hover:bg-muted/40">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <p className="font-medium">{school.schoolName}</p>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {school.schoolType}
                                  </Badge>
                                </div>
                                {school.address && (
                                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{school.address}</span>
                                  </p>
                                )}
                                {school.phone && (
                                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3 shrink-0" />
                                    {school.phone}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 gap-1">
                                {registered ? (
                                  <Button variant="outline" size="sm" disabled className="h-11 px-3 text-xs">
                                    등록됨
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-11 px-3 text-xs"
                                    disabled={registeringCode === school.schoolCode}
                                    onClick={() => handleRegister(school)}
                                    aria-label={`${school.schoolName} 학교 등록`}
                                  >
                                    {registeringCode === school.schoolCode ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Plus className="mr-1 h-3 w-3" />
                                    )}
                                    등록
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-11 px-3 text-xs"
                                  onClick={() => router.push(`/school/${school.officeCode}-${school.schoolCode}`)}
                                  aria-label={`${school.schoolName} 급식 정보 보기`}
                                >
                                  급식 보기
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
      <MobileNav />

      {/* 재학/졸업 설정 유도 팝업 */}
      {enrollmentPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="glass-surface w-full max-w-sm rounded-2xl p-6 shadow-xl dark:bg-card">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h2 className="mb-2 text-center text-base font-bold">재학/졸업 상태를 설정할까요?</h2>
            <p className="mb-5 text-center text-xs text-muted-foreground leading-relaxed">
              재학/졸업 여부를 등록하면 커뮤니티에서<br />
              선후배, 동창 관계를 알 수 있어요!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setEnrollmentPrompt(null)}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                나중에
              </button>
              <button
                onClick={() => {
                  const school = mySchools.find(s => s.school_code === enrollmentPrompt)
                  if (school) openStatusEdit(school)
                  setEnrollmentPrompt(null)
                }}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                설정하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
