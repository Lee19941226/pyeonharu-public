"use client"

import { useState } from "react"
import Link from "next/link"
import { MapPin, Building2, Cross, ChevronRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

const regions = [
  {
    name: "서울",
    districts: [
      "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
      "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
      "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
    ],
  },
  {
    name: "경기",
    districts: [
      "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시", "남양주시",
      "동두천시", "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시", "안양시",
      "양주시", "여주시", "오산시", "용인시", "의왕시", "의정부시", "이천시", "파주시",
      "평택시", "포천시", "하남시", "화성시",
    ],
  },
  {
    name: "인천",
    districts: ["계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "중구"],
  },
  {
    name: "부산",
    districts: [
      "강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구",
      "사상구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구",
    ],
  },
  {
    name: "대구",
    districts: ["남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"],
  },
  {
    name: "대전",
    districts: ["대덕구", "동구", "서구", "유성구", "중구"],
  },
  {
    name: "광주",
    districts: ["광산구", "남구", "동구", "북구", "서구"],
  },
  {
    name: "울산",
    districts: ["남구", "동구", "북구", "울주군", "중구"],
  },
]

interface AreaSearchProps {
  type: "hospital" | "pharmacy"
}

export function AreaSearch({ type }: AreaSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const filteredRegions = searchQuery
    ? regions
        .map((region) => ({
          ...region,
          districts: region.districts.filter((d) =>
            d.includes(searchQuery) || region.name.includes(searchQuery)
          ),
        }))
        .filter((region) => region.districts.length > 0 || region.name.includes(searchQuery))
    : regions

  const displayRegion = selectedRegion
    ? regions.find((r) => r.name === selectedRegion)
    : null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MapPin className="mr-2 h-4 w-4" />
          지역으로 검색
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "hospital" ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <Cross className="h-5 w-5 text-green-600" />
            )}
            지역별 {type === "hospital" ? "병원" : "약국"} 검색
          </DialogTitle>
          <DialogDescription>
            지역을 선택하면 해당 지역의 {type === "hospital" ? "병원" : "약국"} 목록을 볼 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="지역명 검색 (예: 강남구, 수원시)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedRegion(null)
            }}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {selectedRegion && displayRegion ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRegion(null)}
                className="mb-2 -ml-2"
              >
                ← 전체 지역
              </Button>
              <h3 className="mb-3 font-semibold">{selectedRegion}</h3>
              <div className="grid grid-cols-2 gap-2">
                {displayRegion.districts.map((district) => (
                  <Link
                    key={district}
                    href={`/area/${type}/${encodeURIComponent(district)}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button variant="outline" className="w-full justify-between" size="sm">
                      {district}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegions.map((region) => (
                <div key={region.name}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{region.name}</h3>
                    <div className="flex gap-2">
                      <Link
                        href={`/area/${type}/${encodeURIComponent(region.name)}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          전체보기
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedRegion(region.name)}
                      >
                        구/군 선택
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {searchQuery && (
                    <div className="grid grid-cols-3 gap-1">
                      {region.districts.slice(0, 6).map((district) => (
                        <Link
                          key={district}
                          href={`/area/${type}/${encodeURIComponent(district)}`}
                          onClick={() => setIsOpen(false)}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-8"
                          >
                            {district}
                          </Button>
                        </Link>
                      ))}
                      {region.districts.length > 6 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => setSelectedRegion(region.name)}
                        >
                          +{region.districts.length - 6}개 더보기
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
