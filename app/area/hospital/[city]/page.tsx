import { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, Phone, Search, Navigation, ChevronRight } from "lucide-react"
import { REGIONS, getRegionBySlug } from "@/lib/region-codes"

interface PageProps {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params
  const region = getRegionBySlug(city)
  
  if (!region) {
    return { title: "지역을 찾을 수 없습니다 - 편하루" }
  }

  return {
    title: `${region.name} 병원 목록 - 편하루`,
    description: `${region.name} 지역의 병원을 찾아보세요. 내과, 외과, 정형외과, 이비인후과 등 다양한 진료과 병원 정보를 제공합니다.`,
    keywords: [`${region.name} 병원`, `${region.name} 내과`, `${region.name} 정형외과`, "병원 찾기"],
  }
}

export function generateStaticParams() {
  return Object.keys(REGIONS).map((city) => ({ city }))
}

async function getHospitals(sidoCd: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const res = await fetch(
      `${baseUrl}/api/area/hospitals?sidoCd=${sidoCd}&numOfRows=50`,
      { next: { revalidate: 3600 } }
    )
    
    if (!res.ok) return { hospitals: [], totalCount: 0 }
    
    const data = await res.json()
    return { hospitals: data.hospitals || [], totalCount: data.totalCount || 0 }
  } catch (error) {
    console.error("Failed to fetch hospitals:", error)
    return { hospitals: [], totalCount: 0 }
  }
}

export default async function AreaHospitalPage({ params }: PageProps) {
  const { city } = await params
  const region = getRegionBySlug(city)

  if (!region) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mb-4 text-2xl font-bold">지원하지 않는 지역입니다</h1>
              <p className="mb-6 text-muted-foreground">해당 지역은 서비스 준비 중입니다.</p>
              <Button asChild>
                <Link href="/area"><Search className="mr-2 h-4 w-4" />전체 지역 보기</Link>
              </Button>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  const { hospitals, totalCount } = await getHospitals(region.code)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            {/* 브레드크럼 */}
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/area" className="hover:text-primary">전체 지역</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{region.name}</span>
            </div>
            
            {/* 헤더 */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{region.name} 병원</h1>
                <p className="text-sm text-muted-foreground">총 {totalCount.toLocaleString()}개</p>
              </div>
            </div>

            {/* 병원 목록 */}
            {hospitals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">등록된 병원이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {hospitals.map((hospital: any) => (
                  <Card key={hospital.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h2 className="text-lg font-semibold">{hospital.name}</h2>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {hospital.clCdNm && <Badge variant="secondary">{hospital.clCdNm}</Badge>}
                          {hospital.sgguCdNm && <Badge variant="outline">{hospital.sgguCdNm}</Badge>}
                          {hospital.drTotCnt > 0 && <Badge variant="outline">의사 {hospital.drTotCnt}명</Badge>}
                        </div>
                      </div>

                      <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" />{hospital.address}
                        </p>
                        {hospital.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0" />{hospital.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {hospital.phone && (
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <a href={`tel:${hospital.phone}`}><Phone className="mr-1 h-4 w-4" />전화</a>
                          </Button>
                        )}
                        {hospital.lat > 0 && (
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <a href={`nmap://route/public?dlat=${hospital.lat}&dlng=${hospital.lng}&dname=${encodeURIComponent(hospital.name)}`} target="_blank">
                              <Navigation className="mr-1 h-4 w-4" />길찾기
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 약국 링크 */}
            <div className="mt-8 rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
              <p className="text-sm">
                💊 {region.name} 약국도 찾고 계신가요?{" "}
                <Link href={`/area/pharmacy/${city}`} className="font-medium text-green-700 hover:underline dark:text-green-400">
                  {region.name} 약국 목록 보기
                </Link>
              </p>
            </div>

            {/* 다른 지역 */}
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">다른 지역 병원</h2>
              <div className="flex flex-wrap gap-2">
                {Object.values(REGIONS).filter(r => r.slug !== city).slice(0, 8).map((r) => (
                  <Link key={r.slug} href={`/area/hospital/${r.slug}`} className="text-sm text-primary hover:underline">
                    {r.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
