import Link from "next/link"
import { MapPin, Shirt, ArrowRight, Stethoscope, Pill, CloudSun, History, Clock, Sparkles, Shield, Smartphone, Heart, User, Menu, X, Home, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DiseaseStatsSection } from "@/components/home/disease-stats-section"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">편</span>
            </div>
            <span className="text-xl font-bold">편하루</span>
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">병원/약국</Link>
            <Link href="/today" className="text-sm text-muted-foreground hover:text-foreground">오늘 뭐 입지?</Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">서비스 소개</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild className="hidden md:flex">
              <Link href="/login">로그인</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-pretty text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                <span className="text-primary">의식주</span>를<br />
                편하게 만드는 하루
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
                내 주변 병원/약국 찾기부터 AI 증상 분석, 날씨 기반 옷차림 추천까지.
                편하루와 함께 일상을 더 편하게 만들어보세요.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/search">
                    <MapPin className="mr-2 h-5 w-5" />
                    병원/약국 찾기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="bg-transparent">
                  <Link href="/today">
                    <Shirt className="mr-2 h-5 w-5" />
                    오늘의 코디 추천
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </section>

        {/* 감염병 현황 대시보드 - NEW */}
        <DiseaseStatsSection />

        {/* Medical Services */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-medium text-primary">내 주변 병원/약국</p>
            <h2 className="text-pretty text-3xl font-bold md:text-4xl">
              아플 때 가장 빠르게<br className="sm:hidden" /> 병원을 찾는 방법
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="group transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">지도로 검색</CardTitle>
                <CardDescription>현재 위치 기반으로 주변 병원과 약국을 지도에서 한눈에 확인하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" asChild className="-ml-4 text-primary">
                  <Link href="/search">바로가기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="group transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">증상으로 추천</CardTitle>
                <CardDescription>증상을 입력하면 AI가 적합한 진료과와 주변 병원을 추천해드립니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" asChild className="-ml-4 text-primary">
                  <Link href="/symptom">바로가기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="group transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Pill className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">약 정보 검색</CardTitle>
                <CardDescription>약 이름으로 복용법, 주의사항, 부작용 정보를 확인하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" asChild className="-ml-4 text-primary">
                  <Link href="/medicine">바로가기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Fashion Services */}
        <section className="bg-muted/30">
          <div className="container mx-auto px-4 py-16 md:py-20">
            <div className="mb-10 text-center">
              <p className="mb-2 text-sm font-medium text-accent">오늘 뭐 입지?</p>
              <h2 className="text-pretty text-3xl font-bold md:text-4xl">
                날씨에 맞는<br className="sm:hidden" /> 완벽한 옷차림
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="group transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent">
                    <CloudSun className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">오늘의 코디</CardTitle>
                  <CardDescription>오늘 날씨에 맞는 옷차림을 AI가 추천해드립니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" asChild className="-ml-4 text-accent">
                    <Link href="/today">바로가기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="group transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent">
                    <Shirt className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">내 옷장 관리</CardTitle>
                  <CardDescription>내 옷을 등록하고 관리하면 더 정확한 코디를 추천받을 수 있어요.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" asChild className="-ml-4 text-accent">
                    <Link href="/closet">바로가기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="group transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent">
                    <History className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">코디 기록</CardTitle>
                  <CardDescription>날짜별로 입었던 옷을 기록하고 코디를 평가해보세요.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" asChild className="-ml-4 text-accent">
                    <Link href="/history">바로가기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-pretty text-3xl font-bold md:text-4xl">왜 편하루인가요?</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">AI 기반 추천</h3>
              <p className="text-sm text-muted-foreground">증상을 분석해 적합한 진료과를 추천하고, 날씨에 맞는 코디를 제안해드립니다.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">신뢰할 수 있는 정보</h3>
              <p className="text-sm text-muted-foreground">공공 데이터 API를 활용해 정확한 병원/약국 정보와 의약품 정보를 제공합니다.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">모바일 최적화</h3>
              <p className="text-sm text-muted-foreground">언제 어디서나 스마트폰으로 편하게 이용할 수 있도록 모바일에 최적화했습니다.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center md:px-12 md:py-20">
            <div className="relative z-10">
              <h2 className="text-pretty text-3xl font-bold text-primary-foreground md:text-4xl">
                지금 바로 시작하세요
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
                회원가입 없이도 기본 기능을 이용할 수 있어요.
                로그인하면 즐겨찾기, 코디 기록 등 더 많은 기능을 이용할 수 있습니다.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/search">서비스 둘러보기 <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <Link href="/login">무료로 시작하기</Link>
                </Button>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary-foreground/10" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary-foreground/10" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <span className="text-lg font-bold text-primary-foreground">편</span>
                </div>
                <span className="text-xl font-bold">편하루</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">의식주를 편하게 만드는 생활 플랫폼</p>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">병원/약국</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/search" className="hover:text-foreground">지도로 검색</Link></li>
                <li><Link href="/symptom" className="hover:text-foreground">증상으로 추천</Link></li>
                <li><Link href="/medicine" className="hover:text-foreground">약 정보 검색</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">오늘 뭐 입지?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/today" className="hover:text-foreground">오늘의 코디</Link></li>
                <li><Link href="/closet" className="hover:text-foreground">내 옷장</Link></li>
                <li><Link href="/weather" className="hover:text-foreground">날씨 상세</Link></li>
                <li><Link href="/history" className="hover:text-foreground">코디 기록</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">고객지원</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">서비스 소개</Link></li>
                <li><Link href="/faq" className="hover:text-foreground">자주 묻는 질문</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-8">
            <p className="text-center text-sm text-muted-foreground">&copy; 2026 편하루. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-primary">
            <Home className="h-5 w-5" />
            <span>홈</span>
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <MapPin className="h-5 w-5" />
            <span>병원/약국</span>
          </Link>
          <Link href="/today" className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <Shirt className="h-5 w-5" />
            <span>코디</span>
          </Link>
          <Link href="/bookmarks" className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <Bookmark className="h-5 w-5" />
            <span>즐겨찾기</span>
          </Link>
          <Link href="/mypage" className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <User className="h-5 w-5" />
            <span>마이</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
