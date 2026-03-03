import { Metadata } from "next";
import { scanProject } from "@/lib/utils/portfolio-scanner";
import { PortfolioBrowser } from "@/components/portfolio/portfolio-browser";
import { PortfolioTokenGate } from "@/components/portfolio/portfolio-token-gate";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "포트폴리오 - 편하루 소스코드",
  description:
    "편하루 프로젝트의 전체 소스코드를 카테고리별로 탐색할 수 있습니다.",
};

export const dynamic = "force-static";

export default function PortfolioPage() {
  const data = scanProject(process.cwd());

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <PortfolioTokenGate>
          <section className="bg-gradient-to-b from-indigo-50/50 to-background py-8 md:py-12 dark:from-indigo-950/20">
            <div className="container mx-auto px-4">
              <h1 className="text-2xl font-bold md:text-3xl">
                편하루 소스코드
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                프로젝트의 전체 소스코드를 카테고리별로 탐색할 수 있습니다.
              </p>
            </div>
          </section>
          <section className="container mx-auto px-4 py-6">
            <PortfolioBrowser data={data} />
          </section>
        </PortfolioTokenGate>
      </main>
      <Footer />
    </div>
  );
}
