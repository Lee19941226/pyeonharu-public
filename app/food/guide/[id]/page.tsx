"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GuideData } from "@/types/food";
import type { Metadata } from "next";
import { AllergenInfo } from "@/lib/allergen-info";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // id는 알레르기 코드 (예: "egg", "milk" 등)
  const decodedId = decodeURIComponent(id);

  return {
    title: `${decodedId} 알레르기 대응 가이드`,
    description: `${decodedId} 알레르기 반응 시 즉시 행동 요령, 응급 증상 판단 기준, 대체 식품 정보를 확인하세요.`,
    openGraph: {
      title: `${decodedId} 알레르기 대응 가이드 | 편하루`,
      description: `${decodedId} 알레르기 긴급 대처법과 안전 식품 정보`,
      type: "article",
    },
  };
}
export default function EmergencyGuidePage() {
  const params = useParams();
  const router = useRouter();
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGuide();
  }, [params.id]);

  const loadGuide = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 가이드 로드 시작:", params.id);

      const url = `/api/food/guide?code=${params.id}`;
      console.log("📡 요청 URL:", url);

      const response = await fetch(url);
      console.log("📦 응답 상태:", response.status);

      const data = await response.json();
      console.log("📋 응답 데이터:", data);

      if (data.success) {
        setGuide(data.guide);
        console.log("✅ 가이드 설정 완료");
      } else {
        console.error("❌ API 에러:", data.error);
        setError(data.error || "가이드를 불러올 수 없습니다");
      }
    } catch (error) {
      console.error("💥 가이드 로드 에러:", error);
      setError("가이드를 불러오는 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 로딩 화면
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">AI 가이드 생성 중...</p>
            <p className="mt-2 text-sm text-muted-foreground">
              최대 10초 정도 걸릴 수 있습니다
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ✅ 에러 화면
  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="mx-auto max-w-md px-4 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="mb-2 text-xl font-bold">
              가이드를 불러올 수 없습니다
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                돌아가기
              </Button>
              <Button className="flex-1" onClick={loadGuide}>
                다시 시도
              </Button>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  // ✅ 가이드 없음 (추가 안전장치)
  if (!guide) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="mx-auto max-w-md px-4 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-xl font-bold">가이드 정보 없음</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              대응 가이드를 생성할 수 없습니다
            </p>
            <Button onClick={() => router.back()}>돌아가기</Button>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  // ✅ 정상 렌더링
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            {/* Title */}
            <Card className="mb-6 border-destructive bg-destructive/10">
              <CardContent className="p-6">
                <h1 className="text-xl font-bold text-destructive">
                  🚨 {guide.allergen} 알레르기 대응법
                </h1>
              </CardContent>
            </Card>

            {/* Immediate Actions */}
            <Card className="mb-6 border-l-4 border-orange-500">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-orange-900">
                  ⚡ 즉시 행동 (30초 이내)
                </h2>
                <div className="space-y-4">
                  {guide.immediateActions.map((action, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-destructive text-sm font-bold text-white">
                        {idx + 1}
                      </div>
                      <p className="flex-1 pt-1 text-sm">{action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Section */}
            <Card className="mb-6 bg-destructive/5">
              <CardContent className="p-6">
                <h2 className="mb-2 text-lg font-semibold text-destructive">
                  🏥 즉시 119에 연락하거나
                </h2>
                <h2 className="mb-4 text-lg font-semibold text-destructive">
                  응급실을 방문해야 하는 증상
                </h2>

                <div className="mb-4 rounded-lg bg-destructive/10 p-4">
                  <p className="mb-3 font-medium text-destructive">
                    🚑 생명을 위협하는 증상:
                  </p>
                  <ul className="space-y-2">
                    {guide.emergencySymptoms.map((symptom, idx) => (
                      <li key={idx} className="text-sm text-destructive">
                        • {symptom}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <a href="tel:119" className="flex-1">
                    <Button className="w-full" variant="destructive">
                      <Phone className="mr-2 h-4 w-4" />
                      119 전화
                    </Button>
                  </a>
                  <Link href="/search" className="flex-1">
                    <Button className="w-full" variant="outline">
                      <MapPin className="mr-2 h-4 w-4" />
                      응급실 찾기
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Hospital Symptoms */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">
                  🏥 병원 방문이 필요한 증상
                </h2>
                <ul className="space-y-2">
                  {guide.hospitalSymptoms?.map((symptom, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-orange-500">▪</span>
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Alternative Foods */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">
                  💊 대체 식품 추천
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  {guide.allergen} 없는 대체 스낵:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {guide.alternatives.map((alt, idx) => (
                    <Card key={idx} className="border-muted">
                      <CardContent className="p-4 text-center">
                        <div className="mb-2 text-3xl">{alt.emoji}</div>
                        <p className="text-sm font-medium">{alt.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
