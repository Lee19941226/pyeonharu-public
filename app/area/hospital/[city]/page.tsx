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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Navigation,
} from "lucide-react"

interface Hospital {
  id: string
  name: string
  address: string
  phone: string
  isOpen: boolean
  openTime: string
  closeTime: string
  departments: string[]
  distance?: string
}

// 샘플 데이터
const sampleHospitals: Record<string, Hospital[]> = {
  "서울": [
    {
      id: "1",
      name: "서울대학교병원",
      address: "서울특별시 종로구 대학로 101",
      phone: "02-2072-2114",
      isOpen: true,
      openTime: "08:30",
      closeTime: "17:30",
      departments: ["내과", "외과", "정형외과", "신경과"],
    },
    {
      id: "2",
      name: "연세세브란스병원",
      address: "서울특별시 서대문구 연세로 50-1",
      phone: "02-2228-1114",
      isOpen: true,
      openTime: "08:00",
      closeTime: "18:00",
      departments: ["내과", "소아과", "피부과"],
    },
    {
      id: "5",
      name: "삼성서울병원",
      address: "서울특별시 강남구 일원로 81",
      phone: "02-3410-2114",
      isOpen: true,
      openTime: "08:00",
      closeTime: "17:00",
      departments: ["내과", "외과", "안과", "이비인후과"],
    },
  ],
  "강남구": [
    {
      id: "5",
      name: "삼성서울병원",
      address: "서울특별시 강남구 일원로 81",
      phone: "02-3410-2114",
      isOpen: true,
      openTime: "08:00",
      closeTime: "17:00",
      departments: ["내과", "외과", "안과", "이비인후과"],
    },
    {
      id: "10",
      name: "강남세브란스병원",
      address: "서울특별시 강남구 언주로 211",
      phone: "02-2019-3114",
      isOpen: true,
      openTime: "08:00",
      closeTime: "17:30",
      departments: ["내과", "정형외과", "신경외과"],
    },
  ],
  "종로구": [
    {
      id: "1",
      name: "서울대학교병원",
      address: "서울특별시 종로구 대학로 101",
      phone: "02-2072-2114",
      isOpen: true,
      openTime: "08:30",
      closeTime: "17:30",
      departments: ["내과", "외과", "정형외과", "신경과"],
    },
  ],
}

const departments = [
  "전체",
  "내과",
  "외과",
  "정형외과",
  "신경과",
  "피부과",
  "이비인후과",
  "안과",
  "소아과",
  "산부인과",
  "비뇨기과",
  "정신건강의학과",
]

export default function AreaHospitalPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const city = decodeURIComponent(params.city as string)
  
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("전체")
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  
  const itemsPerPage = 10

  useEffect(() => {
    // 실제로는 API 호출
    const data = sampleHospitals[city] || []
    setHospitals(data)
    setFilteredHospitals(data)
    setIsLoading(false)
    
    // URL 파라미터에서 진료과 필터 확인
    const deptParam = searchParams.get("department")
    if (deptParam) {
      setSelectedDepartment(deptParam)
    }
  }, [city, searchParams])

  useEffect(() => {
    let result = hospitals

    // 검색어 필터
    if (searchQuery) {
      result = result.filter(
        (h) =>
          h.name.includes(searchQuery) ||
          h.address.includes(searchQuery) ||
          h.departments.some((d) => d.includes(searchQuery))
      )
    }

    // 진료과 필터
    if (selectedDepartment !== "전체") {
      result = result.filter((h) =>
        h.departments.includes(selectedDepartment)
      )
    }

    // 영업중 필터
    if (showOpenOnly) {
      result = result.filter((h) => h.isOpen)
    }

    setFilteredHospitals(result)
    setCurrentPage(1)
  }, [hospitals, searchQuery, selectedDepartment, showOpenOnly])

  const totalPages = Math.ceil(filteredHospitals.length / itemsPerPage)
  const currentHospitals = filteredHospitals.slice(
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{city} 병원</h1>
                <p className="text-sm text-muted-foreground">
                  총 {filteredHospitals.length}개의 병원
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="병원명, 주소, 진료과로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Department Filter */}
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="진료과 선택" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Open Now Filter */}
              <Button
                variant={showOpenOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOpenOnly(!showOpenOnly)}
                className="w-full md:w-auto"
              >
                <Clock className="mr-2 h-4 w-4" />
                영업 중만
              </Button>
            </div>
          </div>
        </div>

        {/* Hospital List */}
        <div className="container mx-auto px-4 py-6">
          {currentHospitals.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">검색 결과가 없습니다</h3>
              <p className="text-muted-foreground">
                다른 검색어나 필터를 시도해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentHospitals.map((hospital) => (
                <Card key={hospital.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Link
                            href={`/hospital/${hospital.id}`}
                            className="text-lg font-semibold hover:text-primary"
                          >
                            {hospital.name}
                          </Link>
                          <Badge
                            variant={hospital.isOpen ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {hospital.isOpen ? "영업 중" : "영업 종료"}
                          </Badge>
                        </div>

                        <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span>{hospital.address}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <span>{hospital.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>
                              {hospital.openTime} - {hospital.closeTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {hospital.departments.map((dept) => (
                            <Badge key={dept} variant="outline" className="text-xs">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button size="sm" asChild>
                          <Link href={`/hospital/${hospital.id}`}>상세보기</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.location.href = `tel:${hospital.phone}`
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
            <h2 className="mb-4 text-lg font-semibold">{city} 지역 병원 안내</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {city} 지역의 병원 정보를 제공합니다. 진료과별로 필터링하여 원하는 병원을
              쉽게 찾을 수 있습니다. 영업시간은 실제와 다를 수 있으니 방문 전 전화
              확인을 권장합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {departments.slice(1).map((dept) => (
                <Button
                  key={dept}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDepartment(dept)}
                >
                  {city} {dept}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
