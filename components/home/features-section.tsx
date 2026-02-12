import { Clock, Sparkles, Shield, Smartphone } from "lucide-react"

const features = [
  {
    icon: Clock,
    title: "5초 만에 확인",
    description: "바코드 스캔이나 음식 사진 한 장이면 알레르기 성분을 바로 확인할 수 있어요.",
  },
  {
    icon: Sparkles,
    title: "AI 기반 분석",
    description: "증상을 분석해 적합한 진료과를 추천하고, 음식 사진에서 알레르기 성분을 추정해요.",
  },
  {
    icon: Shield,
    title: "신뢰할 수 있는 정보",
    description: "식약처·공공 데이터 API를 활용해 정확한 식품 성분과 의약품 정보를 제공합니다.",
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
            먹기 전 확인, 먹는 중 안심, 먹은 후 대응까지.
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
