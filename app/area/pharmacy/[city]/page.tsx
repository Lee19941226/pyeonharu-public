import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Cross,
  MapPin,
  Phone,
  Search,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { REGIONS, getRegionBySlug } from "@/lib/region-codes";

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city } = await params;
  const region = getRegionBySlug(city);

  if (!region) {
    return { title: "지역을 찾을 수 없습니다 - 편하루" };
  }

  return {
    title: `${region.name} 약국 목록 - 편하루`,
    description: `${region.name} 지역의 약국을 찾아보세요. 영업 중인 약국, 야간 약국 정보를 제공합니다.`,
    keywords: [`${region.name} 약국`, `${region.name} 야간약국`, "약국 찾기"],
  };
}

export function generateStaticParams() {
  return Object.keys(REGIONS).map((city) => ({ city }));
}

async function getPharmacies(sidoCd: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/area/pharmacies?sidoCd=${sidoCd}&numOfRows=50`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) return { pharmacies: [], totalCount: 0 };

    const data = await res.json();
    return {
      pharmacies: data.pharmacies || [],
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error("Failed to fetch pharmacies:", error);
    return { pharmacies: [], totalCount: 0 };
  }
}

export default async function AreaPharmacyPage({ params }: PageProps) {
  const { city } = await params;
  const region = getRegionBySlug(city);

  if (!region) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mb-4 text-2xl font-bold">
                지원하지 않는 지역입니다
              </h1>
              <p className="mb-6 text-muted-foreground">
                해당 지역은 서비스 준비 중입니다.
              </p>
              <Button asChild>
                <Link href="/area">
                  <Search className="mr-2 h-4 w-4" />
                  전체 지역 보기
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  const { pharmacies, totalCount } = await getPharmacies(region.code);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            {/* 브레드크럼 */}
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                href="/area"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Search className="h-4 w-4" />
                전체 지역
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{region.name}</span>
            </div>

            {/* 헤더 */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Cross className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{region.name} 약국</h1>
                <p className="text-sm text-muted-foreground">
                  총 {totalCount.toLocaleString()}개
                </p>
              </div>
            </div>

            {/* 약국 목록 */}
            {pharmacies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Cross className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    등록된 약국이 없습니다.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pharmacies.map((pharmacy: any) => (
                  <Card
                    key={pharmacy.id}
                    className="transition-all hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h2 className="text-lg font-semibold">
                          {pharmacy.name}
                        </h2>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {pharmacy.sgguCdNm && (
                            <Badge variant="outline">{pharmacy.sgguCdNm}</Badge>
                          )}
                          {pharmacy.emdongNm && (
                            <Badge variant="secondary">
                              {pharmacy.emdongNm}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" />
                          {pharmacy.address}
                        </p>
                        {pharmacy.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0" />
                            {pharmacy.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {pharmacy.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            asChild
                          >
                            <a href={`tel:${pharmacy.phone}`}>
                              <Phone className="mr-1 h-4 w-4" />
                              전화
                            </a>
                          </Button>
                        )}
                        {pharmacy.lat > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            asChild
                          >
                            <a
                              href={`nmap://route/public?dlat=${pharmacy.lat}&dlng=${pharmacy.lng}&dname=${encodeURIComponent(pharmacy.name)}`}
                              target="_blank"
                            >
                              <Navigation className="mr-1 h-4 w-4" />
                              길찾기
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 병원 링크 */}
            <div className="mt-8 rounded-lg bg-primary/5 p-4">
              <p className="text-sm">
                🏥 {region.name} 병원도 찾고 계신가요?{" "}
                <Link
                  href={`/area/hospital/${city}`}
                  className="font-medium text-primary hover:underline"
                >
                  {region.name} 병원 목록 보기
                </Link>
              </p>
            </div>

            {/* 다른 지역 */}
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">다른 지역 약국</h2>
              <div className="flex flex-wrap gap-2">
                {Object.values(REGIONS)
                  .filter((r) => r.slug !== city)
                  .slice(0, 8)
                  .map((r) => (
                    <Link
                      key={r.slug}
                      href={`/area/pharmacy/${r.slug}`}
                      className="text-sm text-green-600 hover:underline dark:text-green-400"
                    >
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
  );
}
