"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Store,
  Activity,
  Stethoscope,
  Building2,
  Pill,
  Camera,
  MessageSquare,
  Heart,
  Mail,
  Users,
  Sparkles,
  GraduationCap,
  Copy,
} from "lucide-react";

const mealFeatures = [
  {
    icon: ShieldCheck,
    title: "식품 안전 확인",
    tab: "식사 > 식품",
    description:
      "바코드 스캔이나 음식 사진 한 장으로 알레르기 성분을 5초 만에 확인합니다. 식약처 공공데이터 기반으로 정확한 정보를 제공하고, AI가 추가 분석을 도와줍니다.",
    highlights: ["바코드 스캔", "사진 AI 분석", "학교 급식 체크"],
  },
  {
    icon: Store,
    title: "음식점 알레르기 매칭",
    tab: "식사 > 음식점",
    description:
      "내 위치 주변 음식점을 검색하고, 내 알레르기 기준으로 위험도를 자동 분류합니다. AI가 메뉴를 분석해 안전한 선택지를 추천해줍니다.",
    highlights: ["위치 기반 검색", "알레르기 위험도 표시", "AI 메뉴 분석"],
  },
  {
    icon: Activity,
    title: "식단관리",
    tab: "식사 > 식단관리",
    description:
      "음식 사진만 촬영하면 AI가 칼로리를 추정합니다. 일일 식단을 기록하고 BMR 기반 목표 대비 섭취량을 한눈에 확인할 수 있습니다.",
    highlights: ["사진 칼로리 추정", "일일 식단 기록", "BMR 기반 목표 관리"],
  },
];

const sickFeatures = [
  {
    icon: Stethoscope,
    title: "AI 증상 분석",
    tab: "아파요 > 증상",
    description:
      "증상을 입력하면 AI가 어떤 진료과를 가야 하는지 추천합니다. 긴급도를 판단해 응급 상황 대응에도 도움을 줍니다.",
    highlights: ["진료과 추천", "긴급도 판단", "응급 안내"],
  },
  {
    icon: Building2,
    title: "병원 찾기",
    tab: "아파요 > 병원",
    description:
      "현재 위치 기반으로 가까운 병원을 찾아줍니다. 진료과 필터, 전화 연결, 길찾기까지 바로 할 수 있습니다.",
    highlights: ["위치 기반 검색", "진료과 필터", "전화·길찾기"],
  },
  {
    icon: Pill,
    title: "약 정보 검색",
    tab: "아파요 > 약",
    description:
      "약 이름을 검색하면 복용법, 주의사항, 부작용, 병용금기 정보를 한눈에 확인할 수 있습니다.",
    highlights: ["복용법 안내", "부작용 확인", "병용금기 정보"],
  },
];

const extraFeatures = [
  {
    icon: GraduationCap,
    title: "학교 급식 알레르기 체크",
    description:
      "학교를 등록하면 매일 급식 메뉴에서 위험한 알레르기 성분을 자동으로 표시합니다.",
  },
  {
    icon: MessageSquare,
    title: "학교 커뮤니티",
    description:
      "같은 학교 학생들과 소통할 수 있는 커뮤니티입니다. 졸업생·재학생 구분, 기수 표기 등 계속 발전시킬 예정입니다.",
  },
  {
    icon: Camera,
    title: "사진 한 장이면 끝",
    description:
      "알레르기 확인, 칼로리 추정 모두 사진 촬영만으로 가능합니다. AI가 불안하다면 직접 입력도 가능합니다.",
  },
];

function CtaSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return (
    <section className="container mx-auto px-4 py-12 md:py-16 text-center">
      <h2 className="text-2xl font-bold md:text-3xl">지금 바로 시작해보세요</h2>
      <p className="mt-4 text-muted-foreground">
        어떤 고민이 있어도 편안한 식사, 편하루가 도와드릴게요.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90"
        >
          편하루 시작하기
        </Link>
        {!isLoggedIn && (
          <Link
            href="/sign-up"
            className="rounded-xl border border-border px-6 py-3 text-sm font-semibold transition-all hover:bg-muted"
          >
            회원가입
          </Link>
        )}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
              <span className="text-4xl font-bold text-primary-foreground">
                편
              </span>
            </div>
            <h1 className="text-pretty text-3xl font-bold md:text-4xl lg:text-5xl">
              어떤 고민이 있어도
              <br />
              <span className="text-primary">편안하게 메뉴를 고를 수 있게</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              바코드·사진 한 번이면 알레르기 확인 5초.
              <br />
              급식 체크, 주변 음식점 서칭, 칼로리 관리, AI 증상 분석까지.
              <br />
              편안한 하루의 식사, 편하루.
            </p>
          </div>
        </section>

        {/* 팀 소개 */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">만든 사람들</h2>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  편하루는{" "}
                  <strong className="text-foreground">신입 개발자</strong>로
                  이루어진 소규모 팀이 만들었습니다. 식사할 때 조금이라도
                  편하게, 그리고 학교에서 서로 소통할 수 있도록 구성했습니다.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  쓴소리도 환영합니다. 부족한 점은 저희의 역량 부족이고, 모든
                  피드백을 받아들일 준비가 되어있습니다.
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    pyeonharu@gmail.com
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 🍴 식사 기능 */}
        <section className="bg-amber-50/50 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">
                🍴 식사
              </span>
              <h2 className="mt-4 text-2xl font-bold md:text-3xl">
                먹을 때 필요한 모든 것
              </h2>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
              {mealFeatures.map((feature) => (
                <Card key={feature.title} className="border-amber-200/50">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                        <feature.icon className="h-4.5 w-4.5 text-amber-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">{feature.title}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          {feature.tab}
                        </p>
                      </div>
                    </div>
                    <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {feature.highlights.map((h) => (
                        <span
                          key={h}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 💔 아파요 기능 */}
        <section className="bg-rose-50/50 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-1.5 text-sm font-semibold text-rose-800">
                💔 아파요
              </span>
              <h2 className="mt-4 text-2xl font-bold md:text-3xl">
                아플 때 필요한 모든 것
              </h2>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
              {sickFeatures.map((feature) => (
                <Card key={feature.title} className="border-rose-200/50">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100">
                        <feature.icon className="h-4.5 w-4.5 text-rose-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">{feature.title}</h3>
                        <p className="text-[10px] text-muted-foreground">
                          {feature.tab}
                        </p>
                      </div>
                    </div>
                    <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {feature.highlights.map((h) => (
                        <span
                          key={h}
                          className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-800"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 추가 기능 */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">그 외 기능</h2>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-3">
            {extraFeatures.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-1.5 text-sm font-bold">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 후원 안내 */}
        <section className="bg-amber-50/50 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-lg">
              <Card className="border-2 border-amber-200">
                <CardContent className="p-6 text-center md:p-8">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <Heart className="h-6 w-6 text-amber-600" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold">후원 안내</h2>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    하고 싶지만 현실적인 문제로 못해본 것들이 너무 많습니다.
                    <br />
                    후원은 팀이 유지되는 데 정말 큰 도움이 됩니다.
                  </p>
                  <div className="rounded-xl bg-amber-100 px-6 py-4">
                    <p className="text-xs text-amber-700">카카오뱅크</p>
                    <p className="mt-1 text-lg font-bold text-amber-900">
                      3333-03-3043-114
                    </p>
                    <p className="text-xs text-amber-700">이진원</p>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      pyeonharu@gmail.com
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <CtaSection />
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
