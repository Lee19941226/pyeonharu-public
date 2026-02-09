"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const ITEMS_PER_PAGE = 10;

// 인기 검색어
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

// 추천 검색어
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

export default function FoodSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false); // ✅ 검색 여부 추적

  // ==========================================
  // 검색 기록 불러오기
  // ==========================================
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

  // ==========================================
  // 실시간 검색 (debounce)
  // ==========================================
  useEffect(() => {
    if (query.length === 0) {
      if (hasSearched) {
        // ✅ 이전에 검색했다가 지운 경우
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

  // ==========================================
  // 검색 실행
  // ==========================================
  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;

    setIsLoading(true);
    setHasSearched(true); // ✅ 검색했음을 기록

    try {
      const response = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await response.json();

      if (data.success) {
        setResults(data.items);
        setCurrentPage(1); // ✅ 새 검색 시 1페이지로
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

  // ==========================================
  // 페이징
  // ==========================================
  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const currentResults = results.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    //window.scrollTo({ top: 0, behavior: "smooth" }); (페이지 변경 시 위로 이동)
  };

  // ==========================================
  // 제품 클릭
  // ==========================================
  const handleProductClick = (foodCode: string) => {
    router.push(`/food/result/${foodCode}`);
  };

  // ==========================================
  // 검색 기록 클릭
  // ==========================================
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
    handleSearch(historyQuery);
  };

  // ==========================================
  // 키워드 클릭
  // ==========================================
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
                    setHasSearched(false); // ✅ 초기화
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
                    {searchHistory.map((item, idx) => (
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

            {/* 인기 검색어 & 추천 검색어 */}
            {showHistory && !isLoading && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* 인기 검색어 */}
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

                {/* 추천 검색어 */}
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
                        <li>• 제품명으로 검색: "새우깡", "칸쵸"</li>
                        <li>• 원재료로 검색: "계란", "우유", "밀가루"</li>
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

            {/* 검색 결과 */}
            {!isLoading && currentResults.length > 0 && (
              <div className="space-y-3">
                {currentResults.map((item) => (
                  <Card
                    key={item.foodCode}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
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
                              <Badge variant="secondary" className="text-xs">
                                {item.searchType}
                              </Badge>
                            )}
                            {item.hasAllergen && (
                              <Badge variant="destructive" className="text-xs">
                                내 알레르기 포함
                              </Badge>
                            )}
                          </div>
                          {item.allergens.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              알레르기 성분:{" "}
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
            )}

            {/* 페이징 */}
            {!isLoading && results.length > ITEMS_PER_PAGE && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                      key={i}
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
                      "{query}"에 대한 제품을 찾을 수 없어요
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
