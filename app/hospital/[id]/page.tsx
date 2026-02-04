"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Heart,
  Share2,
  ChevronLeft,
  ExternalLink,
  Star,
  Calendar,
  Stethoscope,
} from "lucide-react"

interface HospitalDetail {
  id: string
  name: string
  address: string
  phone: string
  isOpen: boolean
  openTime: string
  closeTime: string
  departments: string[]
  lat: number
  lng: number
  rating?: number
  reviewCount?: number
  distance?: string
  description?: string
  weekdayHours?: string
  saturdayHours?: string
  sundayHours?: string
  lunchTime?: string
}

// 샘플 데이터 (실제로는 API 호출)
const sampleHospitals: Record<string, HospitalDetail> = {
  "1": {
    id: "1",
    name: "서울대학교병원",
    address: "서울특별시 종로구 대학로 101",
    phone: "02-2072-2114",
    isOpen: true,
    openTime: "08:30",
    closeTime: "17:30",
    departments: ["내과", "외과", "정형외과", "신경과", "피부과", "이비인후과", "안과"],
    lat: 37.5796,
    lng: 127.0003,
    rating: 4.5,
    reviewCount: 2847,
    distance: "1.2km",
    description: "서울대학교병원은 1885년 설립된 대한민국 최초의 서양식 국립 의료기관입니다.",
    weekdayHours: "08:30 - 17:30",
    saturdayHours: "08:30 - 12:30",
    sundayHours: "휴진",
    lunchTime: "12:30 - 13:30",
  },
  "2": {
    id: "2",
    name: "연세세브란스병원",
    address: "서울특별시 서대문구 연세로 50-1",
    phone: "02-2228-1114",
    isOpen: true,
    openTime: "08:00",
    closeTime: "18:00",
    departments: ["내과", "소아과", "피부과", "신경외과", "심장내과"],
    lat: 37.5622,
    lng: 126.9408,
    rating: 4.6,
    reviewCount: 3156,
    distance: "2.5km",
    description: "연세대학교 의료원 산하 병원으로, 최첨단 의료 시스템을 갖추고 있습니다.",
    weekdayHours: "08:00 - 18:00",
    saturdayHours: "08:00 - 12:00",
    sundayHours: "휴진",
    lunchTime: "12:00 - 13:00",
  },
  "5": {
    id: "5",
    name: "삼성서울병원",
    address: "서울특별시 강남구 일원로 81",
    phone: "02-3410-2114",
    isOpen: true,
    openTime: "08:00",
    closeTime: "17:00",
    departments: ["내과", "외과", "안과", "이비인후과", "암센터", "심장센터"],
    lat: 37.4881,
    lng: 127.0855,
    rating: 4.7,
    reviewCount: 4521,
    distance: "5.3km",
    description: "삼성의료원 산하 종합병원으로, 첨단 의료장비와 우수한 의료진을 보유하고 있습니다.",
    weekdayHours: "08:00 - 17:00",
    saturdayHours: "08:00 - 12:00",
    sundayHours: "휴진",
    lunchTime: "12:00 - 13:00",
  },
}

export default function HospitalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [hospital, setHospital] = useState<HospitalDetail | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 실제로는 API 호출
    const id = params.id as string
    const data = sampleHospitals[id]
    
    if (data) {
      setHospital(data)
    }
    setIsLoading(false)
  }, [params.id])

  const handleCall = () => {
    if (hospital?.phone) {
      window.location.href = `tel:${hospital.phone}`
    }
  }

  const handleNavigation = () => {
    if (hospital) {
      // 네이버 지도 길찾기
      window.open(
        `https://map.naver.com/v5/directions/-/-/-/transit?c=${hospital.lng},${hospital.lat},15,0,0,0,dh`,
        "_blank"
      )
    }
  }

  const handleShare = async () => {
    if (navigator.share && hospital) {
      try {
        await navigator.share({
          title: hospital.name,
          text: `${hospital.name} - ${hospital.address}`,
          url: window.location.href,
        })
      } catch {
        // 공유 취소 시 무시
      }
    }
  }

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

  if (!hospital) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">병원을 찾을 수 없습니다</h1>
          <p className="mb-6 text-center text-muted-foreground">
            요청하신 병원 정보가 존재하지 않습니다.
          </p>
          <Button asChild>
            <Link href="/search">병원 검색으로 돌아가기</Link>
          </Button>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        {/* Back Button */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="-ml-2"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              뒤로가기
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Hospital Header */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">{hospital.name}</h1>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {hospital.rating && (
                          <>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{hospital.rating}</span>
                            <span>({hospital.reviewCount?.toLocaleString()})</span>
                          </>
                        )}
                        {hospital.distance && (
                          <>
                            <span className="text-border">•</span>
                            <span>{hospital.distance}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={hospital.isOpen ? "default" : "secondary"}>
                    {hospital.isOpen ? "영업 중" : "영업 종료"}
                  </Badge>
                </div>

                {hospital.description && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {hospital.description}
                  </p>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button onClick={handleCall} className="flex-1">
                    <Phone className="mr-2 h-4 w-4" />
                    전화하기
                  </Button>
                  <Button onClick={handleNavigation} variant="outline" className="flex-1">
                    <Navigation className="mr-2 h-4 w-4" />
                    길찾기
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsBookmarked(!isBookmarked)}
                  >
                    <Heart
                      className={`h-4 w-4 ${isBookmarked ? "fill-red-500 text-red-500" : ""}`}
                    />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Location Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                  위치 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{hospital.address}</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(hospital.address)
                    }}
                  >
                    주소 복사
                  </Button>
                </div>

                {/* Map Placeholder */}
                <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">지도 영역</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleNavigation}
                      className="mt-1"
                    >
                      네이버 지도에서 보기
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  영업시간
                </CardTitle>
                <CardDescription>
                  실제 영업시간과 다를 수 있으니 방문 전 전화 확인을 권장합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">평일</span>
                    <span className="font-medium">{hospital.weekdayHours}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">토요일</span>
                    <span className="font-medium">{hospital.saturdayHours}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">일요일/공휴일</span>
                    <span className="font-medium">{hospital.sundayHours}</span>
                  </div>
                  {hospital.lunchTime && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">점심시간</span>
                        <span className="font-medium">{hospital.lunchTime}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Departments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  진료과목
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {hospital.departments.map((dept) => (
                    <Badge key={dept} variant="secondary">
                      {dept}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5 text-primary" />
                  연락처
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{hospital.phone}</span>
                  <Button variant="outline" size="sm" onClick={handleCall}>
                    전화 걸기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search for similar hospitals */}
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-3 font-semibold">주변 다른 병원도 찾아보세요</h3>
                <div className="flex flex-wrap gap-2">
                  {hospital.departments.slice(0, 3).map((dept) => (
                    <Button key={dept} variant="outline" size="sm" asChild>
                      <Link href={`/search?department=${encodeURIComponent(dept)}`}>
                        {dept} 전문 병원
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
