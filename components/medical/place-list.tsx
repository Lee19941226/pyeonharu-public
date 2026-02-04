"use client"

import Link from "next/link"
import { Building2, Cross, MapPin, Phone, Clock, Navigation, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Place } from "@/app/search/page"

interface PlaceListProps {
  places: Place[]
  selectedPlace: Place | null
  onSelectPlace: (place: Place | null) => void
}

export function PlaceList({ places, selectedPlace, onSelectPlace }: PlaceListProps) {
  const handleNavigation = (place: Place) => {
    window.open(
      `https://map.naver.com/v5/directions/-/-/-/transit?c=${place.lng},${place.lat},15,0,0,0,dh`,
      "_blank"
    )
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  if (places.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">검색 결과가 없습니다</h3>
        <p className="text-sm text-muted-foreground">
          필터를 조정하거나 다른 지역을 검색해보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {places.map((place) => (
        <div
          key={place.id}
          className={`p-4 transition-colors hover:bg-muted/50 ${
            selectedPlace?.id === place.id ? "bg-muted/50" : ""
          }`}
          onClick={() => onSelectPlace(place)}
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              {place.type === "hospital" ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                  <Cross className="h-4 w-4 text-green-600" />
                </div>
              )}
              <div>
                <Link
                  href={`/${place.type}/${place.id}`}
                  className="font-semibold hover:text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {place.name}
                </Link>
                <p className="text-xs text-muted-foreground">{place.distance}</p>
              </div>
            </div>
            <Badge variant={place.isOpen ? "default" : "secondary"} className="text-xs">
              {place.isOpen ? "영업 중" : "영업 종료"}
            </Badge>
          </div>

          <div className="mb-3 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="line-clamp-1">{place.address}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>
                {place.openTime} - {place.closeTime}
              </span>
            </div>
            {place.departments && place.departments.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {place.departments.slice(0, 3).map((dept) => (
                  <Badge key={dept} variant="outline" className="text-xs">
                    {dept}
                  </Badge>
                ))}
                {place.departments.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{place.departments.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                handleCall(place.phone)
              }}
            >
              <Phone className="mr-1 h-3 w-3" />
              전화
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                handleNavigation(place)
              }}
            >
              <Navigation className="mr-1 h-3 w-3" />
              길찾기
            </Button>
            <Button
              size="sm"
              variant="default"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/${place.type}/${place.id}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
