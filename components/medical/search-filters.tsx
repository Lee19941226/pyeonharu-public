"use client"

import { Building2, Cross, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type PlaceType = "hospital" | "pharmacy" | "all"

interface SearchFiltersProps {
  placeType: PlaceType
  onPlaceTypeChange: (type: PlaceType) => void
  showOpenOnly: boolean
  onShowOpenOnlyChange: (show: boolean) => void
}

export function SearchFilters({
  placeType,
  onPlaceTypeChange,
  showOpenOnly,
  onShowOpenOnlyChange,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        <Button
          variant={placeType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onPlaceTypeChange("all")}
        >
          전체
        </Button>
        <Button
          variant={placeType === "hospital" ? "default" : "outline"}
          size="sm"
          onClick={() => onPlaceTypeChange("hospital")}
        >
          <Building2 className="mr-1 h-4 w-4" />
          병원
        </Button>
        <Button
          variant={placeType === "pharmacy" ? "default" : "outline"}
          size="sm"
          onClick={() => onPlaceTypeChange("pharmacy")}
        >
          <Cross className="mr-1 h-4 w-4" />
          약국
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="open-only"
          checked={showOpenOnly}
          onCheckedChange={onShowOpenOnlyChange}
        />
        <Label htmlFor="open-only" className="flex cursor-pointer items-center gap-1 text-sm">
          <Clock className="h-4 w-4" />
          영업 중만 보기
        </Label>
      </div>
    </div>
  )
}
