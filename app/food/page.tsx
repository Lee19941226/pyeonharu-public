"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Clock,
  X,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Camera,
  Lightbulb,
  Heart,
  Settings,
  History,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  foodCode: string;
  foodName: string;
  manufacturer: string;
  allergens: string[];
  hasAllergen: boolean;
  searchType?: string;
}

interface SearchHistory {
  query: string;
  timestamp: number;
}

interface RecentProduct {
  foodCode: string;
  foodName: string;
  isSafe: boolean;
  checkedAt: string;
}

interface FoodFavorite {
  foodCode: string;
  foodName: string;
  isSafe: boolean;
}

const ITEMS_PER_PAGE = 10;

const POPULAR_KEYWORDS = [
  "새우",
  "계란",
  "우유",
  "땅콩",
  "밀가루",
  "대두",
  "게",
  "고등어",
  "복숭아",
  "토마토",
];

const RECOMMENDED_KEYWORDS = [
  "과자",
  "라면",
  "초콜릿",
  "빵",
  "치즈",
  "요거트",
  "아이스크림",
  "햄",
  "소시지",
  "김치",
];

function FoodMainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [favorites, setFavorites] = useState<FoodFavorite[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery && isInitialMount.current) {
      setQuery(urlQuery);
      setHasSearched(true);
      handleSearch(urlQuery);
    }
    isInitialMount.current = false;
  }, [searchParams]);

  useEffect(() => {
    loadSearchHistory();
    loadRecentProducts();
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setIsLoggedIn(true);
      loadFavorites();
      loadUserAllergens();
    }
  };

  const loadUserAllergens = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_allergies")
      .select("allergen_name")
      .eq("user_id", user.id);
    if (data) setUserAllergens(data.map((item) => item.allergen_name));
  };

  const loadSearchHistory = () => {
    const saved = localStorage.getItem("food_search_history");
    if (saved) setSearchHistory(JSON.parse(saved));
  };

  const loadRecentProducts = () => {
    const saved = localStorage.getItem("food_check_history");
    if (saved) setRecentProducts(JSON.parse(saved).slice(0, 5));
  };

  const loadFavorites = async () => {
    try {
      const response = await fetch("/api/food/favorites");
      const data = await response.json();
      if (data.success) setFavorites(data.favorites.slice(0, 5));
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  };

  const saveSearchHistory = (searchQuery: string) => {
    const newHistory = [
      { query: searchQuery, timestamp: Date.now() },
      ...searchHistory.filter((h) => h.query !== searchQuery),
    ].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("food_search_history", JSON.stringify(newHistory));
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("food_search_history");
  };

  useEffect(() => {
    if (query.length === 0) {
      updateURL("");
      if (hasSearched) setResults([]);
      setShowHistory(true);
      setCurrentPage(1);
      return;
    }
    if (query.length < 2) return;
    setShowHistory(false);
    const timer = setTimeout(() => {
      performSearch(query);
      updateURL(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await response.json();
      if (data.success) {
        setResults(data.items);
        setCurrentPage(1);
        saveSearchHistory(searchQuery);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateURL = (searchQuery: string) => {
    if (searchQuery) {
      router.push(`/food?q=${encodeURIComponent(searchQuery)}`, {
        scroll: false,
      });
    } else {
      router.push("/food", { scroll: false });
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;
    setIsLoading(true);
    setHasSearched(true);
    router.push(`/food?q=${encodeURIComponent(searchQuery)}`, {
      scroll: false,
    });

    try {
      // ✅ Open API 검색
      const response = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await response.json();

      if (data.success && data.items && data.items.length > 0) {
        // ✅ 검색 결과 있음
        setResults(data.items);
        setCurrentPage(1);
        saveSearchHistory(searchQuery);
      } else {
        // ✅ 검색 결과 없음 → AI 분석 시도
        toast.info("등록된 제품이 없습니다. AI로 분석 중...");

        try {
          const aiResponse = await fetch("/api/food/analyze-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery }),
          });

          const aiData = await aiResponse.json();

          if (aiData.success) {
            // sessionStorage에 저장
            const aiResultId = `ai-text-${Date.now()}`;
            sessionStorage.setItem(aiResultId, JSON.stringify(aiData));

            // 결과 페이지로 이동
            router.push(`/food/result/${aiResultId}`);
          } else {
            setResults([]);
            toast.error("제품을 찾을 수 없습니다");
          }
        } catch (aiError) {
          console.error("AI 분석 오류:", aiError);
          setResults([]);
          toast.error("AI 분석 중 오류가 발생했습니다");
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      toast.error("검색 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const currentResults = results.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleProductClick = (foodCode: string) =>
    router.push(`/food/result/${foodCode}`);
  const handleKeywordClick = (keyword: string) => {
    setQuery(keyword);
    setShowHistory(false);
  };
  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setShowHistory(true);
    setHasSearched(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-4xl font-bold">이거 먹어도 돼?</h1>
              <p className="text-lg text-muted-foreground">
                내 알레르기 정보를 기반으로 안전하게 확인하세요
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="제품명, 원재료, 알레르기 성분 검색..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowHistory(query.length === 0)}
                    className="h-14 pl-12 pr-12 text-lg"
                  />
                  {query && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2"
                      onClick={handleClearSearch}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                <div className="mb-6 grid grid-cols-2 gap-3">
                  <Link href="/food/camera">
                    <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <Camera className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">사진으로 확인</p>
                          <p className="text-xs text-muted-foreground">
                            라벨 촬영 또는 업로드
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/food/profile">
                    <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                          <Settings className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">알레르기 관리</p>
                          <p className="text-xs text-muted-foreground">
                            {userAllergens.length}개 등록됨
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
                {isLoading && (
                  <Card>
                    <CardContent className="flex flex-col items-center py-12">
                      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-sm text-muted-foreground">
                        검색 중...
                      </p>
                    </CardContent>
                  </Card>
                )}
                {showHistory && searchHistory.length > 0 && !isLoading && (
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Clock className="h-4 w-4" />
                          최근 검색
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSearchHistory}
                          className="h-auto p-0 text-xs text-muted-foreground"
                        >
                          전체 삭제
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {searchHistory.slice(0, 5).map((item, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleKeywordClick(item.query)}
                            className="h-auto gap-2 py-2"
                          >
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {item.query}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {showHistory && !isLoading && (
                  <>
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <h3 className="mb-3 flex items-center gap-2 font-medium">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          인기 검색어
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {POPULAR_KEYWORDS.map((keyword, idx) => (
                            <Button
                              key={idx}
                              variant="secondary"
                              size="sm"
                              onClick={() => handleKeywordClick(keyword)}
                              className="gap-1"
                            >
                              <span className="text-xs font-bold text-primary">
                                {idx + 1}
                              </span>
                              {keyword}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <h3 className="mb-3 flex items-center gap-2 font-medium">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          추천 검색어
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {RECOMMENDED_KEYWORDS.map((keyword, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => handleKeywordClick(keyword)}
                            >
                              {keyword}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 shrink-0 text-blue-600" />
                          <div className="text-sm text-blue-900">
                            <p className="mb-2 font-medium">💡 검색 팁</p>
                            <ul className="space-y-1 text-xs">
                              <li>
                                • 제품명: &quot;새우깡&quot;, &quot;칸쵸&quot;
                              </li>
                              <li>
                                • 원재료: &quot;계란&quot;, &quot;우유&quot;
                              </li>
                              <li>• 교차오염 제품까지 검색</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
                {!isLoading && hasSearched && results.length > 0 && (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">
                        <span className="text-lg font-bold text-foreground">
                          {results.length}
                        </span>
                        개 제품
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currentPage} / {totalPages} 페이지
                      </p>
                    </div>
                    <div className="space-y-3">
                      {currentResults.map((item) => (
                        <Card
                          key={item.foodCode}
                          className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                          onClick={() => handleProductClick(item.foodCode)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <h3 className="mb-2 font-medium leading-tight">
                                  {item.foodName}
                                </h3>
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {item.searchType && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {item.searchType}
                                    </Badge>
                                  )}
                                  {item.hasAllergen && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      ⚠️ 내 알레르기 포함
                                    </Badge>
                                  )}
                                </div>
                                {item.allergens.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    알레르기:{" "}
                                    {item.allergens.slice(0, 4).join(", ")}
                                    {item.allergens.length > 4 &&
                                      ` 외 ${item.allergens.length - 4}개`}
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {item.hasAllergen ? (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                  </div>
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {results.length > ITEMS_PER_PAGE && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={currentPage === 1}
                          onClick={() => handlePageChange(currentPage - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from(
                          { length: Math.min(totalPages, 5) },
                          (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2)
                              pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;
                            return (
                              <Button
                                key={i}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="icon"
                                onClick={() => handlePageChange(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          },
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={currentPage === totalPages}
                          onClick={() => handlePageChange(currentPage + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
                {!isLoading &&
                  hasSearched &&
                  query.length >= 2 &&
                  results.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center py-12">
                        <div className="mb-4 text-6xl">🔍</div>
                        <h3 className="mb-2 text-lg font-semibold">
                          검색 결과가 없습니다
                        </h3>
                        <p className="mb-6 text-center text-sm text-muted-foreground">
                          &quot;{query}&quot;에 대한 제품을 찾을 수 없어요
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {POPULAR_KEYWORDS.slice(0, 5).map((keyword, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => handleKeywordClick(keyword)}
                            >
                              {keyword}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </div>
              <div className="space-y-6">
                {recentProducts.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-medium">
                          <History className="h-4 w-4" />
                          최근 확인
                        </h3>
                        <Link href="/food/history">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-primary"
                          >
                            전체보기 →
                          </Button>
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {recentProducts.map((product, idx) => (
                          <div
                            key={idx}
                            className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted"
                            onClick={() => handleProductClick(product.foodCode)}
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${product.isSafe ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                            >
                              {product.isSafe ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {product.foodName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  product.checkedAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {isLoggedIn && favorites.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-medium">
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                          즐겨찾기
                        </h3>
                        <Link href="/food/favorites">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-primary"
                          >
                            전체보기 →
                          </Button>
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {favorites.map((favorite, idx) => (
                          <div
                            key={idx}
                            className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted"
                            onClick={() =>
                              handleProductClick(favorite.foodCode)
                            }
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${favorite.isSafe ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                            >
                              {favorite.isSafe ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                            </div>
                            <p className="min-w-0 flex-1 truncate text-sm font-medium">
                              {favorite.foodName}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {isLoggedIn && userAllergens.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-medium text-amber-900">
                          ⚠️ 내 알레르기
                        </h3>
                        <Link href="/food/profile">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-amber-700"
                          >
                            수정 →
                          </Button>
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {userAllergens.slice(0, 6).map((allergen, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-amber-100 text-amber-800"
                          >
                            {allergen}
                          </Badge>
                        ))}
                        {userAllergens.length > 6 && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800"
                          >
                            +{userAllergens.length - 6}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <h3 className="mb-3 font-medium text-blue-900">
                      <Zap className="mb-1 inline h-4 w-4" /> 빠른 시작
                    </h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">1.</span>
                        <span>알레르기 정보 등록</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">2.</span>
                        <span>제품 검색 또는 사진 촬영</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">3.</span>
                        <span>안전 여부 즉시 확인</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

export default function FoodMainPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>로딩 중...</p>
        </div>
      }
    >
      <FoodMainContent />
    </Suspense>
  );
}
