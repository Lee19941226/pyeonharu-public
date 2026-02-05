"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Search, Camera, Lock, ChevronRight, ChevronDown, 
  AlertTriangle, ExternalLink, MapPin, Clock, RefreshCw,
  Building2, Phone, Cross, ChevronLeft, Stethoscope, UtensilsCrossed, MapPinned
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Header } from "@/components/layout/header"
import { LoginModal } from "@/components/auth/login-modal"
import { BookmarkButton } from "@/components/medical/bookmark-button"
import { createClient } from "@/lib/supabase/client"
import { REGIONS } from "@/lib/region-codes"
import type { User as SupabaseUser } from "@supabase/supabase-js"

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

type SearchMode = "symptom" | "food" | "search"

export default function HomePage() {
  const router = useRouter()
  const [searchMode, setSearchMode] = useState<SearchMode>("symptom")
  const [symptomInput, setSymptomInput] = useState("")
  const [foodInput, setFoodInput] = useState("")
  
  // 로그인 상태
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  
  // 감염병 현황 상태
  const [diseases, setDiseases] = useState<DiseaseData[]>([])
  const [regions, setRegions] = useState<RegionData[]>([])
  const [loading, setLoading] = useState(true)
  const [timestamp, setTimestamp] = useState("")
  const [dataYear, setDataYear] = useState("")
  const [isRegionSample, setIsRegionSample] = useState(false)
  const [showCount, setShowCount] = useState(10)
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null)

  // 병원/약국 직접 조회 상태
  const [placeType, setPlaceType] = useState<"hospital" | "pharmacy">("hospital")
  const [placeRegion, setPlaceRegion] = useState("seoul")
  const [placeKeyword, setPlaceKeyword] = useState("")
  const [allPlaces, setAllPlaces] = useState<PlaceItem[]>([])
  const [placeTotalCount, setPlaceTotalCount] = useState(0)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [placePage, setPlacePage] = useState(1)
  const PER_PAGE = 20

  // 로그인 상태 체크
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    
    checkUser()
    
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }, [])

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

  const handleFoodSearch = () => {
    if (foodInput.trim()) {
      router.push(`/can-i-eat?q=${encodeURIComponent(foodInput)}`)
    }
  }

  const getNaverSearchUrl = (diseaseName: string) => {
    return `https://www.google.com/search?q=${encodeURIComponent(diseaseName + '이 뭐야?')}`
  }

  // 병원/약국 조회 (1000건 미리 로드, 페이지 전환은 클라이언트에서 즉시)
  const fetchPlaces = async (append = false, keyword?: string) => {
    setPlaceLoading(true)
    try {
      const region = REGIONS[placeRegion]
      if (!region) return

      const nextApiPage = append ? Math.floor(allPlaces.length / 1000) + 1 : 1
      const endpoint = placeType === "hospital" ? "hospitals" : "pharmacies"
      let url = `/api/area/${endpoint}?sidoCd=${region.code}&pageNo=${nextApiPage}&numOfRows=1000`

      // 키워드가 있으면 서버에서 검색
      if (keyword && keyword.trim()) {
        url = `/api/area/${endpoint}?sidoCd=${region.code}&pageNo=1&numOfRows=1000&keyword=${encodeURIComponent(keyword.trim())}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        const items = data.hospitals || data.pharmacies || []
        if (append && !keyword) {
          setAllPlaces(prev => [...prev, ...items])
        } else {
          setAllPlaces(items)
          setPlacePage(1)
        }
        setPlaceTotalCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error("Failed to fetch places:", error)
    } finally {
      setPlaceLoading(false)
    }
  }

  // 더 불러올 데이터가 있는지
  const hasMore = !placeKeyword.trim() && allPlaces.length < placeTotalCount

  // 페이지 슬라이싱 (클라이언트 즉시)
  const totalPages = Math.ceil(allPlaces.length / PER_PAGE)
  const currentPlaces = allPlaces.slice(
    (placePage - 1) * PER_PAGE,
    placePage * PER_PAGE
  )

  // searchMode가 search로 바뀌거나 지역/타입 변경 시 API 호출
  useEffect(() => {
    if (searchMode === "search") {
      setPlaceKeyword("")
      fetchPlaces()
    }
  }, [searchMode, placeType, placeRegion])

  // 검색 버튼 또는 Enter 시 API 호출
  const handlePlaceSearch = () => {
    if (placeKeyword.trim()) {
      fetchPlaces(false, placeKeyword)
    } else {
      fetchPlaces()
    }
  }

  const formatTimestamp = (ts: string) => {
    if (!ts) return ''
    const date = new Date(ts)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <Header />

      <main className="flex-1">
        <div className="container mx-auto space-y-4 px-4 py-6">
          {/* 🔍 통합 검색 카드 */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-0">
              {/* 탭 선택 영역 - 1행 3열 */}
              <div className="flex border-b">
                <button
                  onClick={() => setSearchMode("symptom")}
                  className="flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all"
                  style={searchMode === "symptom"
                    ? { borderColor: "#f59e0b", backgroundColor: "#fffbeb", color: "#b45309" }
                    : { borderColor: "transparent", color: "#9ca3af" }
                  }
                >
                  <Stethoscope className="h-4 w-4" />
                  <span>몸이 아파요</span>
                </button>
                <button
                  onClick={() => setSearchMode("food")}
                  className="flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all"
                  style={searchMode === "food"
                    ? { borderColor: "#f59e0b", backgroundColor: "#fffbeb", color: "#b45309" }
                    : { borderColor: "transparent", color: "#9ca3af" }
                  }
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  <span>이거 먹어도 돼?</span>
                </button>
                <button
                  onClick={() => setSearchMode("search")}
                  className="flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all"
                  style={searchMode === "search"
                    ? { borderColor: "#f59e0b", backgroundColor: "#fffbeb", color: "#b45309" }
                    : { borderColor: "transparent", color: "#9ca3af" }
                  }
                >
                  <MapPinned className="h-4 w-4" />
                  <span>병원/약국 조회</span>
                </button>
              </div>

              {/* 콘텐츠 영역 */}
              <div className="p-5">

              {/* 몸이 아파요 모드 */}
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
                    <Button onClick={handleSymptomSearch}>
                      검색
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI가 증상을 분석하고 적합한 진료과와 주변 병원을 추천해드려요
                  </p>
                </div>
              )}

              {/* 이거 먹어도 돼? 모드 */}
              {searchMode === "food" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    음식 사진이나 이름으로 알러지를 확인하세요
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-10 gap-2"
                      onClick={() => router.push("/can-i-eat")}
                    >
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
                    <Button onClick={handleFoodSearch}>
                      검색
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    내 알러지 정보를 기반으로 안전 여부를 AI가 분석해드려요
                  </p>
                </div>
              )}

              {/* 병원/약국 직접 조회 모드 */}
              {searchMode === "search" && (
                <div className="space-y-4">
                  {/* 병원/약국 탭 */}
                  <div className="flex gap-2">
                    <Button
                      variant={placeType === "hospital" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlaceType("hospital")}
                    >
                      <Building2 className="mr-1 h-4 w-4" />
                      병원
                    </Button>
                    <Button
                      variant={placeType === "pharmacy" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlaceType("pharmacy")}
                    >
                      <Cross className="mr-1 h-4 w-4" />
                      약국
                    </Button>
                  </div>

                  {/* 필터: 지역 + 검색어 */}
                  <div className="flex gap-2">
                    <select
                      value={placeRegion}
                      onChange={(e) => setPlaceRegion(e.target.value)}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      {Object.values(REGIONS).map((r) => (
                        <option key={r.slug} value={r.slug}>{r.name}</option>
                      ))}
                    </select>
                    <div className="relative flex-1 flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="상호명 검색"
                          value={placeKeyword}
                          onChange={(e) => setPlaceKeyword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handlePlaceSearch()}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        onClick={handlePlaceSearch}
                        size="default"
                        className="shrink-0"
                      >
                        검색
                      </Button>
                    </div>
                  </div>

                  {/* 결과 */}
                  <div className="text-sm text-muted-foreground">
                    {placeKeyword.trim()
                      ? `"${placeKeyword}" 검색결과 ${placeTotalCount.toLocaleString()}개 (${allPlaces.length}개 로드됨)`
                      : `${allPlaces.length.toLocaleString()}개 로드됨 (전체 ${placeTotalCount.toLocaleString()}개)`
                    }
                  </div>

                  {placeLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : currentPlaces.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Building2 className="mx-auto mb-2 h-8 w-8" />
                      <p>결과가 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentPlaces.map((place) => (
                        <div
                          key={place.id}
                          className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{place.name}</span>
                                {place.clCdNm && (
                                  <Badge variant="secondary" className="text-[10px]">{place.clCdNm}</Badge>
                                )}
                                {place.sgguCdNm && (
                                  <Badge variant="outline" className="text-[10px]">{place.sgguCdNm}</Badge>
                                )}
                              </div>
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />{place.address}
                              </p>
                              {place.phone && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />{place.phone}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <BookmarkButton
                                type={placeType === "pharmacy" ? "pharmacy" : "hospital"}
                                id={place.id}
                                name={place.name}
                                address={place.address}
                                phone={place.phone}
                                category={place.clCdNm}
                                lat={place.lat}
                                lng={place.lng}
                              />
                              {place.phone && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={`tel:${place.phone}`}><Phone className="h-4 w-4" /></a>
                                </Button>
                              )}
                              {place.lat > 0 && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a
                                    href={`nmap://route/public?dlat=${place.lat}&dlng=${place.lng}&dname=${encodeURIComponent(place.name)}`}
                                    target="_blank"
                                  >
                                    <MapPin className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 페이징 (클라이언트 즉시 전환) */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={placePage <= 1}
                        onClick={() => setPlacePage(placePage - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        이전
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {placePage} / {totalPages} 페이지
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={placePage >= totalPages}
                        onClick={() => setPlacePage(placePage + 1)}
                      >
                        다음
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* 더 불러오기 */}
                  {hasMore && !placeKeyword && (
                    <div className="pt-2 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPlaces(true)}
                        disabled={placeLoading}
                      >
                        {placeLoading ? "불러오는 중..." : `다음 1000개 불러오기 (${allPlaces.length.toLocaleString()} / ${placeTotalCount.toLocaleString()})`}
                        <ChevronDown className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              </div>
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
                        <a
                          key={disease.name}
                          href={getNaverSearchUrl(disease.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-2 hover:bg-muted transition-colors cursor-pointer"
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
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </a>
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
