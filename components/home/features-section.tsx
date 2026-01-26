import { Clock, Sparkles, Shield, Smartphone } from "lucide-react"

const features = [
  {
    icon: Clock,
    title: "24시간 정보 확인",
    description: "영업 중인 병원/약국만 필터링하거나 야간 진료 가능한 곳을 쉽게 찾을 수 있어요.",
  },
  {
    icon: Sparkles,
    title: "AI 기반 추천",
    description: "증상을 분석해 적합한 진료과를 추천하고, 날씨에 맞는 코디를 제안해드립니다.",
  },
  {
    icon: Shield,
    title: "신뢰할 수 있는 정보",
    description: "공공 데이터 API를 활용해 정확한 병원/약국 정보와 의약품 정보를 제공합니다.",
  },
  {
    icon: Smartphone,
    title: "모바일 최적화",
    description: "언제 어디서나 스마트폰으로 편하게 이용할 수 있도록 모바일에 최적화했습니다.",
  },
]

export function FeaturesSection() {
  return (
    <section className="border-y border-border bg-muted/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="text-pretty text-3xl font-bold md:text-4xl">
            편하루가 특별한 이유
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            일상의 불편함을 해결하기 위해 고민한 기능들을 만나보세요.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
