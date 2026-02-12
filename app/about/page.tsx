import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Stethoscope, Pill, ShieldCheck, Heart, Users, Sparkles, UtensilsCrossed } from "lucide-react"

const features = [
  {
    icon: ShieldCheck,
    title: "이거 먹어도 돼?",
    description: "바코드 스캔이나 음식 사진 한 장으로 알레르기 성분을 5초 만에 확인하세요.",
  },
  {
    icon: UtensilsCrossed,
    title: "급식 알레르기 체크",
    description: "학교를 등록하면 매일 급식 메뉴에서 위험한 알레르기 성분을 자동으로 표시해요.",
  },
  {
    icon: Stethoscope,
    title: "AI 증상 분석",
    description: "증상을 입력하면 AI가 적합한 진료과를 추천하고 주변 병원을 연결해드려요.",
  },
  {
    icon: Pill,
    title: "약 정보 검색",
    description: "약 이름으로 복용법, 주의사항, 부작용, 병용금지 약물 정보를 확인하세요.",
  },
]

const values = [
  {
    icon: Heart,
    title: "안심",
    description: "먹기 전 확인, 먹는 중 안심, 먹은 후 대응까지.",
  },
  {
    icon: Users,
    title: "접근성",
    description: "누구나 쉽게 사용할 수 있는 서비스를 만듭니다.",
  },
  {
    icon: Sparkles,
    title: "혁신",
    description: "AI로 더 빠르고 정확한 알레르기 확인을 제공합니다.",
  },
]

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
              <span className="text-4xl font-bold text-primary-foreground">편</span>
            </div>
            <h1 className="text-pretty text-3xl font-bold md:text-4xl lg:text-5xl">
              알레르기가 있어도<br />
              <span className="text-primary">편안하게 메뉴를 고를 수 있게</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              바코드·사진 한 번이면 알레르기 확인 5초.
              급식 체크, 맛집 매칭, AI 증상 분석까지.
              편안한 하루의 식사, 편하루.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">주요 기능</h2>
            <p className="mt-4 text-muted-foreground">
              편하루가 제공하는 핵심 서비스들을 소개합니다.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold md:text-3xl">편하루의 가치</h2>
            </div>
            <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-3">
              {values.map((value) => (
                <div key={value.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 font-semibold">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
