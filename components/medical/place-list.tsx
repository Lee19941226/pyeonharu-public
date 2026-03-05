"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { Building2, Cross, MapPin, Phone, ChevronRight, ChevronDown, ExternalLink, MapPinned, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookmarkButton } from "@/components/medical/bookmark-button"
import { cn } from "@/lib/utils"
import type { Place } from "@/components/tabs/HospitalTab"

function makeKey(name: string, address: string): string {
  const raw = `${name.trim()}::${address.trim()}`.toLowerCase()
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// 모듈 레벨 캐시
const ratingsCache: Record<string, { avg: number; count: number }> = {}

interface PlaceListProps {
  places: Place[]
  selectedPlace: Place | null
  onSelectPlace: (place: Place | null) => void
}

export function PlaceList({ places, selectedPlace, onSelectPlace }: PlaceListProps) {
  const selectedRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>(ratingsCache)

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  // 평점 일괄 조회
  useEffect(() => {
    if (places.length === 0) return
    const keys = places.map((p) => makeKey(p.name, p.address))
    // 캐시에 없는 키만 필터
    const uncachedKeys = keys.filter((k) => !ratingsCache[k])
    if (uncachedKeys.length === 0) {
      setRatings({ ...ratingsCache })
      return
    }
    fetch(`/api/restaurant/reviews?keys=${uncachedKeys.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ratings) {
          Object.assign(ratingsCache, data.ratings)
        }
        setRatings({ ...ratingsCache })
      })
      .catch(() => {})
  }, [places])

  // 선택된 카드로 스크롤
  useEffect(() => {
    if (selectedPlace && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [selectedPlace])

  if (places.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold">검색 결과가 없습니다</h3>
        <p className="text-sm text-muted-foreground">
          필터 조건을 변경해보세요.
        </p>
      </div>
    )
  }

  const handleToggleDetail = (e: React.MouseEvent, placeId: string) => {
    e.stopPropagation()
    setExpandedId((prev) => (prev === placeId ? null : placeId))
  }

  // Tmap 앱 길찾기 딥링크 (모바일 전용)
  const getTmapLink = (place: Place) => {
    return `tmap://route?goalname=${encodeURIComponent(place.name)}&goalx=${place.lng}&goaly=${place.lat}`
  }

  // 카카오맵 앱 길찾기 딥링크
  const getKakaoMapLink = (place: Place) => {
    return `kakaomap://route?ep=${place.lat},${place.lng}&by=CAR`
  }

  // 상세 페이지 링크 (쿼리스트링으로 데이터 전달)
  const getDetailPageLink = (place: Place) => {
    const params = new URLSearchParams({
      name: place.name,
      address: place.address,
      phone: place.phone || "",
      type: place.type === "hospital" ? "병원" : "약국",
      department: place.departments?.[0] || "",
      lat: String(place.lat),
      lng: String(place.lng),
    })
    return `/${place.type}/${place.id}?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="mb-2 text-sm text-muted-foreground">
        {places.length}개의 결과
      </p>
      {places.map((place) => {
        const isSelected = selectedPlace?.id === place.id
        const isExpanded = expandedId === place.id

        return (
          <Card
            key={place.id}
            ref={isSelected ? selectedRef : undefined}
            className={cn(
              "cursor-pointer transition-all hover:shadow-sm",
              isSelected && "ring-2 ring-primary bg-primary/5"
            )}
            onClick={() => onSelectPlace(place)}
          >
            <CardContent className="px-3 py-2.5">
              {/* 헤더: 아이콘 + 이름 + 거리 + 상태 */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  place.type === "hospital"
                    ? (isSelected ? "bg-blue-200 text-blue-700" : "bg-blue-100 text-blue-600")
                    : (isSelected ? "bg-green-200 text-green-700" : "bg-green-100 text-green-600")
                )}>
                  {place.type === "hospital" ? <Building2 className="h-3.5 w-3.5" /> : <Cross className="h-3.5 w-3.5" />}
                </div>
                <h3 className={cn("text-sm font-semibold truncate flex-1 min-w-0", isSelected && "text-primary")}>{place.name}</h3>
                {(() => {
                  const k = makeKey(place.name, place.address)
                  const r = ratings[k]
                  return (
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-[11px] font-medium">{r ? r.avg : "0.0"}</span>
                    </span>
                  )
                })()}
                <span className="text-[11px] text-primary font-medium shrink-0">{place.distance}</span>
                <Badge variant={place.isOpen ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                  {place.isOpen ? "영업중" : "종료"}
                </Badge>
                <BookmarkButton
                  type={place.type}
                  id={place.id}
                  name={place.name}
                  address={place.address}
                  phone={place.phone}
                  category={place.departments?.[0]}
                  lat={place.lat}
                  lng={place.lng}
                />
              </div>

              {/* 주소 + 진료과목 한 줄 */}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{place.address}</span>
                {place.departments && place.departments.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {place.departments[0]}
                  </Badge>
                )}
              </div>

              {/* 상세정보 토글 */}
              <div className="mt-1.5 border-t border-border pt-1.5">
                <button
                  className="flex w-full items-center justify-between text-xs text-primary hover:underline"
                  onClick={(e) => handleToggleDetail(e, place.id)}
                >
                  상세정보
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs rounded-lg bg-muted/50 p-2.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">유형</span>
                        <span className="font-medium">{place.type === "hospital" ? "병원" : "약국"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">영업시간</span>
                        <span className="font-medium">{place.openTime}-{place.closeTime}</span>
                      </div>
                      {place.phone && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-muted-foreground">전화</span>
                          <a href={`tel:${place.phone}`} className="font-medium hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {place.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      {place.phone && (
                        <Button variant="outline" size="sm" className="flex-1 gap-1 h-7 text-xs" asChild>
                          <a href={`tel:${place.phone}`}>
                            <Phone className="h-3 w-3" />
                            전화
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="flex-1 gap-1 h-7 text-xs" asChild>
                        <a href={getKakaoMapLink(place)}>
                          <ExternalLink className="h-3 w-3" />
                          카카오맵
                        </a>
                      </Button>
                      {isMobile && (
                        <Button variant="outline" size="sm" className="flex-1 gap-1 h-7 text-xs" asChild>
                          <a href={getTmapLink(place)}>
                            <MapPinned className="h-3 w-3" />
                            Tmap
                          </a>
                        </Button>
                      )}
                    </div>

                    <Link
                      href={getDetailPageLink(place)}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      상세 페이지에서 리뷰 남기기
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
