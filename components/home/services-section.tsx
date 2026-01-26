import Link from "next/link"
import { MapPin, Stethoscope, Pill, Shirt, CloudSun, History, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const medicalServices = [
  {
    icon: MapPin,
    title: "지도로 검색",
    description: "현재 위치 기반으로 주변 병원과 약국을 지도에서 한눈에 확인하세요.",
    href: "/search",
  },
  {
    icon: Stethoscope,
    title: "증상으로 추천",
    description: "증상을 입력하면 AI가 적합한 진료과와 주변 병원을 추천해드립니다.",
    href: "/symptom",
  },
  {
    icon: Pill,
    title: "약 정보 검색",
    description: "약 이름으로 복용법, 주의사항, 부작용 정보를 확인하세요.",
    href: "/medicine",
  },
]

const fashionServices = [
  {
    icon: CloudSun,
    title: "오늘의 코디",
    description: "오늘 날씨에 맞는 옷차림을 AI가 추천해드립니다.",
    href: "/today",
  },
  {
    icon: Shirt,
    title: "내 옷장 관리",
    description: "내 옷을 등록하고 관리하면 더 정확한 코디를 추천받을 수 있어요.",
    href: "/closet",
  },
  {
    icon: History,
    title: "코디 기록",
    description: "날짜별로 입었던 옷을 기록하고 코디를 평가해보세요.",
    href: "/history",
  },
]

function ServiceCard({
  icon: Icon,
  title,
  description,
  href,
  variant = "default",
}: {
  icon: typeof MapPin
  title: string
  description: string
  href: string
  variant?: "default" | "accent"
}) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
      <CardHeader>
        <div
          className={`mb-2 flex h-12 w-12 items-center justify-center rounded-lg ${
            variant === "accent" ? "bg-accent/20 text-accent" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="ghost" asChild className="group/btn -ml-4 text-primary hover:text-primary">
          <Link href={href}>
            바로가기
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function ServicesSection() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      {/* Medical Services */}
      <div className="mb-16">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium text-primary">내 주변 병원/약국</p>
          <h2 className="text-pretty text-3xl font-bold md:text-4xl">
            아플 때 가장 빠르게<br className="sm:hidden" /> 병원을 찾는 방법
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            현재 위치 기반 검색부터 AI 증상 분석까지, 필요한 의료 정보를 빠르게 찾아보세요.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {medicalServices.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </div>

      {/* Fashion Services */}
      <div>
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium text-accent">오늘 뭐 입지?</p>
          <h2 className="text-pretty text-3xl font-bold md:text-4xl">
            날씨에 맞는<br className="sm:hidden" /> 완벽한 코디
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            오늘 날씨를 분석해서 최적의 옷차림을 추천해드립니다. 내 옷장을 등록하면 더 정확해져요.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {fashionServices.map((service) => (
            <ServiceCard key={service.title} {...service} variant="accent" />
          ))}
        </div>
      </div>
    </section>
  )
}
