"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  MapPin,
  Phone,
  Cross,
  Navigation,
  Heart,
  Share2,
  AlertCircle,
} from "lucide-react"

function PharmacyDetailContent() {
  const searchParams = useSearchParams()
  
  const name = searchParams.get("name") || ""
  const address = searchParams.get("address") || ""
  const phone = searchParams.get("phone") || ""
  const lat = searchParams.get("lat") || ""
  const lng = searchParams.get("lng") || ""
  const distance = searchParams.get("distance") || ""

  if (!name) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <AlertCircle className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">약국 정보를 찾을 수 없습니다</h1>
          <p className="mb-6 text-center text-muted-foreground">잘못된 접근이거나 정보가 없습니다.</p>
          <Button asChild><Link href="/search">검색으로 돌아가기</Link></Button>
        </main>
        <MobileNav />
      </div>
    )
  }

  const naverMapWebUrl = `https://map.naver.com/v5/search/${encodeURIComponent(name + " " + address)}`
  const naverMapAppUrl = lat && lng 
    ? `nmap://place?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}`
    : naverMapWebUrl

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search"><ArrowLeft className="mr-2 h-4 w-4" />검색으로 돌아가기</Link>
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"><Cross className="mr-1 h-3 w-3" />약국</Badge>
                {distance && <span className="text-sm text-muted-foreground">{distance}</span>}
              </div>
              <h1 className="text-2xl font-bold">{name}</h1>
            </div>
            <div className="mb-6 flex gap-2">
              <Button className="flex-1" asChild><a href={`tel:${phone}`}><Phone className="mr-2 h-4 w-4" />전화하기</a></Button>
              <Button variant="outline" className="flex-1" asChild><a href={naverMapAppUrl} target="_blank" rel="noopener noreferrer"><Navigation className="mr-2 h-4 w-4" />길찾기</a></Button>
              <Button variant="outline" size="icon"><Heart className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
            </div>
            <Card className="mb-6">
              <CardContent className="p-0">
                <div className="relative h-72 w-full overflow-hidden rounded-t-lg bg-muted">
                  <iframe src={`https://map.naver.com/v5/embed/search/${encodeURIComponent(name + " " + address)}`} className="h-full w-full border-0" loading="lazy" allowFullScreen />
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{address}</p>
                      <a href={naverMapWebUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">네이버 지도에서 보기</a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">약국 정보</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div><p className="text-sm text-muted-foreground">전화번호</p><a href={`tel:${phone}`} className="font-medium text-primary">{phone}</a></div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div><p className="text-sm text-muted-foreground">주소</p><p className="font-medium">{address}</p></div>
                </div>
              </CardContent>
            </Card>
            <p className="text-center text-sm text-muted-foreground">정보가 정확하지 않을 수 있습니다. 방문 전 전화로 확인해주세요.</p>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

export default function PharmacyDetailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>로딩 중...</p></div>}>
      <PharmacyDetailContent />
    </Suspense>
  )
}
