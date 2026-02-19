"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MapPin,
  Navigation,
  Phone,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Restaurant {
  name: string;
  category: string;
  categoryFull: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone: string;
  link: string;
  riskLevel: "safe" | "caution" | "danger";
  matchedAllergens: string[];
  categoryAllergens: string[];
  distance?: string;
  distanceKm?: number;
}

interface AIAnalysis {
  riskLevel: string;
  summary: string;
  estimatedMenus: Array<{
    name: string;
    allergens: string[];
    matchedUserAllergens: string[];
    risk: string;
  }>;
  safeOptions: string[];
  tips: string;
  disclaimer: string;
}

const RISK_CONFIG = {
  safe: {
    icon: ShieldCheck,
    label: "안전",
    color: "bg-green-100 text-green-800 border-green-300",
    cardBorder: "border-green-200",
    badgeVariant: "default" as const,
    badgeClass: "bg-green-600 hover:bg-green-600",
  },
  caution: {
    icon: AlertTriangle,
    label: "주의",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    cardBorder: "border-amber-200",
    badgeVariant: "default" as const,
    badgeClass: "bg-amber-500 hover:bg-amber-500",
  },
  danger: {
    icon: XCircle,
    label: "위험",
    color: "bg-red-100 text-red-800 border-red-300",
    cardBorder: "border-red-200",
    badgeVariant: "destructive" as const,
    badgeClass: "",
  },
};

// ── 반경 슬라이더 설정 ──
const RADIUS_STEPS = [100, 300, 500, 1000, 3000, 5000]; // 미터 단위
const RADIUS_LABELS = ["100m", "300m", "500m", "1km", "3km", "5km"];
const DEFAULT_RADIUS_INDEX = 3; // 1km 기본값

function formatRadius(meters: number): string {
  if (meters >= 1000) return `${meters / 1000}km`;
  return `${meters}m`;
}

