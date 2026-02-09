import Link from "next/link"
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-pretty text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            우리 가족 <span className="text-primary">식품 안전</span>을<br />
            편하게 지키는 하루
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            바코드 한 번이면 3초 만에 알레르기 확인. 
            내 주변 병원/약국 찾기부터 AI 증상 분석까지.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/food">
                <ShieldCheck className="mr-2 h-5 w-5" />
                식품 안전 확인
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent">
              <Link href="/search">
                <MapPin className="mr-2 h-5 w-5" />
                병원/약국 찾기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
    </section>
  )
}
