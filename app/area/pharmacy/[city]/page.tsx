"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Cross,
  MapPin,
  Phone,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Moon,
  Calendar,
} from "lucide-react"

interface Pharmacy {
  id: string
  name: string
  address: string
  phone: string
  isOpen: boolean
  openTime: string
  closeTime: string
  distance?: string
  hasNightService?: boolean
  hasHolidayService?: boolean
}

// 샘플 데이터
const samplePharmacies: Record<string, Pharmacy[]> = {
  "서울": [
    {
      id: "3",
      name: "온누리약국",
      address: "서울특별시 종로구 대학로 85",
      phone: "02-745-1234",
      isOpen: true,
      openTime: "09:00",
      closeTime: "21:00",
      hasNightService: true,
      hasHolidayService: false,
    },
    {
      id: "4",
      name: "건강약국",
      address: "서울특별시 종로구 혜화로 12",
      phone: "02-765-5678",
      isOpen: false,
      openTime: "09:00",
      closeTime: "18:00",
      hasNightService: false,
      hasHolidayService: false,
    },
    {
      id: "6",
      name: "24시 세브란스약국",
      address: "서울특별시 서대문구 연세로 48",
      phone: "02-365-2424",
      isOpen: true,
      openTime: "00:00",
      closeTime: "24:00",
      hasNightService: true,
      hasHolidayService: true,
    },
  ],
  "강남구": [
    {
      id: "7",
      name: "강남역약국",
      address: "서울특별시 강남구 강남대로 396",
      phone: "02-555-1234",
      isOpen: true,
      openTime: "08:00",
      closeTime: "22:00",
      hasNightService: true,
      hasHolidayService: true,
    },
    {
      id: "8",
      name: "삼성병원약국",
      address: "서울특별시 강남구 일원로 79",
      phone: "02-3410-0700",
      isOpen: true,
      openTime: "08:00",
      closeTime: "18:00",
      hasNightService: false,
      hasHolidayService: false,
    },
  ],
  "종로구": [
    {
      id: "3",
      name: "온누리약국",
      address: "서울특별시 종로구 대학로 85",
      phone: "02-745-1234",
      isOpen: true,
      openTime: "09:00",
      closeTime: "21:00",
      hasNightService: true,
      hasHolidayService: false,
    },
    {
      id: "4",
      name: "건강약국",
      address: "서울특별시 종로구 혜화로 12",
      phone: "02-765-5678",
      isOpen: false,
      openTime: "09:00",
      closeTime: "18:00",
      hasNightService: false,
      hasHolidayService: false,
    },
  ],
}

export default function AreaPharmacyPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const city = decodeURIComponent(params.city as string)
  
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [filteredPharmacies, setFilteredPharmacies] = useState<Pharmacy[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [showNightOnly, setShowNightOnly] = useState(false)
  const [showHolidayOnly, setShowHolidayOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  
  const itemsPerPage = 10

  useEffect(() => {
    // 실제로는 API 호출
    const data = samplePharmacies[city] || []
    setPharmacies(data)
    setFilteredPharmacies(data)
    setIsLoading(false)
  }, [city])

  useEffect(() => {
    let result = pharmacies

    // 검색어 필터
    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.name.includes(searchQuery) ||
          p.address.includes(searchQuery)
      )
    }

    // 영업중 필터
    if (showOpenOnly) {
      result = result.filter((p) => p.isOpen)
    }

    // 야간 운영 필터
    if (showNightOnly) {
      result = result.filter((p) => p.hasNightService)
    }

    // 공휴일 운영 필터
    if (showHolidayOnly) {
      result = result.filter((p) => p.hasHolidayService)
    }

    setFilteredPharmacies(result)
    setCurrentPage(1)
  }, [pharmacies, searchQuery, showOpenOnly, showNightOnly, showHolidayOnly])

  const totalPages = Math.ceil(filteredPharmacies.length / itemsPerPage)
  const currentPharmacies = filteredPharmacies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        {/* Page Header */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="mb-4 flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="-ml-2">
                <Link href="/search">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  병원/약국 검색
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <Cross className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{city} 약국</h1>
                <p className="text-sm text-muted-foreground">
                  총 {filteredPharmacies.length}개의 약국
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="약국명, 주소로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Toggles */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="open-only"
                    checked={showOpenOnly}
                    onCheckedChange={setShowOpenOnly}
                  />
                  <Label htmlFor="open-only" className="flex items-center gap-1 text-sm cursor-pointer">
                    <Clock className="h-4 w-4" />
                    영업 중
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="night-only"
                    checked={showNightOnly}
                    onCheckedChange={setShowNightOnly}
                  />
                  <Label htmlFor="night-only" className="flex items-center gap-1 text-sm cursor-pointer">
                    <Moon className="h-4 w-4" />
                    야간 운영
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="holiday-only"
                    checked={showHolidayOnly}
                    onCheckedChange={setShowHolidayOnly}
                  />
                  <Label htmlFor="holiday-only" className="flex items-center gap-1 text-sm cursor-pointer">
                    <Calendar className="h-4 w-4" />
                    공휴일 운영
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pharmacy List */}
        <div className="container mx-auto px-4 py-6">
          {currentPharmacies.length === 0 ? (
            <div className="py-12 text-center">
              <Cross className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">검색 결과가 없습니다</h3>
              <p className="text-muted-foreground">
                다른 검색어나 필터를 시도해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentPharmacies.map((pharmacy) => (
                <Card key={pharmacy.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/pharmacy/${pharmacy.id}`}
                            className="text-lg font-semibold hover:text-primary"
                          >
                            {pharmacy.name}
                          </Link>
                          <Badge
                            variant={pharmacy.isOpen ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {pharmacy.isOpen ? "영업 중" : "영업 종료"}
                          </Badge>
                          {pharmacy.hasNightService && (
                            <Badge variant="outline" className="text-xs">
                              <Moon className="mr-1 h-3 w-3" />
                              야간
                            </Badge>
                          )}
                          {pharmacy.hasHolidayService && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="mr-1 h-3 w-3" />
                              공휴일
                            </Badge>
                          )}
                        </div>

                        <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span>{pharmacy.address}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <span>{pharmacy.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>
                              {pharmacy.openTime === "00:00" && pharmacy.closeTime === "24:00"
                                ? "24시간 운영"
                                : `${pharmacy.openTime} - ${pharmacy.closeTime}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button size="sm" asChild>
                          <Link href={`/pharmacy/${pharmacy.id}`}>상세보기</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.location.href = `tel:${pharmacy.phone}`
                          }}
                        >
                          <Phone className="mr-1 h-3 w-3" />
                          전화
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* SEO Content */}
        <div className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-4 py-8">
            <h2 className="mb-4 text-lg font-semibold">{city} 지역 약국 안내</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {city} 지역의 약국 정보를 제공합니다. 야간 운영, 공휴일 운영 약국을
              필터링하여 원하는 약국을 쉽게 찾을 수 있습니다. 영업시간은 실제와 다를 수
              있으니 방문 전 전화 확인을 권장합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNightOnly(true)
                  setShowHolidayOnly(false)
                }}
              >
                {city} 야간 약국
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNightOnly(false)
                  setShowHolidayOnly(true)
                }}
              >
                {city} 공휴일 약국
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNightOnly(true)
                  setShowHolidayOnly(true)
                }}
              >
                {city} 24시 약국
              </Button>
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
