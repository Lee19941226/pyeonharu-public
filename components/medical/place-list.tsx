"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { Building2, Cross, MapPin, Phone, Clock, ChevronRight, ChevronDown, ExternalLink, Navigation } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookmarkButton } from "@/components/medical/bookmark-button"
import { cn } from "@/lib/utils"
import type { Place } from "@/components/tabs/HospitalTab"

interface PlaceListProps {
  places: Place[]
  selectedPlace: Place | null
  onSelectPlace: (place: Place | null) => void
}

export function PlaceList({ places, selectedPlace, onSelectPlace }: PlaceListProps) {
  const selectedRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  // 네이버 지도 길찾기 링크
  const getNaverMapLink = (place: Place) => {
    return `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}?c=${place.lng},${place.lat},15,0,0,0,dh`
  }

  // 카카오맵 길찾기 링크
  const getKakaoMapLink = (place: Place) => {
    return `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`
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
              "cursor-pointer transition-all hover:shadow-md",
              isSelected && "ring-2 ring-primary shadow-lg bg-primary/5"
            )}
            onClick={() => onSelectPlace(place)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {place.type === "hospital" ? (
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        isSelected ? "bg-blue-200 text-blue-700" : "bg-blue-100 text-blue-600"
                      )}>
                        <Building2 className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        isSelected ? "bg-green-200 text-green-700" : "bg-green-100 text-green-600"
                      )}>
                        <Cross className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <h3 className={cn("font-semibold", isSelected && "text-primary")}>{place.name}</h3>
                      <p className="text-xs text-muted-foreground">{place.distance}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{place.address}</span>
                    </p>
                    {place.phone && (
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        <a
                          href={`tel:${place.phone}`}
                          className="hover:text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {place.phone}
                        </a>
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {place.openTime} - {place.closeTime}
                    </p>
                  </div>

                  {place.departments && place.departments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {place.departments.slice(0, 3).map((dept) => (
                        <Badge key={dept} variant="secondary" className="text-xs">
                          {dept}
                        </Badge>
                      ))}
                      {place.departments.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{place.departments.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge variant={place.isOpen ? "default" : "secondary"}>
                    {place.isOpen ? "영업중" : "영업종료"}
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
              </div>

              {/* 상세정보 토글 */}
              <div className="mt-3 border-t border-border pt-3">
                <button
                  className="flex w-full items-center justify-between text-sm text-primary hover:underline"
                  onClick={(e) => handleToggleDetail(e, place.id)}
                >
                  상세정보 보기
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                </button>

                {/* 확장된 상세정보 */}
                {isExpanded && (
                  <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {/* 기본 정보 */}
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">기본 정보</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">유형</span>
                          <span className="font-medium">{place.type === "hospital" ? "병원" : "약국"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">거리</span>
                          <span className="font-medium">{place.distance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">영업시간</span>
                          <span className="font-medium">{place.openTime} - {place.closeTime}</span>
                        </div>
                        {place.departments && place.departments.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">진료과목</span>
                            <span className="font-medium">{place.departments.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 바로가기 버튼들 */}
                    <div className="flex gap-2">
                      {place.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          asChild
                        >
                          <a href={`tel:${place.phone}`}>
                            <Phone className="h-3.5 w-3.5" />
                            전화
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        asChild
                      >
                        <a href={getNaverMapLink(place)} target="_blank" rel="noopener noreferrer">
                          <Navigation className="h-3.5 w-3.5" />
                          네이버지도
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        asChild
                      >
                        <a href={getKakaoMapLink(place)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          카카오맵
                        </a>
                      </Button>
                    </div>

                    {/* 상세 페이지 링크 */}
                    <Link
                      href={getDetailPageLink(place)}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      상세 페이지로 이동
                      <ChevronRight className="h-3.5 w-3.5" />
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
