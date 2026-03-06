"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
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
import { toast } from "sonner";
import { saveAiResult } from "@/lib/utils/ai-result-storage";
import { classifyApiError, getToastDuration } from "@/lib/utils/api-error";
import { DataSourceBadge } from "@/components/food/data-source-badge";
import { createClient } from "@/lib/supabase/client";
interface SearchResult {
  foodCode: string;
  foodName: string;
  manufacturer?: string;
  allergens: string[];
  hasAllergen: boolean;
  score: number;
  matchReason: string;
  dataSource?: "db" | "openapi" | "ai" | "openfood";
  searchType?: string;
  rawMaterials?: string;
  weight?: string;
  ingredients?: string[];
  detectedIngredients?: string[];
  nutritionInfo?: NutritionInfo;
  matchedUserAllergens?: string[];
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
  const [isOffline, setIsOffline] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // 초기 상태 체크
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  // ✅ URL 쿼리 파라미터 감지 및 자동 검색
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (!urlQuery || urlQuery.trim().length < 1) return;

    setQuery(urlQuery.trim());
    setHasSearched(true);
    isInitialMount.current = true;

    handleSearch(urlQuery.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const saveSearchHistory = async (searchQuery: string, firstItem?: SearchResult) => {
    const newHistory = [
      { query: searchQuery, timestamp: Date.now() },
      ...searchHistory.filter((h) => h.query !== searchQuery),
    ].slice(0, 20);
    setSearchHistory(newHistory);
    localStorage.setItem("food_search_history", JSON.stringify(newHistory));

    // DB 저장 (로그인 사용자만)
    const supabase = createClient();
    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (e) {
      console.error("❌ getUser 실패:", e);
      return;
    }
    if (!user) return;

    // 1. 동일 검색어 기존 기록 삭제 (중복 방지)
    await supabase
      .from("food_search_history")
      .delete()
      .eq("user_id", user.id)
      .eq("search_query", searchQuery);

    // 2. 새 기록 삽입
    await supabase.from("food_search_history").insert({
      user_id: user.id,
      search_query: searchQuery,
      food_code: firstItem?.foodCode ?? null,
      food_name: firstItem?.foodName ?? null,
      searched_at: new Date().toISOString(),
    });

    // 3. 최대 20개 초과 시 오래된 것 삭제
    const { data: history } = await supabase
      .from("food_search_history")
      .select("id, searched_at")
      .eq("user_id", user.id)
      .order("searched_at", { ascending: false });

    if (history && history.length > 20) {
      const toDelete = history.slice(20).map((r) => r.id);
      await supabase.from("food_search_history").delete().in("id", toDelete);
    }
  };

  const clearSearchHistory = async () => {
    setSearchHistory([]);
    localStorage.removeItem("food_search_history");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("food_search_history").delete().eq("user_id", user.id);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (query.length === 0) {
      setResults([]);
      setHasSearched(false);
      setCurrentPage(1);
      return;
    }

    if (query.length < 1) return;

    const timer = setTimeout(() => {
      handleSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // 검색 실행
  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 1) return;

    // 오프라인 체크
    if (!navigator.onLine) {
      setIsOffline(true);
      setIsLoading(false);
      return;
    }
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
        saveSearchHistory(searchQuery, data.items[0]);
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
        // ✅ localStorage로 변경
        saveAiResult(foodCode, {
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
        });
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

      <main className="flex-1 pb-20 md:pb-0">
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
            {isOffline === true && (
              <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                <span className="text-base">📡</span>
                <span>
                  인터넷 연결이 끊겼습니다. 연결 후 다시 검색해주세요.
                </span>
              </div>
            )}
            {/* 빠른 액션 버튼 */}
            <div className="mb-8 flex gap-3">
              <Link href="/food" className="flex-1">
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
              query.length >= 1 &&
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
  const urlQuery = searchParams.get("q") ?? "";
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [allResults, setAllResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchProgress, setSearchProgress] = useState({
    step: "",
    progress: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const [filterSafeOnly, setFilterSafeOnly] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("all"); // "all" | "openapi" | "db" | "openfood" | "ai"
  const [sortBy, setSortBy] = useState<string>("default"); // "default" | "name" | "safe_first"
  const hasSearchedRef = useRef(false);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSafeOnly, filterSource, sortBy]);

  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (!urlQuery || urlQuery.trim().length < 1) return;
    if (hasSearchedRef.current) return;

    hasSearchedRef.current = true;
    setQuery(urlQuery.trim());
    setHasSearched(true);

    const cacheKey = `search_cache_${urlQuery.trim()}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        const isFresh = Date.now() - cachedData.timestamp < 5 * 60 * 1000;
        if (isFresh && cachedData.items?.length > 0) {
          setAllResults(cachedData.items);
          setCurrentPage(cachedData.page || 1);
          return;
        }
      } catch {}
      sessionStorage.removeItem(cacheKey);
    }

    performSearch(urlQuery.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 1) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setCorrectedQuery(null);
    setSearchError(null);
    setIsLoading(true);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      setSearchProgress({ step: "DB 캐시 검색 중...", progress: 25 });

      const phase1Res = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery.trim())}&phase=1`,
        { signal },
      );
      const phase1Data = await phase1Res.json();

      if (phase1Data.items?.length > 0) {
        setAllResults(phase1Data.items);
      }

      setSearchProgress({ step: "식약처 API 조회 중...", progress: 50 });

      const phase2Res = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery.trim())}`,
        { signal },
      );

      setSearchProgress({ step: "검색 결과 정리 중...", progress: 75 });

      const phase2Data = await phase2Res.json();
      if (phase2Res.status === 429) {
        const errInfo = classifyApiError(null, 429, phase2Data);
        toast.error(errInfo.message, {
          duration: getToastDuration("rate_limit"),
        });
        return; // phase1 결과 유지
      }

      // ── 서버 오류 처리 ──
      if (phase2Res.status >= 500) {
        if (allResults.length === 0) {
          toast.error(
            "식약처 서버에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요",
            {
              duration: 4000,
            },
          );
        } else {
          toast.warning("외부 API 조회에 실패했습니다. DB 결과만 표시합니다", {
            duration: 3000,
          });
        }
        return;
      }
      if (phase2Data.success) {
        const items = phase2Data.items || [];
        setSearchProgress({ step: "완료!", progress: 100 });
        setAllResults(items);
        setCurrentPage(1);
        setCorrectedQuery(
          items.length === 0 && phase2Data.correctedQuery
            ? phase2Data.correctedQuery
            : null,
        );
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
      }
      //
    } catch (error: any) {
      if (error.name === "AbortError") return;

      const errInfo = classifyApiError(error);
      console.error("❌ 검색 오류:", errInfo.type, error);

      // phase1 결과가 있으면 그걸로 유지 (외부 API 실패)
      if (allResults.length === 0) {
        setAllResults([]);
        setSearchError("검색 중 오류가 발생했습니다. 다시 시도해주세요.");
        toast.error(errInfo.message, {
          duration: getToastDuration(errInfo.type),
        });
      } else {
        // DB 결과는 있는데 외부 API만 실패한 경우
        toast.warning(
          "일부 데이터를 불러오지 못했습니다. DB 결과만 표시합니다",
          {
            duration: 4000,
          },
        );
      }
      setSearchProgress({ step: "검색 실패", progress: 0 });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setSearchProgress({ step: "", progress: 0 });
      }, 300);
    }
  };

  const handleCorrectSearch = (corrected: string) => {
    setQuery(corrected);
    setCorrectedQuery(null);
    router.push(`/food/search?q=${encodeURIComponent(corrected)}`);
    performSearch(corrected);
  };

  // ✅ 검색 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!query || query.trim().length < 1) {
      return;
    }

    // ✅ 같은 검색어면 API 호출 안 함
    const urlQuery = searchParams.get("q");
    if (urlQuery === query.trim()) {
      router.push(`/food/search?q=${encodeURIComponent(query.trim())}`);
    }

    // ✅ URL 업데이트 후 검색
    performSearch(query.trim());
  };

  // ✅ 결과 클릭 (페이지 번호도 캐싱)
  const handleResultClick = (foodCode: string) => {
    const item = allResults.find((r) => r.foodCode === foodCode);

    if (item) {
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
          timestamp: Date.now(),
        }),
      );

      // ✅ AI 결과인 경우 localStorage에도 저장 (aiResult → item으로 수정)
      if (foodCode.startsWith("ai-")) {
        saveAiResult(foodCode, {
          productName: item.foodName,
          manufacturer: item.manufacturer || "",
          weight: item.weight || "",
          detectedIngredients: item.detectedIngredients || [],
          allergens: item.allergens || [],
          hasUserAllergen: item.hasAllergen || false,
          matchedUserAllergens: item.matchedUserAllergens || [],
          dataSource: "ai",
          rawMaterials: item.rawMaterials || "",
          nutritionInfo: item.nutritionInfo || null,
          ingredients: item.ingredients || item.detectedIngredients || [],
        });
      }
    }

    router.push(`/food/result/${foodCode}`);
  };
  // ✅ 페이지네이션
  // ── 필터 + 정렬 적용 ──
  const filteredResults = useMemo(() => {
    let list = [...allResults];

    // 1) 안전 제품만
    if (filterSafeOnly) {
      list = list.filter((r) => !r.hasAllergen);
    }

    // 2) 데이터 소스
    if (filterSource !== "all") {
      list = list.filter((r) => r.dataSource === filterSource);
    }

    // 3) 정렬
    if (sortBy === "name") {
      list.sort((a, b) => a.foodName.localeCompare(b.foodName, "ko"));
    } else if (sortBy === "safe_first") {
      list.sort((a, b) => Number(a.hasAllergen) - Number(b.hasAllergen));
    }

    return list;
  }, [allResults, filterSafeOnly, filterSource, sortBy]);

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentResults = filteredResults.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
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
            {/* 로딩 중 */}
            {isLoading && (
              <div className="space-y-6">
                {/* 진행 상황 카드 */}
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* 제목 */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Search className="h-5 w-5 animate-pulse text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">검색 중...</h3>
                          <p className="text-sm text-muted-foreground">
                            {searchProgress.step || "식품 정보를 찾고 있습니다"}
                          </p>
                        </div>
                      </div>

                      {/* 진행률 바 */}
                      <div className="space-y-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${searchProgress.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>진행률</span>
                          <span className="font-medium">
                            {searchProgress.progress}%
                          </span>
                        </div>
                      </div>

                      {/* 검색 단계 표시 */}
                      <div className="grid grid-cols-4 gap-2">
                        <div
                          className={`text-center ${searchProgress.progress >= 25 ? "text-primary" : "text-muted-foreground"}`}
                        >
                          <div
                            className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${searchProgress.progress >= 25 ? "border-primary bg-primary/10" : "border-gray-300"}`}
                          >
                            {searchProgress.progress >= 25 ? "✓" : "1"}
                          </div>
                          <p className="text-xs">DB 검색</p>
                        </div>
                        <div
                          className={`text-center ${searchProgress.progress >= 50 ? "text-primary" : "text-muted-foreground"}`}
                        >
                          <div
                            className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${searchProgress.progress >= 50 ? "border-primary bg-primary/10" : "border-gray-300"}`}
                          >
                            {searchProgress.progress >= 50 ? "✓" : "2"}
                          </div>
                          <p className="text-xs">API 조회</p>
                        </div>
                        <div
                          className={`text-center ${searchProgress.progress >= 75 ? "text-primary" : "text-muted-foreground"}`}
                        >
                          <div
                            className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${searchProgress.progress >= 75 ? "border-primary bg-primary/10" : "border-gray-300"}`}
                          >
                            {searchProgress.progress >= 75 ? "✓" : "3"}
                          </div>
                          <p className="text-xs">데이터 정리</p>
                        </div>
                        <div
                          className={`text-center ${searchProgress.progress >= 100 ? "text-primary" : "text-muted-foreground"}`}
                        >
                          <div
                            className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border-2 ${searchProgress.progress >= 100 ? "border-primary bg-primary/10" : "border-gray-300"}`}
                          >
                            {searchProgress.progress >= 100 ? "✓" : "4"}
                          </div>
                          <p className="text-xs">완료</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Skeleton 결과 카드 */}
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-muted" />
                            <div className="h-3 w-1/2 rounded bg-muted" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                    {allResults.length > 0 && (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {/* 안전 필터 토글 */}
                        <button
                          onClick={() => setFilterSafeOnly((v) => !v)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            filterSafeOnly
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                          }`}
                        >
                          <span>{filterSafeOnly ? "✅" : "🔍"}</span>내 알레르기
                          없는 것만
                        </button>

                        {(
                          ["all", "openapi", "db", "openfood", "ai"] as const
                        ).map((src) => {
                          const labels: Record<string, string> = {
                            all: "전체",
                            openapi: "🏛️ 식약처",
                            db: "🗄️ DB",
                            openfood: "🌍 수입",
                            ai: "🤖 AI",
                          };
                          return (
                            <button
                              key={src}
                              onClick={() => setFilterSource(src)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                filterSource === src
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {labels[src]}
                            </button>
                          );
                        })}

                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="ml-auto rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="default">관련도순</option>
                          <option value="safe_first">안전 먼저</option>
                          <option value="name">이름순</option>
                        </select>
                      </div>
                    )}
                    {/* ✅ 결과 목록 - 여백 줄임 */}
                    <motion.div
                      className="space-y-2"
                      initial="hidden"
                      animate="visible"
                      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                    >
                      {currentResults.map((item) => {
                        // ✅ 알레르기 위험 여부
                        const isDangerous = item.hasAllergen;

                        return (
                          <motion.div
                            key={item.foodCode}
                            variants={{
                              hidden: { opacity: 0, y: 20 },
                              visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                          <Card
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
                                      <DataSourceBadge
                                        source={item.dataSource}
                                        withTooltip={false}
                                      />
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
                          </motion.div>
                        );
                      })}
                    </motion.div>

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
                    {filteredResults.length === 0 && allResults.length > 0 ? (
                      // 검색 결과는 있지만 필터 조건에 안 맞는 경우
                      <>
                        <div className="mb-4 text-4xl">🔎</div>
                        <p className="font-medium text-gray-700">
                          필터 조건에 맞는 결과가 없어요
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {filterSafeOnly &&
                            "내 알레르기 없는 제품이 없습니다."}
                        </p>
                        <button
                          onClick={() => {
                            setFilterSafeOnly(false);
                            setFilterSource("all");
                            setSortBy("default");
                          }}
                          className="mt-4 rounded-lg border border-primary px-4 py-2 text-sm text-primary hover:bg-primary/5"
                        >
                          필터 초기화
                        </button>
                      </>
                    ) : searchError ? (
                      // 오류 상태
                      <>
                        <div className="mb-4 text-4xl">⚠️</div>
                        <p className="font-medium text-gray-700">
                          검색 중 오류가 발생했습니다
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          잠시 후 다시 시도해주세요
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => query && performSearch(query)}
                        >
                          다시 시도
                        </Button>
                      </>
                    ) : (
                      // 검색 자체 결과 없음
                      <>
                        {correctedQuery && (
                          <button
                            onClick={() => handleCorrectSearch(correctedQuery)}
                            className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition-all hover:border-amber-400 hover:bg-amber-100 active:scale-95"
                          >
                            <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                            혹시{" "}
                            <span className="underline underline-offset-2">
                              &apos;{correctedQuery}&apos;
                            </span>
                            {" "}을(를) 검색하셨나요?
                          </button>
                        )}
                        <div className="mb-4 text-4xl">🔍</div>
                        <p className="text-lg font-medium">
                          검색 결과가 없습니다
                        </p>
                        <p className="text-sm text-muted-foreground">
                          다른 키워드로 검색해보세요
                        </p>
                      </>
                    )}
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
          <main className="flex-1 pb-20 md:pb-0">
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
