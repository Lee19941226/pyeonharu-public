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
  AlertTriangle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SearchHistory } from "@/types/food";

interface SearchResult {
  foodCode: string;
  foodName: string;
  manufacturer: string;
  allergens: string[];
  hasAllergen: boolean;
  searchType?: string;
  dataSource?: string;
  rawMaterials?: string;
  weight?: string;
  ingredients?: string[];
  detectedIngredients?: string[];
  nutritionInfo?: NutritionInfo;
  matchedUserAllergens?: string[];
  matchReason: string;
}
interface NutritionInfo {
  calories?: string;
  sodium?: string;
  carbs?: string;
  protein?: string;
  fat?: string;
  sugars?: string;
  servingSize?: string;
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

function FoodSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  // ✅ URL 쿼리 파라미터 감지 및 자동 검색
  useEffect(() => {
    const urlQuery = searchParams.get("q");

    if (urlQuery && isInitialMount.current) {
      setQuery(urlQuery);
      setHasSearched(true);

      // ✅ 즉시 검색 실행
      handleSearch(urlQuery);

      isInitialMount.current = false;
    }
  }, [searchParams]);

  // 검색 기록 불러오기
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = () => {
    const saved = localStorage.getItem("food_search_history");
    if (saved) {
      setSearchHistory(JSON.parse(saved));
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
    if (isInitialMount.current && searchParams.get("q")) {
      return;
    }

    if (query.length === 0) {
      if (hasSearched) {
        setResults([]);
      }
      setShowHistory(true);
      setCurrentPage(1);
      return;
    }

    if (query.length < 2) {
      return;
    }

    setShowHistory(false);

    const timer = setTimeout(() => {
      handleSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // 검색 실행
  const handleSearch = async (searchQuery: string) => {
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
        console.error("Search failed:", data.error);
        setResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 페이징
  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const currentResults = results.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 제품 클릭
  const handleProductClick = (foodCode: string) => {
    if (foodCode.startsWith("ai-")) {
      const aiResult = results.find((r) => r.foodCode === foodCode);

      if (aiResult) {
        const storageKey = `ai_result_${foodCode}`;
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            productName: aiResult.foodName,
            manufacturer: aiResult.manufacturer || "",
            weight: aiResult.weight || "",
            detectedIngredients: aiResult.detectedIngredients || [],
            allergens: aiResult.allergens || [],
            hasUserAllergen: aiResult.hasAllergen || false,
            matchedUserAllergens: aiResult.matchedUserAllergens || [],
            dataSource: "ai",
            rawMaterials: aiResult.rawMaterials || "",
            nutritionInfo: aiResult.nutritionInfo || null,
            ingredients:
              aiResult.ingredients || aiResult.detectedIngredients || [],
          }),
        );
      }
    }

    router.push(`/food/result/${foodCode}`);
  };

  // 검색 기록 클릭
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
    handleSearch(historyQuery);
  };

  // 키워드 클릭
  const handleKeywordClick = (keyword: string) => {
    setQuery(keyword);
    setShowHistory(false);
    handleSearch(keyword);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            {/* 헤더 */}
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-3xl font-bold">식품 검색</h1>
              <p className="text-muted-foreground">
                제품명, 원재료, 알레르기 성분으로 검색하세요
              </p>
            </div>

            {/* 검색창 */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="예: 새우깡, 계란, 밀가루..."
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
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setShowHistory(true);
                    setHasSearched(false);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* 빠른 액션 버튼 */}
            <div className="mb-8 flex gap-3">
              <Link href="/food/camera" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Camera className="h-4 w-4" />
                  사진으로 검색
                </Button>
              </Link>
              <Link href="/food/profile" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <AlertCircle className="h-4 w-4" />내 알레르기 관리
                </Button>
              </Link>
            </div>

            {/* 로딩 */}
            {isLoading && (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">검색 중...</p>
                </CardContent>
              </Card>
            )}

            {/* 검색 기록 */}
            {showHistory && !isLoading && searchHistory.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    최근 검색
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={clearSearchHistory}
                  >
                    전체 삭제
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleHistoryClick(item.query)}
                    >
                      {item.query}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 추천 검색어 */}
            {showHistory && !isLoading && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-medium">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      인기 검색어
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_KEYWORDS.map((keyword, idx) => (
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

                <Card>
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
              </div>
            )}

            {/* 검색 팁 */}
            {showHistory && !isLoading && (
              <Card className="mt-6 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 shrink-0 text-blue-600" />
                    <div className="text-sm text-blue-900">
                      <p className="mb-2 font-medium">💡 검색 팁</p>
                      <ul className="space-y-1 text-xs">
                        <li>
                          • 제품명으로 검색: &quot;새우깡&quot;,
                          &quot;칸쵸&quot;
                        </li>
                        <li>
                          • 원재료로 검색: &quot;계란&quot;, &quot;우유&quot;,
                          &quot;밀가루&quot;
                        </li>
                        <li>• 알레르기 성분 포함 제품까지 검색됩니다</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 검색 결과 헤더 */}
            {!isLoading && hasSearched && results.length > 0 && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  <span className="text-lg font-bold text-foreground">
                    {results.length}
                  </span>
                  개 제품 찾음
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentPage} / {totalPages} 페이지
                </p>
              </div>
            )}

            {/* 검색 결과 목록 */}
            {!isLoading && currentResults.length > 0 && (
              <div className="space-y-3">
                {currentResults.map((item) => (
                  <Card
                    key={item.foodCode}
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => handleProductClick(item.foodCode)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            item.hasAllergen
                              ? "bg-red-100 text-red-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {item.hasAllergen ? (
                            <AlertCircle className="h-5 w-5" />
                          ) : (
                            <CheckCircle className="h-5 w-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* ✅ 제품명 + 매칭 이유 배지 */}
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate flex-1">
                              {item.foodName}
                            </h3>

                            {/* ✅ 매칭 이유 배지 */}
                            {item.matchReason && (
                              <span
                                className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                                  item.matchReason === "제품명"
                                    ? "bg-blue-100 text-blue-700"
                                    : item.matchReason === "성분표"
                                      ? "bg-orange-100 text-orange-700"
                                      : item.matchReason === "초성"
                                        ? "bg-green-100 text-green-700"
                                        : item.matchReason === "기타"
                                          ? "bg-gray-100 text-gray-600"
                                          : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {item.matchReason}
                              </span>
                            )}
                          </div>

                          {item.manufacturer && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {item.manufacturer}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.allergens.slice(0, 3).map((allergen, idx) => (
                              <Badge
                                key={idx}
                                variant={
                                  item.hasAllergen ? "destructive" : "secondary"
                                }
                                className="text-xs"
                              >
                                {allergen}
                              </Badge>
                            ))}
                            {item.allergens.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.allergens.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 페이징 */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="icon"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

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

            {/* 검색 결과 없음 */}
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
                      <br />
                      다른 검색어를 시도해보세요
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
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

function FoodSearchPageInner() {
  const ITEMS_PER_PAGE = 10;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [allResults, setAllResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ 초기 로드 시 캐시 복원
  useEffect(() => {
    const urlQuery = searchParams.get("q");

    if (urlQuery) {
      setQuery(urlQuery);

      // ✅ 캐시된 결과 확인
      const cacheKey = `search_cache_${urlQuery}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        console.log("✅ 캐시된 결과 사용:", urlQuery);
        const cachedData = JSON.parse(cached);
        setAllResults(cachedData.items);
        setHasSearched(true);
        setCurrentPage(cachedData.page || 1);
      } else {
        console.log("🔍 새로운 검색:", urlQuery);
        performSearch(urlQuery);
      }
    }
  }, []); // ✅ 최초 1회만 실행

  // ✅ 검색 실행 함수
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      const res = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      const data = await res.json();

      if (data.success) {
        const items = data.items || [];
        setAllResults(items);

        // ✅ 결과 캐싱
        const cacheKey = `search_cache_${searchQuery.trim()}`;
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            items,
            page: 1,
            timestamp: Date.now(),
          }),
        );
        sessionStorage.setItem("last_search_query", searchQuery.trim());
      } else {
        setAllResults([]);
      }
    } catch (error) {
      console.error("❌ 검색 오류:", error);
      setAllResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 검색 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!query || query.trim().length < 2) {
      return;
    }

    // ✅ 같은 검색어면 API 호출 안 함
    const urlQuery = searchParams.get("q");
    if (urlQuery === query.trim()) {
      console.log("⚠️ 같은 검색어 - 스킵");
      return;
    }

    // ✅ URL 업데이트 후 검색
    router.push(`/food/search?q=${encodeURIComponent(query.trim())}`);
    performSearch(query.trim());
  };

  // ✅ 결과 클릭 (페이지 번호도 캐싱)
  const handleResultClick = (foodCode: string) => {
    const item = allResults.find((r) => r.foodCode === foodCode);

    if (item) {
      // ✅ 검색 결과를 sessionStorage에 저장
      const cacheKey = `food_quick_${foodCode}`;
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          foodCode: item.foodCode,
          foodName: item.foodName,
          manufacturer: item.manufacturer,
          allergens: item.allergens,
          hasAllergen: item.hasAllergen,
          matchedUserAllergens: item.matchedUserAllergens,
          dataSource: item.dataSource,
          rawMaterials: item.rawMaterials,
          weight: item.weight,
          ingredients: item.ingredients,
          timestamp: Date.now(), // 캐시 시간
        }),
      );

      console.log("💾 빠른 캐시 저장:", foodCode);
    }

    router.push(`/food/result/${foodCode}`);
  };

  // ✅ 페이지네이션
  const totalPages = Math.ceil(allResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentResults = allResults.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {/* ✅ max-w 줄임: 4xl → 3xl */}
          <div className="mx-auto max-w-3xl">
            {/* 검색 폼 */}
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="식품명을 입력하세요 (예: 초코파이, 바나나우유)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={isLoading}>
                  <Search className="mr-2 h-4 w-4" />
                  {isLoading ? "검색 중..." : "검색"}
                </Button>
              </div>
            </form>

            {/* 로딩 */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="mb-4 text-4xl">🔍</div>
                <p className="text-lg font-medium">검색 중...</p>
                <p className="text-sm text-muted-foreground">
                  식품 정보를 찾고 있습니다
                </p>
              </div>
            )}

            {/* 검색 결과 */}
            {!isLoading && hasSearched && (
              <div>
                {allResults.length > 0 ? (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        총 <strong>{allResults.length}개</strong>의 결과
                      </p>
                      {totalPages > 1 && (
                        <p className="text-sm text-muted-foreground">
                          {currentPage} / {totalPages} 페이지
                        </p>
                      )}
                    </div>

                    {/* ✅ 결과 목록 - 여백 줄임 */}
                    <div className="space-y-2">
                      {currentResults.map((item) => {
                        // ✅ 알레르기 위험 여부
                        const isDangerous = item.hasAllergen;

                        return (
                          <Card
                            key={item.foodCode}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              isDangerous
                                ? "border-red-300 bg-red-50 hover:bg-red-100"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => handleResultClick(item.foodCode)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="mb-1.5 flex items-center gap-2 flex-wrap">
                                    <h3
                                      className={`font-semibold text-sm ${
                                        isDangerous ? "text-red-900" : ""
                                      }`}
                                    >
                                      {item.foodName}
                                    </h3>

                                    {/* 데이터 소스 배지 */}
                                    {item.dataSource && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs shrink-0"
                                      >
                                        {item.dataSource === "db" && "DB"}
                                        {item.dataSource === "openapi" &&
                                          "식약처"}
                                        {item.dataSource === "openfood" &&
                                          "수입"}
                                        {item.dataSource === "ai" && "AI"}
                                      </Badge>
                                    )}

                                    {/* 매칭 이유 배지 */}
                                    {item.matchReason && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs shrink-0"
                                      >
                                        {item.matchReason}
                                      </Badge>
                                    )}
                                  </div>

                                  {item.manufacturer && (
                                    <p
                                      className={`mb-1.5 text-xs ${
                                        isDangerous
                                          ? "text-red-700"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {item.manufacturer}
                                    </p>
                                  )}

                                  {/* 알레르기 정보 */}
                                  {item.allergens &&
                                    item.allergens.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {item.allergens.map(
                                          (allergen: string, idx: number) => (
                                            <span
                                              key={idx}
                                              className={`rounded-full px-2 py-0.5 text-xs ${
                                                isDangerous
                                                  ? "bg-red-200 text-red-900 font-semibold"
                                                  : "bg-orange-100 text-orange-700"
                                              }`}
                                            >
                                              {allergen}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    )}
                                </div>

                                {/* 안전 여부 아이콘 */}
                                <div className="shrink-0">
                                  {isDangerous ? (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-200">
                                      <AlertTriangle className="h-5 w-5 text-red-700" />
                                    </div>
                                  ) : (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* ✅ 페이지네이션 */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex gap-1">
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1,
                          ).map((page) => {
                            // ✅ 현재 페이지 ±2만 표시
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 2 &&
                                page <= currentPage + 2)
                            ) {
                              return (
                                <Button
                                  key={page}
                                  variant={
                                    page === currentPage ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() => goToPage(page)}
                                  className="w-9"
                                >
                                  {page}
                                </Button>
                              );
                            } else if (
                              page === currentPage - 3 ||
                              page === currentPage + 3
                            ) {
                              return (
                                <span
                                  key={page}
                                  className="flex items-center px-2"
                                >
                                  ...
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mb-4 text-4xl">🔍</div>
                    <p className="text-lg font-medium">검색 결과가 없습니다</p>
                    <p className="text-sm text-muted-foreground">
                      다른 키워드로 검색해보세요
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 검색 전 안내 */}
            {!hasSearched && !isLoading && (
              <div className="text-center py-12">
                <div className="mb-4 text-4xl">🔍</div>
                <p className="text-lg font-medium">식품명을 검색하세요</p>
                <p className="text-sm text-muted-foreground">
                  알레르기 정보를 확인할 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

export default function FoodSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1 pb-16 md:pb-0">
            <div className="container mx-auto px-4 py-8">
              <div className="mx-auto max-w-3xl text-center py-12">
                <div className="mb-4 text-4xl">🔍</div>
                <p className="text-lg font-medium">로딩 중...</p>
              </div>
            </div>
          </main>
          <MobileNav />
        </div>
      }
    >
      <FoodSearchPageInner />
    </Suspense>
  );
}
