"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search, Camera, Lock, ChevronRight,
  Stethoscope, UtensilsCrossed, MapPinned, Pill,
  Loader2, Users, CheckCircle, XCircle, ShieldCheck,
  Building2, Phone, MapPin, Cross, ChevronDown,
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
import type { User as SupabaseUser } from "@supabase/supabase-js"

// ─── 드롭다운 전용 미니맵 (naver-map.tsx와 동일한 스크립트 로딩) ───
function MiniNaverMap({
  lat, lng, name, userLocation,
}: {
  lat: number; lng: number; name: string
  userLocation?: { lat: number; lng: number } | null
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "4q5sd2kb26"

    if (window.naver?.maps) {
      setReady(true)
      return
    }

    const existing = document.querySelector('script[src*="maps.js"]')
    if (existing) {
      const timer = setInterval(() => {
        if (window.naver?.maps) { setReady(true); clearInterval(timer) }
      }, 200)
      return () => clearInterval(timer)
    }

    const script = document.createElement("script")
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}`
    script.async = true
    script.onload = () => setReady(true)
    script.onerror = () => console.error("네이버 지도 로드 실패")
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    const N = window.naver.maps
    const placePos = new N.LatLng(lat, lng)

    const map = new N.Map(mapRef.current, {
      center: placePos,
      zoom: 16,
      zoomControl: false,
      mapDataControl: false,
      scaleControl: false,
    })

    // 병원 마커 (빨간 핀 + 이름)
    const shortName = name.length > 10 ? name.slice(0, 10) + "…" : name
    new N.Marker({
      position: placePos, map,
      icon: {
        content: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="padding:3px 8px;background:#dc2626;color:white;font-size:11px;font-weight:600;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;">
              📍 ${shortName}
            </div>
            <div style="width:2px;height:8px;background:#dc2626;"></div>
            <div style="width:8px;height:8px;background:#dc2626;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
          </div>`,
        anchor: new N.Point(60, 48),
      },
    })

    // 내 위치 마커
    if (userLocation) {
      const userPos = new N.LatLng(userLocation.lat, userLocation.lng)
      new N.Marker({
        position: userPos, map,
        icon: {
          content: `
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div style="padding:2px 6px;background:#2563eb;color:white;font-size:10px;font-weight:500;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.2);">내 위치</div>
              <div style="margin-top:2px;width:12px;height:12px;background:#3b82f6;border-radius:50%;border:2.5px solid white;box-shadow:0 0 0 2px rgba(59,130,246,.3),0 2px 6px rgba(0,0,0,.3);"></div>
            </div>`,
          anchor: new N.Point(24, 32),
        },
      })

      // 두 지점 모두 보이도록 fitBounds
      const bounds = new N.LatLngBounds(
        new N.LatLng(
          Math.min(lat, userLocation.lat) - 0.002,
          Math.min(lng, userLocation.lng) - 0.002
        ),
        new N.LatLng(
          Math.max(lat, userLocation.lat) + 0.002,
          Math.max(lng, userLocation.lng) + 0.002
        )
      )
      map.fitBounds(bounds)

      // 직선 점선 경로
      new N.Polyline({
        map,
        path: [userPos, placePos],
        strokeColor: "#6366f1",
        strokeWeight: 2,
        strokeStyle: "shortdash",
        strokeOpacity: 0.6,
      })

      // 경로 중간에 거리 라벨
      const R = 6371
      const dLat = (lat - userLocation.lat) * Math.PI / 180
      const dLng = (lng - userLocation.lng) * Math.PI / 180
      const a = Math.sin(dLat/2)**2 + Math.cos(userLocation.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      const distText = dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`
      const midLat = (lat + userLocation.lat) / 2
      const midLng = (lng + userLocation.lng) / 2
      new N.Marker({
        position: new N.LatLng(midLat, midLng), map,
        icon: {
          content: `<div style="padding:2px 8px;background:white;border:1px solid #e2e8f0;border-radius:10px;font-size:10px;font-weight:600;color:#6366f1;box-shadow:0 1px 4px rgba(0,0,0,.15);white-space:nowrap;">🚶 ${distText}</div>`,
          anchor: new N.Point(30, 10),
        },
      })
    }
  }, [ready, lat, lng, name, userLocation])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <div ref={mapRef} className="h-full w-full" />
}

// ─── Types ───
interface NearbyPlace {
  id: string
  name: string
  address: string
  phone: string
  clCdNm?: string
  distance: string
  distanceNum: number
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

  // 병원/약국 조회 (위치 기반)
  const [placeType, setPlaceType] = useState<"hospital" | "pharmacy">("hospital")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<"loading" | "granted" | "denied">("loading")
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])
  const [placeLoading, setPlaceLoading] = useState(false)
  const [radiusKm, setRadiusKm] = useState(3)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

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

  // 위치 가져오기 (searchMode가 search로 전환 시)
  useEffect(() => {
    if (searchMode !== "search") return
    if (userLocation) { fetchNearbyPlaces(); return }

    setLocationStatus("loading")
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLocationStatus("granted")
        },
        () => {
          setUserLocation({ lat: 37.3595, lng: 126.9354 })
          setLocationStatus("denied")
        }
      )
    } else {
      setUserLocation({ lat: 37.3595, lng: 126.9354 })
      setLocationStatus("denied")
    }
  }, [searchMode])

  useEffect(() => {
    if (searchMode === "search" && userLocation) {
      setSelectedPlaceId(null)
      fetchNearbyPlaces()
    }
  }, [userLocation, placeType, radiusKm])

  const fetchNearbyPlaces = async () => {
    if (!userLocation) return
    setPlaceLoading(true)
    try {
      const radiusM = radiusKm * 1000
      if (placeType === "hospital") {
        const res = await fetch(`/api/hospitals?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radiusM}&numOfRows=1000`)
        const data = await res.json()
        setNearbyPlaces(data.success && data.hospitals ? data.hospitals.map((h: any) => ({
          id: h.id, name: h.name, address: h.address, phone: h.phone,
          clCdNm: h.clCdNm, distance: h.distance, distanceNum: h.distanceNum || 0,
          lat: h.lat, lng: h.lng,
        })) : [])
      } else {
        const res = await fetch(`/api/pharmacies?lat=${userLocation.lat}&lng=${userLocation.lng}`)
        const data = await res.json()
        setNearbyPlaces(data.pharmacies ? data.pharmacies.map((p: any) => ({
          id: p.hpid || String(Math.random()), name: p.dutyName, address: p.dutyAddr,
          phone: p.dutyTel1, clCdNm: "약국", distance: p.distance || "",
          distanceNum: parseFloat(p.distance) || 0, lat: p.wgs84Lat, lng: p.wgs84Lon,
        })).sort((a: NearbyPlace, b: NearbyPlace) => a.distanceNum - b.distanceNum) : [])
      }
    } catch { setNearbyPlaces([]) } finally { setPlaceLoading(false) }
  }

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

                {/* ── 병원/약국 조회 (위치 기반) ── */}
                {searchMode === "search" && (
                  <div className="space-y-4">
                    {/* 타입 + 반경 선택 */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button variant={placeType === "hospital" ? "default" : "outline"} size="sm" onClick={() => setPlaceType("hospital")}>
                          <Building2 className="mr-1 h-4 w-4" />병원
                        </Button>
                        <Button variant={placeType === "pharmacy" ? "default" : "outline"} size="sm" onClick={() => setPlaceType("pharmacy")}>
                          <Cross className="mr-1 h-4 w-4" />약국
                        </Button>
                      </div>
                      <select
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value={1}>반경 1km</option>
                        <option value={3}>반경 3km</option>
                        <option value={5}>반경 5km</option>
                        <option value={10}>반경 10km</option>
                      </select>
                    </div>

                    {/* 위치 상태 표시 */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {locationStatus === "loading" && "위치 확인 중..."}
                      {locationStatus === "granted" && `현재 위치 기준 반경 ${radiusKm}km 이내`}
                      {locationStatus === "denied" && "위치 권한이 없어 기본 위치(군포)로 검색합니다"}
                    </div>

                    {/* 결과 */}
                    {placeLoading ? (
                      <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                    ) : nearbyPlaces.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          가까운 순 · {nearbyPlaces.length}개 {placeType === "hospital" ? "병원" : "약국"}
                        </p>
                        {nearbyPlaces.slice(0, 20).map((place) => {
                          const isSelected = selectedPlaceId === place.id
                          return (
                            <div key={place.id} className="rounded-lg border overflow-hidden transition-all">
                              {/* 병원 카드 — 클릭 시 상세 토글 */}
                              <button
                                onClick={() => setSelectedPlaceId(isSelected ? null : place.id)}
                                className={`flex w-full items-start justify-between p-3 text-left transition-colors ${
                                  isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">{place.name}</p>
                                    {place.distance && (
                                      <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                        {place.distance}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                                  {place.clCdNm && <Badge variant="outline" className="mt-1 text-[10px]">{place.clCdNm}</Badge>}
                                </div>
                                <ChevronDown className={`h-4 w-4 mt-1 transition-transform text-muted-foreground flex-shrink-0 ${isSelected ? "rotate-180" : ""}`} />
                              </button>

                              {/* 상세 드롭다운 — 지도 + 정보 + 액션 */}
                              {isSelected && (
                                <div className="border-t">
                                  {/* 지도 영역 */}
                                  <div style={{ height: "208px", minHeight: "208px" }} className="bg-muted relative">
                                    {place.lat > 0 && place.lng > 0 ? (
                                      <MiniNaverMap
                                        lat={place.lat}
                                        lng={place.lng}
                                        name={place.name}
                                        userLocation={userLocation}
                                      />
                                    ) : (
                                      <iframe
                                        src={`https://map.naver.com/v5/search/${encodeURIComponent(place.name + " " + place.address)}?c=15,0,0,0,dh`}
                                        className="h-full w-full border-0"
                                        loading="lazy"
                                        title={`${place.name} 지도`}
                                      />
                                    )}
                                  </div>

                                  {/* 병원 정보 */}
                                  <div className="px-3 py-3 space-y-2 bg-muted/20">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                                      <p className="text-xs text-foreground">{place.address}</p>
                                    </div>
                                    {place.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <a href={`tel:${place.phone}`} className="text-xs text-primary hover:underline">{place.phone}</a>
                                      </div>
                                    )}
                                    {place.clCdNm && (
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <p className="text-xs text-foreground">{place.clCdNm}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* 액션 버튼 */}
                                  <div className="flex items-center border-t px-2 py-2 gap-1">
                                    <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs h-8" asChild>
                                      {place.phone ? <a href={`tel:${place.phone}`}><Phone className="h-3.5 w-3.5" />전화</a> : <span className="text-muted-foreground">전화 정보 없음</span>}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs h-8" asChild>
                                      <a
                                        href={`https://map.naver.com/index.nhn?slng=${userLocation?.lng || ""}&slat=${userLocation?.lat || ""}&stext=${encodeURIComponent("내 위치")}&elng=${place.lng}&elat=${place.lat}&etext=${encodeURIComponent(place.name)}&menu=route&pathType=1`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => {
                                          if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
                                            e.preventDefault()
                                            window.location.href = `nmap://route/walk?slat=${userLocation?.lat || ""}&slng=${userLocation?.lng || ""}&sname=${encodeURIComponent("내 위치")}&dlat=${place.lat}&dlng=${place.lng}&dname=${encodeURIComponent(place.name)}&appname=pyeonharu`
                                          }
                                        }}
                                      >
                                        <MapPin className="h-3.5 w-3.5" />길찾기
                                      </a>
                                    </Button>
                                    <BookmarkButton type={placeType === "pharmacy" ? "pharmacy" : "hospital"} id={place.id} name={place.name} address={place.address} phone={place.phone} category={place.clCdNm} lat={place.lat} lng={place.lng} />
                                  </div>

                                  {/* 네이버 지도에서 상세보기 */}
                                  <a
                                    href={`https://map.naver.com/v5/search/${encodeURIComponent(place.name + " " + place.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 border-t px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                                  >
                                    네이버 지도에서 상세보기
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {nearbyPlaces.length > 20 && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => router.push("/search")}>
                            지도에서 전체 보기<ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">반경 {radiusKm}km 이내에 {placeType === "hospital" ? "병원" : "약국"}이 없습니다</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setRadiusKm(Math.min(radiusKm + 2, 10))}>
                          범위 넓히기
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
