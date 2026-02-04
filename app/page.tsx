"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Search, Camera, Lock, Menu, X, ChevronRight, ChevronDown, 
  AlertTriangle, ExternalLink, MapPin, Clock, RefreshCw, LogOut, User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { LoginModal } from "@/components/auth/login-modal"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const quickSymptoms = [
  { label: "🤒 발열", value: "발열" },
  { label: "🤕 두통", value: "두통" },
  { label: "🤢 복통", value: "복통" },
  { label: "🤧 감기", value: "감기" },
]

interface DiseaseData {
  name: string
  count: number
  group: string
}

interface RegionData {
  name: string
  total: number
  diseases: { name: string; count: number }[]
}

export default function HomePage() {
  const router = useRouter()
  const [symptomInput, setSymptomInput] = useState("")
  const [foodInput, setFoodInput] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // 로그인 상태
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  
  // 감염병 현황 상태
  const [diseases, setDiseases] = useState<DiseaseData[]>([])
  const [regions, setRegions] = useState<RegionData[]>([])
  const [loading, setLoading] = useState(true)
  const [timestamp, setTimestamp] = useState("")
  const [dataYear, setDataYear] = useState("")
  const [isRegionSample, setIsRegionSample] = useState(false)
  const [showCount, setShowCount] = useState(10) // 처음 10개
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null)

  // 로그인 상태 체크
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setAuthLoading(false)
    }
    
    checkUser()
    
    // 인증 상태 변화 감지
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }, [])

  // 로그아웃
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  useEffect(() => {
    fetchDiseaseData()
  }, [])

  const fetchDiseaseData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/disease-stats')
      const result = await res.json()
      
      if (result.success && result.data) {
        setDiseases(result.data.diseases || [])
        setRegions(result.data.regions || [])
        setTimestamp(result.timestamp)
        setDataYear(result.dataYear)
        setIsRegionSample(result.data.isRegionSample || false)
      }
    } catch (error) {
      console.error('Failed to fetch disease data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSymptomSearch = () => {
    if (symptomInput.trim()) {
      router.push(`/symptom?q=${encodeURIComponent(symptomInput)}`)
    }
  }

  const handleSymptomTag = (symptom: string) => {
    router.push(`/symptom?q=${encodeURIComponent(symptom)}`)
  }

  const handleFoodSearch = () => {
    if (foodInput.trim()) {
      router.push(`/can-i-eat?q=${encodeURIComponent(foodInput)}`)
    }
  }

  // 네이버 검색 URL 생성
  const getNaverSearchUrl = (diseaseName: string) => {
    return `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(diseaseName + ' 감염병 증상')}`
  }

  // 시간 포맷
  const formatTimestamp = (ts: string) => {
    if (!ts) return ''
    const date = new Date(ts)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="font-bold text-primary-foreground">편</span>
            </div>
            <span className="font-bold">편하루</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
              병원/약국
            </Link>
            <Link href="/can-i-eat" className="text-sm text-muted-foreground hover:text-foreground">
              이거 먹어도 돼?
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {authLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : user ? (
              <div className="hidden items-center gap-2 md:flex">
                <span className="text-sm text-muted-foreground">{user.email?.split('@')[0]}</span>
                <Button size="sm" variant="ghost" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" className="hidden md:inline-flex" onClick={() => setLoginModalOpen(true)}>
                로그인
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t bg-background md:hidden">
            <nav className="container mx-auto flex flex-col px-4 py-3">
              <Link href="/search" className="py-2 text-sm" onClick={() => setMobileMenuOpen(false)}>
                병원/약국
              </Link>
              <Link href="/can-i-eat" className="py-2 text-sm" onClick={() => setMobileMenuOpen(false)}>
                이거 먹어도 돼?
              </Link>
              {user ? (
                <>
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {user.email?.split('@')[0]}
                  </div>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="mt-2 rounded-md border py-2 text-center text-sm font-medium"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); setLoginModalOpen(true); }}
                  className="mt-2 rounded-md bg-primary py-2 text-center text-sm font-medium text-primary-foreground"
                >
                  로그인
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="container mx-auto space-y-4 px-4 py-6">
          {/* 🏥 몸이 아파요 */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  🏥 몸이 아파요
                </h2>
                <p className="text-sm text-muted-foreground">
                  증상을 알려주세요, 주변 병원을 찾아드릴게요
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="어디가 아프세요? (예: 두통, 배가 아파요)"
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSymptomSearch()}
                  className="pl-10"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {quickSymptoms.map((s) => (
                  <Badge
                    key={s.value}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => handleSymptomTag(s.value)}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                AI가 증상을 분석하고 적합한 진료과와 주변 병원을 추천해드려요
              </p>
            </CardContent>
          </Card>

          {/* 🍽 이거 먹어도 돼? */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  🍽 이거 먹어도 돼?
                </h2>
                <p className="text-sm text-muted-foreground">
                  음식 사진이나 이름으로 알러지를 확인하세요
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-12 gap-2"
                  onClick={() => router.push("/can-i-eat")}
                >
                  <Camera className="h-4 w-4" />
                  사진 업로드
                </Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="음식 이름"
                    value={foodInput}
                    onChange={(e) => setFoodInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFoodSearch()}
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                내 알러지 정보를 기반으로 안전 여부를 AI가 분석해드려요
              </p>
            </CardContent>
          </Card>

          {/* 🦠 실시간 감염병 현황 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  실시간 감염병 현황
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchDiseaseData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {timestamp && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{dataYear}년 데이터 기준 · 업데이트: {formatTimestamp(timestamp)}</span>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {/* 감염병 순위 */}
                  <div>
                    <h3 className="mb-2 text-sm font-medium">감염병 발생 순위</h3>
                    <div className="space-y-1">
                      {diseases.slice(0, showCount).map((disease, index) => (
                        <div
                          key={disease.name}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-2 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              index < 3 ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium">{disease.name}</span>
                            <Badge variant="outline" className="text-[10px]">{disease.group}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {disease.count.toLocaleString()}건
                            </span>
                            <a
                              href={getNaverSearchUrl(disease.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 더보기 버튼 */}
                    <div className="mt-3 flex gap-2">
                      {showCount < 100 && diseases.length > showCount && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setShowCount(Math.min(showCount + 40, 100))}
                        >
                          더보기 ({showCount}위 → {Math.min(showCount + 40, 100)}위)
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                      {showCount > 10 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCount(10)}
                        >
                          접기
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 지역별 현황 */}
                  <div className="border-t pt-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4" />
                      지역별 감염병 현황
                      {isRegionSample && (
                        <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-300">
                          샘플 데이터
                        </Badge>
                      )}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {regions.slice(0, 8).map((region) => (
                        <div
                          key={region.name}
                          className={`cursor-pointer rounded-lg border p-2 transition-colors ${
                            selectedRegion?.name === region.name 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedRegion(selectedRegion?.name === region.name ? null : region)}
                        >
                          <p className="text-sm font-medium">{region.name}</p>
                          <p className="text-xs text-muted-foreground">
                            총 {region.total.toLocaleString()}건
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* 선택된 지역의 상세 정보 */}
                    {selectedRegion && (
                      <div className="mt-3 rounded-lg border bg-green-50 p-3">
                        <h4 className="mb-2 text-sm font-medium text-green-800">
                          📊 {selectedRegion.name} 주요 감염병 TOP 5
                        </h4>
                        <div className="space-y-1">
                          {selectedRegion.diseases.slice(0, 5).map((d, i) => (
                            <div key={`${d.name}-${i}`} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="text-green-600">{i + 1}.</span>
                                <a
                                  href={getNaverSearchUrl(d.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary hover:underline"
                                >
                                  {d.name}
                                </a>
                              </span>
                              <span className="text-muted-foreground">{d.count.toLocaleString()}건</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    * 데이터 출처: 질병관리청 감염병포털 · 클릭하면 상세 정보를 확인할 수 있습니다
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* CTA 배너 - 비로그인 시만 표시 */}
          {!user && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">로그인하고 알러지 정보 등록하기</p>
                    <p className="text-xs text-muted-foreground">
                      맞춤 서비스를 위해 프로필을 완성해보세요
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setLoginModalOpen(true)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2026 편하루. All rights reserved.
        </div>
      </footer>

      {/* 로그인 모달 */}
      <LoginModal 
        open={loginModalOpen} 
        onOpenChange={setLoginModalOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
