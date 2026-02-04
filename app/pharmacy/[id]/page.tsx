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
  Cross,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Heart,
  Share2,
  ChevronLeft,
  ExternalLink,
  Star,
  Pill,
  CreditCard,
} from "lucide-react"

interface PharmacyDetail {
  id: string
  name: string
  address: string
  phone: string
  isOpen: boolean
  openTime: string
  closeTime: string
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
  services?: string[]
  hasNightService?: boolean
  hasHolidayService?: boolean
}

// 샘플 데이터 (실제로는 API 호출)
const samplePharmacies: Record<string, PharmacyDetail> = {
  "3": {
    id: "3",
    name: "온누리약국",
    address: "서울특별시 종로구 대학로 85",
    phone: "02-745-1234",
    isOpen: true,
    openTime: "09:00",
    closeTime: "21:00",
    lat: 37.5811,
    lng: 127.0012,
    rating: 4.3,
    reviewCount: 156,
    distance: "0.8km",
    description: "서울대병원 인근에 위치한 약국으로, 다양한 처방약과 일반의약품을 취급합니다.",
    weekdayHours: "09:00 - 21:00",
    saturdayHours: "09:00 - 18:00",
    sundayHours: "휴무",
    lunchTime: "12:30 - 13:30",
    services: ["처방전 조제", "일반의약품", "건강기능식품", "의료기기"],
    hasNightService: true,
    hasHolidayService: false,
  },
  "4": {
    id: "4",
    name: "건강약국",
    address: "서울특별시 종로구 혜화로 12",
    phone: "02-765-5678",
    isOpen: false,
    openTime: "09:00",
    closeTime: "18:00",
    lat: 37.5825,
    lng: 126.9988,
    rating: 4.1,
    reviewCount: 89,
    distance: "1.0km",
    description: "지역 주민들에게 친절한 상담과 복약지도를 제공하는 동네 약국입니다.",
    weekdayHours: "09:00 - 18:00",
    saturdayHours: "09:00 - 13:00",
    sundayHours: "휴무",
    services: ["처방전 조제", "일반의약품", "복약 상담"],
    hasNightService: false,
    hasHolidayService: false,
  },
  "6": {
    id: "6",
    name: "24시 세브란스약국",
    address: "서울특별시 서대문구 연세로 48",
    phone: "02-365-2424",
    isOpen: true,
    openTime: "00:00",
    closeTime: "24:00",
    lat: 37.5618,
    lng: 126.9402,
    rating: 4.5,
    reviewCount: 423,
    distance: "2.3km",
    description: "24시간 운영하는 약국으로, 야간 및 응급 상황에도 이용 가능합니다.",
    weekdayHours: "24시간",
    saturdayHours: "24시간",
    sundayHours: "24시간",
    services: ["처방전 조제", "일반의약품", "건강기능식품", "응급 의약품"],
    hasNightService: true,
    hasHolidayService: true,
  },
}

export default function PharmacyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [pharmacy, setPharmacy] = useState<PharmacyDetail | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 실제로는 API 호출
    const id = params.id as string
    const data = samplePharmacies[id]
    
    if (data) {
      setPharmacy(data)
    }
    setIsLoading(false)
  }, [params.id])

  const handleCall = () => {
    if (pharmacy?.phone) {
      window.location.href = `tel:${pharmacy.phone}`
    }
  }

  const handleNavigation = () => {
    if (pharmacy) {
      // 네이버 지도 길찾기
      window.open(
        `https://map.naver.com/v5/directions/-/-/-/transit?c=${pharmacy.lng},${pharmacy.lat},15,0,0,0,dh`,
        "_blank"
      )
    }
  }

  const handleShare = async () => {
    if (navigator.share && pharmacy) {
      try {
        await navigator.share({
          title: pharmacy.name,
          text: `${pharmacy.name} - ${pharmacy.address}`,
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

  if (!pharmacy) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <Cross className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">약국을 찾을 수 없습니다</h1>
          <p className="mb-6 text-center text-muted-foreground">
            요청하신 약국 정보가 존재하지 않습니다.
          </p>
          <Button asChild>
            <Link href="/search">약국 검색으로 돌아가기</Link>
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
            {/* Pharmacy Header */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                      <Cross className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">{pharmacy.name}</h1>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {pharmacy.rating && (
                          <>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{pharmacy.rating}</span>
                            <span>({pharmacy.reviewCount?.toLocaleString()})</span>
                          </>
                        )}
                        {pharmacy.distance && (
                          <>
                            <span className="text-border">•</span>
                            <span>{pharmacy.distance}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={pharmacy.isOpen ? "default" : "secondary"}>
                      {pharmacy.isOpen ? "영업 중" : "영업 종료"}
                    </Badge>
                    {pharmacy.hasNightService && (
                      <Badge variant="outline" className="text-xs">
                        야간 운영
                      </Badge>
                    )}
                  </div>
                </div>

                {pharmacy.description && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {pharmacy.description}
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
                  <p className="font-medium">{pharmacy.address}</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(pharmacy.address)
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
                    <span className="font-medium">{pharmacy.weekdayHours}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">토요일</span>
                    <span className="font-medium">{pharmacy.saturdayHours}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">일요일/공휴일</span>
                    <span className="font-medium">{pharmacy.sundayHours}</span>
                  </div>
                  {pharmacy.lunchTime && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">점심시간</span>
                        <span className="font-medium">{pharmacy.lunchTime}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Special Hours Badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {pharmacy.hasNightService && (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      야간 운영
                    </Badge>
                  )}
                  {pharmacy.hasHolidayService && (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      공휴일 운영
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            {pharmacy.services && pharmacy.services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Pill className="h-5 w-5 text-primary" />
                    제공 서비스
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {pharmacy.services.map((service) => (
                      <Badge key={service} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <span className="font-medium">{pharmacy.phone}</span>
                  <Button variant="outline" size="sm" onClick={handleCall}>
                    전화 걸기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Medicine Search Link */}
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-3 font-semibold">약 정보가 필요하신가요?</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  약 이름으로 복용법, 주의사항, 부작용 정보를 확인해보세요.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/medicine">
                    <Pill className="mr-2 h-4 w-4" />
                    약 정보 검색하기
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
