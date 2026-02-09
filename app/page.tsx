"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search, Camera, Lock, ChevronRight, ChevronDown,
  Stethoscope, UtensilsCrossed, MapPinned, Pill,
  Loader2, Users, CheckCircle, XCircle, ShieldCheck,
  Building2, Phone, MapPin, Cross, ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MobileNav } from "@/components/layout/mobile-nav"
import { LoginModal } from "@/components/auth/login-modal"
import { BookmarkButton } from "@/components/medical/bookmark-button"
import { createClient } from "@/lib/supabase/client"
import { REGIONS } from "@/lib/region-codes"
import type { User as SupabaseUser } from "@supabase/supabase-js"

// ─── Types ───
interface PlaceItem {
  id: string
  name: string
  address: string
  phone: string
  clCdNm?: string
  sgguCdNm?: string
  emdongNm?: string
  drTotCnt?: number
  lat: number
  lng: number
}

interface MedicineItem {
  id: string
  name: string
  company: string
  efficacy: string
  image: string
}

type SearchMode = "food" | "symptom" | "search" | "medicine"

// ─── Component ───
export default function HomePage() {
  const router = useRouter()
  const [searchMode, setSearchMode] = useState<SearchMode>("food")
  const [symptomInput, setSymptomInput] = useState("")
  const [foodInput, setFoodInput] = useState("")

  // 로그인
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // 병원/약국 조회
  const [placeType, setPlaceType] = useState<"hospital" | "pharmacy">("hospital")
  const [placeRegion, setPlaceRegion] = useState("seoul")
  const [placeKeyword, setPlaceKeyword] = useState("")
  const [allPlaces, setAllPlaces] = useState<PlaceItem[]>([])
  const [placeTotalCount, setPlaceTotalCount] = useState(0)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [placePage, setPlacePage] = useState(1)
  const PER_PAGE = 20

  // 약 검색
  const [medicineQuery, setMedicineQuery] = useState("")
  const [medicineResults, setMedicineResults] = useState<MedicineItem[]>([])
  const [medicineLoading, setMedicineLoading] = useState(false)
  const [medicineSearched, setMedicineSearched] = useState(false)
  const [medicineTotalCount, setMedicineTotalCount] = useState(0)

  // 최근 확인 기록
  const [recentChecks, setRecentChecks] = useState<
    { foodName: string; isSafe: boolean; checkedAt: string }[]
  >([])

  // ─── Effects ───
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem("food_check_history")
      if (saved) {
        const parsed = JSON.parse(saved)
        setRecentChecks(
          parsed
            .sort((a: any, b: any) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
            .slice(0, 3)
        )
      }
    } catch { /* 무시 */ }
  }, [])

  useEffect(() => {
    if (searchMode === "search") {
      setPlaceKeyword("")
      fetchPlaces()
    }
  }, [searchMode, placeType, placeRegion])

  const handleSymptomSearch = () => {
    if (symptomInput.trim()) router.push(`/symptom?q=${encodeURIComponent(symptomInput)}`)
  }

  const handleFoodSearch = () => {
    if (foodInput.trim()) router.push(`/can-i-eat?q=${encodeURIComponent(foodInput)}`)
  }

  const handleMedicineSearch = async () => {
    if (!medicineQuery.trim()) return
    setMedicineLoading(true)
    setMedicineSearched(true)
    try {
      const response = await fetch(`/api/medicine?itemName=${encodeURIComponent(medicineQuery)}`)
      const data = await response.json()
      if (response.ok) {
        setMedicineResults((data.items || []).slice(0, 5))
        setMedicineTotalCount(data.totalCount || 0)
      } else {
        setMedicineResults([])
        setMedicineTotalCount(0)
      }
    } catch { setMedicineResults([]) } finally { setMedicineLoading(false) }
  }

  const fetchPlaces = async (append = false, keyword?: string) => {
    setPlaceLoading(true)
    try {
      const region = REGIONS[placeRegion]
      if (!region) return
      const nextApiPage = append ? Math.floor(allPlaces.length / 1000) + 1 : 1
      const endpoint = placeType === "hospital" ? "hospitals" : "pharmacies"
      let url = `/api/area/${endpoint}?sidoCd=${region.code}&pageNo=${nextApiPage}&numOfRows=1000`
      if (keyword?.trim()) {
        url = `/api/area/${endpoint}?sidoCd=${region.code}&pageNo=1&numOfRows=1000&keyword=${encodeURIComponent(keyword.trim())}`
      }
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        const items = data.hospitals || data.pharmacies || []
        if (append && !keyword) { setAllPlaces(prev => [...prev, ...items]) }
        else { setAllPlaces(items); setPlacePage(1) }
        setPlaceTotalCount(data.totalCount || 0)
      }
    } catch { /* 무시 */ } finally { setPlaceLoading(false) }
  }

  const handlePlaceSearch = () => {
    placeKeyword.trim() ? fetchPlaces(false, placeKeyword) : fetchPlaces()
  }

  const hasMore = !placeKeyword.trim() && allPlaces.length < placeTotalCount
  const totalPages = Math.ceil(allPlaces.length / PER_PAGE)
  const currentPlaces = allPlaces.slice((placePage - 1) * PER_PAGE, placePage * PER_PAGE)

  const tabStyle = (mode: SearchMode) =>
    searchMode === mode
      ? { borderColor: "#f59e0b", backgroundColor: "#fffbeb", color: "#b45309" }
      : { borderColor: "transparent", color: "#9ca3af" }

  // ─── Render ───
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto space-y-4 px-4 py-6">

          {/* ═══════════════════════════════════════
              0. 바코드 스캔 히어로
          ═══════════════════════════════════════ */}
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-md">
            <CardContent className="flex items-center gap-4 p-4 md:p-6">
              <button
                onClick={() => router.push("/food/camera")}
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
                aria-label="바코드 스캔"
              >
                <Camera className="h-6 w-6 text-primary-foreground" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-base md:text-lg">바코드 한 번이면 3초 만에 확인</p>
                <p className="text-sm text-muted-foreground truncate">
                  우리 가족이 먹어도 되는 식품인지 바로 확인하세요
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex gap-1.5"
                onClick={() => router.push("/food/camera")}
              >
                <Camera className="h-4 w-4" />
                스캔하기
              </Button>
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════
              1. 4탭 통합 검색 카드
          ═══════════════════════════════════════ */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-0">
              {/* 탭 선택 — 1행 4열 */}
              <div className="flex border-b overflow-x-auto">
                <button
                  onClick={() => setSearchMode("food")}
                  className="flex flex-1 min-w-0 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-all whitespace-nowrap"
                  style={tabStyle("food")}
                >
                  <UtensilsCrossed className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">이거 먹어도 돼?</span>
                </button>
                <button
                  onClick={() => setSearchMode("symptom")}
                  className="flex flex-1 min-w-0 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-all whitespace-nowrap"
                  style={tabStyle("symptom")}
                >
                  <Stethoscope className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">몸이 아파요</span>
                </button>
                <button
                  onClick={() => setSearchMode("search")}
                  className="flex flex-1 min-w-0 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-all whitespace-nowrap"
                  style={tabStyle("search")}
                >
                  <MapPinned className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">병원/약국 조회</span>
                </button>
                <button
                  onClick={() => setSearchMode("medicine")}
                  className="flex flex-1 min-w-0 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-all whitespace-nowrap"
                  style={tabStyle("medicine")}
                >
                  <Pill className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">약 정보 검색</span>
                </button>
              </div>

              {/* 콘텐츠 */}
              <div className="p-5">

                {/* ── 이거 먹어도 돼? ── */}
                {searchMode === "food" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      음식 사진이나 이름으로 알레르기를 확인하세요
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-10 gap-2" onClick={() => router.push("/food/camera")}>
                        <Camera className="h-4 w-4" />
                        사진 업로드
                      </Button>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="음식 이름 (예: 새우튀김, 땅콩버터)"
                          value={foodInput}
                          onChange={(e) => setFoodInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleFoodSearch()}
                          className="h-10 pl-10"
                        />
                      </div>
                      <Button onClick={handleFoodSearch}>검색</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      내 알레르기 정보를 기반으로 안전 여부를 AI가 분석해드려요
                    </p>
                  </div>
                )}

                {/* ── 몸이 아파요 ── */}
                {searchMode === "symptom" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      증상을 알려주세요, 주변 병원을 찾아드릴게요
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="어디가 아프세요? (예: 두통, 배가 아파요)"
                          value={symptomInput}
                          onChange={(e) => setSymptomInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSymptomSearch()}
                          className="pl-10"
                        />
                      </div>
                      <Button onClick={handleSymptomSearch}>검색</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI가 증상을 분석하고 적합한 진료과와 주변 병원을 추천해드려요
                    </p>
                  </div>
                )}

                {/* ── 병원/약국 조회 ── */}
                {searchMode === "search" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button variant={placeType === "hospital" ? "default" : "outline"} size="sm" onClick={() => setPlaceType("hospital")}>
                        <Building2 className="mr-1 h-4 w-4" />병원
                      </Button>
                      <Button variant={placeType === "pharmacy" ? "default" : "outline"} size="sm" onClick={() => setPlaceType("pharmacy")}>
                        <Cross className="mr-1 h-4 w-4" />약국
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <select value={placeRegion} onChange={(e) => setPlaceRegion(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                        {Object.entries(REGIONS).map(([key, region]) => (
                          <option key={key} value={key}>{region.name}</option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="병원/약국명 검색" value={placeKeyword} onChange={(e) => setPlaceKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePlaceSearch()} className="h-10 pl-10" />
                      </div>
                      <Button onClick={handlePlaceSearch}>검색</Button>
                    </div>

                    {placeLoading ? (
                      <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                    ) : currentPlaces.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">총 {placeTotalCount.toLocaleString()}건 중 {allPlaces.length.toLocaleString()}건 로드됨</p>
                        {currentPlaces.map((place) => (
                          <div key={place.id} className="flex items-start justify-between rounded-lg border p-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{place.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                              {place.clCdNm && <Badge variant="outline" className="mt-1 text-[10px]">{place.clCdNm}</Badge>}
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <BookmarkButton type={placeType === "pharmacy" ? "pharmacy" : "hospital"} id={place.id} name={place.name} address={place.address} phone={place.phone} category={place.clCdNm} lat={place.lat} lng={place.lng} />
                              {place.phone && <Button variant="ghost" size="sm" asChild><a href={`tel:${place.phone}`}><Phone className="h-4 w-4" /></a></Button>}
                              {place.lat > 0 && <Button variant="ghost" size="sm" asChild><a href={`nmap://route/public?dlat=${place.lat}&dlng=${place.lng}&dname=${encodeURIComponent(place.name)}`} target="_blank"><MapPin className="h-4 w-4" /></a></Button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground py-8">검색 결과가 없습니다</p>
                    )}

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Button variant="outline" size="sm" disabled={placePage <= 1} onClick={() => setPlacePage(placePage - 1)}>
                          <ChevronLeft className="h-4 w-4" />이전
                        </Button>
                        <span className="text-sm text-muted-foreground">{placePage} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={placePage >= totalPages} onClick={() => setPlacePage(placePage + 1)}>
                          다음<ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {hasMore && !placeKeyword && (
                      <div className="pt-2 text-center">
                        <Button variant="outline" size="sm" onClick={() => fetchPlaces(true)} disabled={placeLoading}>
                          {placeLoading ? "불러오는 중..." : `다음 1000개 불러오기 (${allPlaces.length.toLocaleString()} / ${placeTotalCount.toLocaleString()})`}
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 약 정보 검색 ── */}
                {searchMode === "medicine" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      약 이름으로 복용법, 주의사항, 부작용을 확인하세요
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="약 이름 (예: 타이레놀, 아스피린)" value={medicineQuery} onChange={(e) => setMedicineQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleMedicineSearch()} className="h-10 pl-10" />
                      </div>
                      <Button onClick={handleMedicineSearch} disabled={medicineLoading}>
                        {medicineLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
                      </Button>
                    </div>

                    {medicineLoading ? (
                      <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                    ) : medicineResults.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">총 {medicineTotalCount}건 중 상위 5건</p>
                        {medicineResults.map((med) => (
                          <div key={med.id} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:border-primary transition-colors" onClick={() => router.push(`/medicine?q=${encodeURIComponent(med.name)}`)}>
                            {med.image ? (
                              <img src={med.image} alt={med.name} className="h-12 w-12 rounded-md object-cover flex-shrink-0" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 flex-shrink-0"><Pill className="h-6 w-6 text-primary" /></div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{med.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{med.company}</p>
                              {med.efficacy && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{med.efficacy.slice(0, 60)}...</p>}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        ))}
                        {medicineTotalCount > 5 && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/medicine?q=${encodeURIComponent(medicineQuery)}`)}>
                            전체 {medicineTotalCount}건 보기<ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : medicineSearched ? (
                      <p className="text-center text-sm text-muted-foreground py-8">검색 결과가 없습니다</p>
                    ) : (
                      <div className="text-center py-6">
                        <Pill className="mx-auto mb-2 h-10 w-10 text-primary/30" />
                        <p className="text-sm text-muted-foreground">약 이름을 검색하면 상세 정보를 확인할 수 있어요</p>
                        <p className="text-xs text-muted-foreground mt-1">* 식품의약품안전처 제공 데이터 기준</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

          {/* ═══════════════════════════════════════
              2. 가족 안전 요약 (로그인 시)
          ═══════════════════════════════════════ */}
          {user && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  가족 안전 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentChecks.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">최근 확인 기록</p>
                    {recentChecks.map((item, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                        <div className="flex items-center gap-2">
                          {item.isSafe ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                          <span className="text-sm font-medium">{item.foodName}</span>
                        </div>
                        <Badge variant={item.isSafe ? "secondary" : "destructive"} className="text-[10px]">
                          {item.isSafe ? "안전" : "위험"}
                        </Badge>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => router.push("/food/history")}>
                      전체 기록 보기<ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <ShieldCheck className="mb-2 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">아직 확인한 식품이 없어요</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => router.push("/food/camera")}>
                      첫 번째 식품 확인하기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}



          {/* ═══════════════════════════════════════
              4. CTA — 비로그인
          ═══════════════════════════════════════ */}
          {!user && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">로그인하고 알레르기 정보 등록하기</p>
                    <p className="text-xs text-muted-foreground">맞춤 서비스를 위해 프로필을 완성해보세요</p>
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

      {/* Footer — 데스크톱 */}
      <div className="hidden md:block">
        <Footer />
      </div>

      <MobileNav />

      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} onSuccess={() => router.refresh()} />
    </div>
  )
}
