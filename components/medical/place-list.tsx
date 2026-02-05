"use client"

import Link from "next/link"
import { Building2, Cross, MapPin, Phone, Clock, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookmarkButton } from "@/components/medical/bookmark-button"
import { cn } from "@/lib/utils"
import type { Place } from "@/app/search/page"

interface PlaceListProps {
  places: Place[]
  selectedPlace: Place | null
  onSelectPlace: (place: Place | null) => void
}

export function PlaceList({ places, selectedPlace, onSelectPlace }: PlaceListProps) {
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

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="mb-2 text-sm text-muted-foreground">
        {places.length}개의 결과
      </p>
      {places.map((place) => (
        <Card
          key={place.id}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedPlace?.id === place.id && "ring-2 ring-primary"
          )}
          onClick={() => onSelectPlace(place)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  {place.type === "hospital" ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                      <Cross className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{place.name}</h3>
                    <p className="text-xs text-muted-foreground">{place.distance}</p>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {place.address}
                  </p>
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {place.phone}
                  </p>
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {place.openTime} - {place.closeTime}
                  </p>
                </div>

                {place.departments && (
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

            <div className="mt-3 border-t border-border pt-3">
              <Link
                href={`/${place.type}/${place.id}`}
                className="flex items-center justify-between text-sm text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                상세정보 보기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