export default function RestaurantPage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationName, setLocationName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // 반경 상태
  const [radiusIndex, setRadiusIndex] = useState(DEFAULT_RADIUS_INDEX);
  const radius = RADIUS_STEPS[radiusIndex];

  // AI 분석
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, AIAnalysis>>({});
  const [analyzingRestaurant, setAnalyzingRestaurant] = useState<string | null>(null);

  // 필터
  const [riskFilter, setRiskFilter] = useState<"all" | "safe" | "caution" | "danger">("all");

  // 초기화: 사용자 정보 + 위치
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: allergyData } = await supabase
          .from("user_allergies")
          .select("allergen_name")
          .eq("user_id", user.id);

        if (allergyData && allergyData.length > 0) {
          setUserAllergens(allergyData.map((a) => a.allergen_name));
        }
      }

      detectLocation();
    };

    init();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("위치 서비스를 지원하지 않는 브라우저입니다");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(`/api/restaurant/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          setLocationName(data.full || data.address || "내 위치");
        } catch {
          setLocationName("내 위치");
        }

        searchRestaurants(latitude, longitude, undefined, undefined, RADIUS_STEPS[radiusIndex]);
      },
      () => {
        toast.info("위치 권한을 허용하면 주변 음식점을 검색할 수 있어요");
      },
    );
  };

  const searchRestaurants = async (lat: number, lng: number, query?: string, page?: number, customRadius?: number) => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(customRadius ?? radius),
        page: String(page || 1),
      });
      if (query) params.append("query", query);

      const res = await fetch(`/api/restaurant/search?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        if (page && page > 1) {
          setRestaurants(prev => [...prev, ...(data.restaurants || [])]);
        } else {
          setRestaurants(data.restaurants || []);
        }
        setTotalCount(data.total || 0);
        setCurrentPage(page || 1);
        if (data.userAllergens) {
          setUserAllergens(data.userAllergens);
        }
      } else {
        toast.error(data.error || "검색에 실패했습니다");
        if (!page || page === 1) setRestaurants([]);
      }
    } catch {
      toast.error("검색 중 오류가 발생했습니다");
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!userCoords) {
      toast.error("위치 정보가 없습니다. '내 위치로 검색'을 먼저 눌러주세요");
      return;
    }
    searchRestaurants(userCoords.lat, userCoords.lng, searchQuery.trim() || undefined);
  };

  const handleLoadMore = () => {
    if (!userCoords) return;
    searchRestaurants(userCoords.lat, userCoords.lng, searchQuery.trim() || undefined, currentPage + 1);
  };

  // 반경 변경 시 자동 재검색
  const handleRadiusChange = useCallback((newIndex: number) => {
    setRadiusIndex(newIndex);
    if (userCoords && hasSearched) {
      setCurrentPage(1);
      searchRestaurants(userCoords.lat, userCoords.lng, searchQuery.trim() || undefined, 1, RADIUS_STEPS[newIndex]);
    }
  }, [userCoords, hasSearched, searchQuery]);

  const analyzeRestaurant = async (restaurant: Restaurant) => {
    const key = restaurant.name;

    if (selectedRestaurant === key) {
      setSelectedRestaurant(null);
      return;
    }

    setSelectedRestaurant(key);
    if (aiAnalysis[key]) return;

    if (userAllergens.length === 0) {
      toast.error("알레르기를 등록해야 AI 분석을 사용할 수 있어요", {
        action: { label: "등록하기", onClick: () => router.push("/food/profile") },
      });
      return;
    }

    setAnalyzingRestaurant(key);

    try {
      const res = await fetch("/api/restaurant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: restaurant.name,
          category: restaurant.category,
          userAllergens,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiAnalysis((prev) => ({ ...prev, [key]: data.analysis }));
      } else {
        toast.error("AI 분석에 실패했습니다");
      }
    } catch {
      toast.error("AI 분석 중 오류가 발생했습니다");
    } finally {
      setAnalyzingRestaurant(null);
    }
  };

  // 필터링
  const filteredRestaurants =
    riskFilter === "all"
      ? restaurants
      : restaurants.filter((r) => r.riskLevel === riskFilter);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-4">
            {/* 검색 */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="상호명 또는 업종 검색 (예: 치킨, 한식)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
                </Button>
              </div>

              <Button variant="outline" size="sm" className="gap-1.5" onClick={detectLocation}>
                <Navigation className="h-3.5 w-3.5" />내 위치로 검색
              </Button>
            </div>

            {/* ── 반경 슬라이더 ── */}
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">검색 반경</span>
                <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-semibold text-primary">
                  {formatRadius(radius)}
                </span>
              </div>

              {/* 커스텀 슬라이더 */}
              <div className="relative px-1">
                {/* 트랙 배경 */}
                <div className="relative h-2 w-full rounded-full bg-muted">
                  {/* 활성 트랙 */}
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${(radiusIndex / (RADIUS_STEPS.length - 1)) * 100}%` }}
                  />
                </div>

                {/* 스텝 마커 */}
                <div className="absolute top-0 flex h-2 w-full items-center justify-between px-0">
                  {RADIUS_STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handleRadiusChange(i)}
                      className={`h-2.5 w-2.5 rounded-full border-2 transition-all ${
                        i <= radiusIndex
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30 bg-background"
                      }`}
                      style={{ zIndex: 2 }}
                    />
                  ))}
                </div>

                {/* 네이티브 range input (투명 오버레이, 드래그 대응) */}
                <input
                  type="range"
                  min={0}
                  max={RADIUS_STEPS.length - 1}
                  step={1}
                  value={radiusIndex}
                  onChange={(e) => handleRadiusChange(Number(e.target.value))}
                  className="absolute top-1/2 left-0 h-8 w-full -translate-y-1/2 cursor-pointer opacity-0"
                  style={{ zIndex: 3 }}
                />
              </div>

              {/* 라벨 */}
              <div className="mt-2.5 flex w-full justify-between px-0">
                {RADIUS_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => handleRadiusChange(i)}
                    className={`text-[11px] transition-colors ${
                      i === radiusIndex
                        ? "font-semibold text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 알레르기 미등록 안내 */}
            {userAllergens.length === 0 && hasSearched && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <Info className="h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      알레르기를 등록하면 음식점별 위험도를 확인할 수 있어요
                    </p>
                    <Button variant="link" className="h-auto p-0 text-blue-600" onClick={() => router.push("/food/profile")}>
                      알레르기 등록하러 가기 →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 내 알레르기 표시 */}
            {userAllergens.length > 0 && hasSearched && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">내 알레르기:</span>
                {userAllergens.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            )}

            {/* 필터 */}
            {restaurants.length > 0 && userAllergens.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                {(["all", "safe", "caution", "danger"] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={riskFilter === filter ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRiskFilter(filter)}
                  >
                    {filter === "all" && `전체 (${restaurants.length})`}
                    {filter === "safe" && `✅ 안전 (${restaurants.filter((r) => r.riskLevel === "safe").length})`}
                    {filter === "caution" && `⚠️ 주의 (${restaurants.filter((r) => r.riskLevel === "caution").length})`}
                    {filter === "danger" && `🔴 위험 (${restaurants.filter((r) => r.riskLevel === "danger").length})`}
                  </Button>
                ))}
              </div>
            )}

            {/* 결과 헤더 */}
            {hasSearched && !isLoading && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {locationName && (
                    <><MapPin className="inline h-3.5 w-3.5 mr-1" />{locationName}</>
                  )}
                  {" · "}반경 {formatRadius(radius)} · {filteredRestaurants.length}개 음식점
                  {totalCount > restaurants.length && (
                    <span className="text-xs"> (전체 {totalCount}개)</span>
                  )}
                </p>
              </div>
            )}

            {/* 로딩 */}
            {isLoading && restaurants.length === 0 && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-56" />
                        </div>
                        <Skeleton className="h-6 w-14 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 검색 전 안내 */}
            {!hasSearched && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-lg font-semibold">내 주변 음식점 알레르기 체크</h2>
                <p className="mb-1 text-sm text-muted-foreground">위치를 허용하면 주변 음식점을 자동으로 검색해요</p>
                <p className="text-sm text-muted-foreground">반경을 조절해서 원하는 범위를 설정하세요</p>
              </div>
            )}

            {/* 결과 없음 */}
            {hasSearched && !isLoading && filteredRestaurants.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {riskFilter !== "all"
                    ? "해당 필터에 맞는 음식점이 없어요"
                    : "음식점을 찾을 수 없어요. 반경을 넓히거나 다른 검색어를 시도해보세요"}
                </p>
              </div>
            )}

            {/* 음식점 카드 리스트 */}
            <div className="space-y-3">
              {filteredRestaurants.map((restaurant, idx) => {
                const risk = RISK_CONFIG[restaurant.riskLevel];
                const RiskIcon = risk.icon;
                const isSelected = selectedRestaurant === restaurant.name;
                const analysis = aiAnalysis[restaurant.name];
                const isAnalyzing = analyzingRestaurant === restaurant.name;

                return (
                  <Card
                    key={`${restaurant.name}-${idx}`}
                    className={`transition-all ${risk.cardBorder} ${isSelected ? "ring-2 ring-primary/30" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{restaurant.name}</h3>
                            {restaurant.distance && (
                              <span className="shrink-0 text-xs text-muted-foreground">{restaurant.distance}</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">{restaurant.category}</p>
                          <p className="mt-1 text-xs text-muted-foreground truncate">
                            {restaurant.roadAddress || restaurant.address}
                          </p>
                        </div>

                        <Badge
                          variant={risk.badgeVariant}
                          className={`shrink-0 ml-2 ${risk.badgeClass}`}
                        >
                          <RiskIcon className="mr-1 h-3 w-3" />
                          {risk.label}
                        </Badge>
                      </div>

                      {/* 매칭된 알레르기 */}
                      {restaurant.matchedAllergens.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {restaurant.matchedAllergens.map((a, i) => (
                            <span key={i} className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => analyzeRestaurant(restaurant)}
                        >
                          {isSelected ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          AI 분석
                        </Button>
                        {restaurant.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => window.open(`tel:${restaurant.phone}`)}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            전화
                          </Button>
                        )}
                        {(restaurant.roadAddress || restaurant.address) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => {
                              const addr = restaurant.roadAddress || restaurant.address;
                              window.open(`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + " " + addr)}`);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            지도
                          </Button>
                        )}
                      </div>

                      {/* AI 분석 결과 */}
                      {isSelected && analysis && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-sm font-medium">{analysis.summary}</p>
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-semibold text-muted-foreground">예상 메뉴 분석</p>
                            <div className="space-y-1.5">
                              {analysis.estimatedMenus?.map((menu, i) => (
                                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${menu.risk === "danger" ? "bg-red-50" : menu.risk === "caution" ? "bg-amber-50" : "bg-green-50"}`}>
                                  <span className="font-medium">{menu.name}</span>
                                  <div className="flex items-center gap-1">
                                    {menu.matchedUserAllergens.length > 0 ? (
                                      menu.matchedUserAllergens.map((a, j) => (
                                        <span key={j} className="rounded bg-red-200 px-1.5 py-0.5 text-[10px] text-red-800">{a}</span>
                                      ))
                                    ) : (
                                      <span className="text-[10px] text-green-700">✓ 안전</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {analysis.safeOptions && analysis.safeOptions.length > 0 && (
                            <div className="rounded-lg bg-green-50 p-3">
                              <p className="mb-1 text-xs font-semibold text-green-800">✅ 비교적 안전한 선택</p>
                              <p className="text-sm text-green-700">{analysis.safeOptions.join(", ")}</p>
                            </div>
                          )}

                          {analysis.tips && <p className="text-xs text-muted-foreground">💡 {analysis.tips}</p>}
                          <p className="text-[10px] text-muted-foreground/60">⚠️ {analysis.disclaimer}</p>
                        </div>
                      )}

                      {isSelected && isAnalyzing && (
                        <div className="mt-4 flex items-center justify-center gap-2 border-t pt-4">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">AI가 메뉴를 분석하고 있어요...</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 더보기 버튼 */}
            {hasSearched && !isLoading && totalCount > restaurants.length && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLoadMore}
              >
                더 많은 음식점 보기 ({restaurants.length} / {totalCount})
              </Button>
            )}

            {/* 더보기 로딩 */}
            {isLoading && restaurants.length > 0 && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
