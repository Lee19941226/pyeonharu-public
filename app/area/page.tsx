import { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Cross, MapPin } from "lucide-react"
import { REGIONS } from "@/lib/region-codes"

export const metadata: Metadata = {
  title: "지역별 병원/약국 찾기 - 편하루",
  description: "전국 17개 시도의 병원과 약국을 찾아보세요.",
  keywords: ["지역별 병원", "지역별 약국", "전국 병원", "전국 약국"],
}

export default function AreaIndexPage() {
  const regions = Object.values(REGIONS)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            {/* 헤더 */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">지역별 병원/약국 찾기</h1>
              <p className="mt-2 text-muted-foreground">전국 17개 시도의 병원과 약국을 찾아보세요</p>
            </div>

            {/* 지역 목록 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regions.map((region) => (
                <Card key={region.slug} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <h2 className="mb-3 text-lg font-semibold">{region.name}</h2>
                    <div className="flex gap-2">
                      <Link
                        href={`/area/hospital/${region.slug}`}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                      >
                        <Building2 className="h-4 w-4" />
                        병원
                      </Link>
                      <Link
                        href={`/area/pharmacy/${region.slug}`}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                      >
                        <Cross className="h-4 w-4" />
                        약국
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
