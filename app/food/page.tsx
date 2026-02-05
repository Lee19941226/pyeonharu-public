"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Camera, Search, Clock, Star } from "lucide-react";
export default function FoodPage() {
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserAllergens();
  }, []);

  const loadUserAllergens = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from("user_allergies")
      .select("allergen_name")
      .eq("user_id", user.id)
      .limit(3);

    if (data) {
      setAllergens(data.map((item) => item.allergen_name));
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <span className="text-4xl">🍽️</span>
            </div>
            <h1 className="mb-2 text-2xl font-bold md:text-3xl">
              이거 먹어도 돼?
            </h1>
            <p className="text-muted-foreground">알레르기 걱정 없이 안전하게</p>
          </div>

          {/* Allergy Profile */}
          {!isLoading && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium">내 알레르기 정보</span>
                  <Link href="/food/profile" className="text-sm text-primary">
                    관리하기 →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allergens.length > 0 ? (
                    <>
                      {allergens.map((allergen, idx) => (
                        <span
                          key={idx}
                          className="rounded-full border border-border bg-background px-3 py-1 text-sm"
                        >
                          {allergen}
                        </span>
                      ))}
                      <Link href="/food/profile">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-sm">
                          +더보기
                        </span>
                      </Link>
                    </>
                  ) : (
                    <Link href="/food/profile">
                      <span className="text-sm text-muted-foreground">
                        알레르기 정보를 등록해주세요
                      </span>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Method Selection */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              식품 확인 방법을 선택하세요
            </p>
          </div>

          <div className="space-y-4">
            {/* Camera */}
            <Link href="/food/camera">
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">상품 사진 촬영</p>
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        가장 빠름
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      라벨을 찍으면 즉시 분석해드려요
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Search */}
            <Link href="/food/search">
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">식품명 검색</p>
                    <p className="text-sm text-muted-foreground">
                      제품 이름으로 바로 찾기
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* 최근 확인한 제품 */}
            <Link href="/food/history">
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">최근 확인한 제품</p>
                    <p className="text-sm text-muted-foreground">
                      이전에 확인한 제품 다시보기
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* 즐겨찾기 */}
            <Link href="/food/favorites">
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">즐겨찾기</p>
                    <p className="text-sm text-muted-foreground">
                      자주 먹는 제품 빠르게 확인
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
