import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
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
              <Link href="/search">
                서비스 둘러보기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/login">무료로 시작하기</Link>
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary-foreground/10" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary-foreground/10" />
      </div>
    </section>
  )
}
