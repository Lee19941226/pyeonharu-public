"use client"

import { MapPin, Building2, Cross, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
interface Place {
  id: string;
  name: string;
  type: "hospital" | "pharmacy";
  address: string;
  phone: string;
  distance: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  departments?: string[];
  lat: number;
  lng: number;
}

interface MapPlaceholderProps {
  places: Place[]
  selectedPlace: Place | null
  onSelectPlace: (place: Place | null) => void
  userLocation: { lat: number; lng: number } | null
}

export function MapPlaceholder({
  places,
  selectedPlace,
  onSelectPlace,
  userLocation,
}: MapPlaceholderProps) {
  return (
    <div className="relative h-full w-full bg-muted">
      {/* Map placeholder */}
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">네이버 지도 연동 예정</h3>
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          네이버 지도 API 키를 설정하면 실제 지도가 표시됩니다.
          현재는 샘플 데이터로 목록만 확인할 수 있습니다.
        </p>
        {userLocation && (
          <p className="mb-4 text-xs text-muted-foreground">
            현재 위치: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </p>
        )}

        {/* Sample markers preview */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {places.slice(0, 5).map((place) => (
            <Button
              key={place.id}
              variant={selectedPlace?.id === place.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectPlace(place)}
              className="text-xs"
            >
              {place.type === "hospital" ? (
                <Building2 className="mr-1 h-3 w-3" />
              ) : (
                <Cross className="mr-1 h-3 w-3" />
              )}
              {place.name.length > 8 ? `${place.name.slice(0, 8)}...` : place.name}
            </Button>
          ))}
        </div>
      </div>

      {/* My location button */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(() => {
              // 현재 위치로 이동 (실제 지도 연동 시 구현)
            })
          }
        }}
      >
        <Navigation className="h-5 w-5" />
        <span className="sr-only">내 위치로 이동</span>
      </Button>
    </div>
  )
}
