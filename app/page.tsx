"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Camera, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";

const quickSymptomTags = [
  { label: "🤒 발열", value: "발열" },
  { label: "🤕 두통", value: "두통" },
  { label: "🤢 복통", value: "복통" },
  { label: "🤧 감기", value: "감기" },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, openLoginModal } = useAuth();
  const [symptomQuery, setSymptomQuery] = useState("");
  const [foodQuery, setFoodQuery] = useState("");

  const handleSymptomSearch = (query?: string) => {
    const searchQuery = query || symptomQuery;
    if (!searchQuery.trim()) return;

    // AI 기능 → 로그인 필수
    if (!user) {
      openLoginModal();
      return;
    }
    router.push(`/symptom?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleFoodCheck = () => {
    if (!user) {
      openLoginModal();
      return;
    }
    if (foodQuery.trim()) {
      // 식품 검색 페이지로 이동
      router.push(`/food/search?q=${encodeURIComponent(foodQuery)}`);
    }
  };

  const handleFoodPhoto = () => {
    if (!user) {
      openLoginModal();
      return;
    }
    // 카메라 촬영 페이지로 이동
    router.push("/food/camera");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Greeting Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background px-4 pb-6 pt-8">
          <div className="container mx-auto max-w-3xl">
            <h1 className="text-2xl font-bold md:text-3xl">
              {isLoading
                ? "..."
                : user
                  ? `${user.name}님, 오늘 무엇을 도와드릴까요?`
                  : "오늘 무엇을 도와드릴까요?"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              편하루가 일상의 불편함을 해결해드려요
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-3xl space-y-5 px-4 pb-8">
          {/* Section 1: 몸이 아파요 */}
          <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            <div className="border-b border-border bg-blue-50/50 px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span className="text-xl">🏥</span>
                몸이 아파요
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                증상을 알려주세요, 주변 병원을 찾아드릴게요
              </p>
            </div>
            <div className="p-5">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="어디가 아프세요? (예: 두통, 배가 아파요)"
                  value={symptomQuery}
                  onChange={(e) => setSymptomQuery(e.target.value)}
                  className="pl-10 pr-20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSymptomSearch();
                  }}
                />
                <Button
                  size="sm"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  onClick={() => handleSymptomSearch()}
                  disabled={!symptomQuery.trim()}
                >
                  검색
                </Button>
              </div>

              {/* Quick Tags */}
              <div className="mt-3 flex flex-wrap gap-2">
                {quickSymptomTags.map((tag) => (
                  <button
                    key={tag.value}
                    onClick={() => handleSymptomSearch(tag.value)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                AI가 증상을 분석하고 적합한 진료과와 주변 병원을 추천해드려요
              </p>
            </div>
          </section>

          {/* Section 2: 이거 먹어도 돼? */}
          <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            <div className="border-b border-border bg-green-50/50 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <span className="text-xl">🍽️</span>
                    이거 먹어도 돼?
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    음식 사진이나 이름으로 알레르기를 확인하세요
                  </p>
                </div>
                <button
                  onClick={handleFoodPhoto}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="flex gap-2">
                <button
                  onClick={handleFoodPhoto}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Camera className="h-4 w-4" />
                  사진 촬영
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="새우깡, 바나나우유 등"
                    value={foodQuery}
                    onChange={(e) => setFoodQuery(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFoodCheck();
                    }}
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                내 알레르기 정보를 기반으로 안전 여부를 AI가 분석해드려요
              </p>
            </div>
          </section>

          {/* CTA Banner (State-dependent) */}
          {!isLoading && (
            <>
              {!user && (
                <section className="overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        🔐 로그인하고 알레르기 정보 등록하기
                      </p>
                      <p className="mt-0.5 text-sm text-primary-foreground/80">
                        맞춤 서비스를 위해 프로필을 완성해보세요
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={openLoginModal}
                    >
                      로그인
                    </Button>
                  </div>
                </section>
              )}

              {user && (
                <section className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-lg">🍽️</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        알레르기 정보를 등록해보세요
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        &quot;이거 먹어도 돼?&quot; 기능을 더 정확하게 이용할 수
                        있어요
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/food/profile">등록하기</Link>
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
