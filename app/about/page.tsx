import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Stethoscope, Pill, ShieldCheck, Heart, Users, Sparkles } from "lucide-react"

const features = [
  {
    icon: MapPin,
    title: "내 주변 병원/약국 찾기",
    description: "현재 위치를 기반으로 가까운 병원과 약국을 지도에서 한눈에 찾을 수 있어요.",
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
  {
    icon: ShieldCheck,
    title: "식품 알레르기 확인",
    description: "바코드 스캔 한 번으로 우리 가족이 먹어도 되는 식품인지 3초 만에 확인하세요.",
  },
]

const values = [
  {
    icon: Heart,
    title: "안전",
    description: "우리 가족의 식품 안전을 최우선으로 지킵니다.",
  },
  {
    icon: Users,
    title: "접근성",
    description: "누구나 쉽게 사용할 수 있는 서비스를 만듭니다.",
  },
  {
    icon: Sparkles,
    title: "혁신",
    description: "AI를 활용해 더 스마트한 일상을 제공합니다.",
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
              우리 가족 <span className="text-primary">식품 안전</span>을<br />
              편하게 지키는 플랫폼, 편하루
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              바코드 한 번으로 알레르기 확인, 아플 때 병원 찾기.
              일상의 작은 불편함들을 편하루가 해결해드립니다.
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
