"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MapPin } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface GuideData {
  allergen: string;
  immediateActions: string[];
  emergencySymptoms: string[];
  hospitalSymptoms: string[];
  alternatives: Array<{
    name: string;
    emoji: string;
  }>;
}

export default function EmergencyGuidePage() {
  const params = useParams();
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGuide();
  }, [params.id]);

  const loadGuide = async () => {
    try {
      const response = await fetch(`/api/food/guide?code=${params.id}`);
      const data = await response.json();

      if (data.success) {
        setGuide(data.guide);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !guide) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>가이드 로딩 중...</p>
      </div>
    );
  }

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
