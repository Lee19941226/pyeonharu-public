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
import type {
  SearchResult,
  SearchHistory,
  RecentProduct,
  FoodFavorite,
} from "@/types/food";
import { saveAiResult } from "@/lib/utils/ai-result-storage";
import { classifyApiError, getToastDuration } from "@/lib/utils/api-error";

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
  const [safetyStats, setSafetyStats] = useState({
    total: 0,
    safe: 0,
    danger: 0,
    percentage: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  // useEffect - URL 쿼리 파라미터 감지
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery && isInitialMount.current) {
      setQuery(urlQuery);
      setHasSearched(true);

      // ✅ 즉시 검색 실행
      performSearch(urlQuery);

      isInitialMount.current = false;
    }
  }, [searchParams]);

  // useEffect - query 변경 감지 (기존 코드)
  useEffect(() => {
    if (query.length === 0) {
      updateURL("");
      if (hasSearched) setResults([]);
      setShowHistory(true);
      setCurrentPage(1);
      return;
    }
    if (query.length < 1) return;
    setShowHistory(false);

    // ✅ isInitialMount일 때는 이미 실행했으므로 스킵
    if (isInitialMount.current) {
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
      updateURL(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const loadUserAllergies = async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserAllergens([]);
      return;
    }

    const { data: allergyData } = await supabase
      .from("user_allergies")
      .select("allergen_name")
      .eq("user_id", user.id);

    if (allergyData) {
      setUserAllergens(
        allergyData.map(
          (item: { allergen_name: string }) => item.allergen_name,
        ),
      );
    }
  };
  useEffect(() => {
    loadSearchHistory();
    loadRecentProducts();
    checkLoginStatus();
    loadUserAllergies();
    // ✅ 알레르기 업데이트 이벤트 리스너 추가
    const handleAllergiesUpdate = () => {
      console.log("🔄 알레르기 정보 업데이트됨, 재로드...");
      checkLoginStatus(); // 기존 함수 재호출
    };

    window.addEventListener("allergiesUpdated", handleAllergiesUpdate);

    // ✅ cleanup 함수 (컴포넌트 언마운트 시 이벤트 제거)
    return () => {
      window.removeEventListener("allergiesUpdated", handleAllergiesUpdate);
    };
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
      loadRecentProducts();
    } else {
      setIsLoggedIn(false); // 로그아웃 시 상태 초기화
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

  const loadRecentProducts = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        const { data, error } = await supabase
          .from("food_check_history")
          .select("*")
          .eq("user_id", user.id)
          .order("checked_at", { ascending: false })
          .limit(10); // ✅ 최근 10개

        if (error) {
          console.error("❌ Supabase 조회 실패:", error);
          loadRecentProductsFromLocalStorage();
        } else if (data && data.length > 0) {
          const formattedData = data.map((item) => ({
            foodCode: item.barcode,
            foodName: item.product_name,
            manufacturer: item.manufacturer,
            checkedAt: item.checked_at,
            isSafe: item.is_safe,
          }));
          setRecentProducts(formattedData);

          // ✅ 안전/위험 통계 계산
          const safeCount = data.filter((item) => item.is_safe).length;
          const dangerCount = data.length - safeCount;
          const percentage = Math.round((safeCount / data.length) * 100);

          setSafetyStats({
            total: data.length,
            safe: safeCount,
            danger: dangerCount,
            percentage: percentage,
          });

          console.log("✅ Supabase에서 최근 제품 조회 완료:", data.length);
          console.log(
            "📊 안전/위험 비율:",
            `${safeCount}/${data.length} (${percentage}%)`,
          );
        } else {
          loadRecentProductsFromLocalStorage();
        }
      } catch (error) {
        console.error("❌ 최근 제품 조회 오류:", error);
        loadRecentProductsFromLocalStorage();
      }
    } else {
      loadRecentProductsFromLocalStorage();
    }
  };

  const loadRecentProductsFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem("food_check_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        const recent = parsed.slice(0, 10);
        setRecentProducts(recent);

        // ✅ localStorage 데이터도 통계 계산
        const safeCount = recent.filter((item: any) => item.isSafe).length;
        const dangerCount = recent.length - safeCount;
        const percentage =
          recent.length > 0 ? Math.round((safeCount / recent.length) * 100) : 0;

        setSafetyStats({
          total: recent.length,
          safe: safeCount,
          danger: dangerCount,
          percentage: percentage,
        });

        console.log("✅ localStorage에서 최근 제품 조회");
      }
    } catch (error) {
      console.error("❌ localStorage 조회 실패:", error);
    }
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

  const saveSearchHistory = async (searchQuery: string) => {
    const newHistory = [
      { query: searchQuery, timestamp: Date.now() },
      ...searchHistory.filter((h) => h.query !== searchQuery),
    ].slice(0, 20);
    setSearchHistory(newHistory);
    localStorage.setItem("food_search_history", JSON.stringify(newHistory));

    // DB 저장 (로그인 사용자만)
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    if (query.length === 0) {
      updateURL("");
      if (hasSearched) setResults([]);
      setShowHistory(true);
      setCurrentPage(1);
      return;
    }
    if (query.length < 1) return;
    setShowHistory(false);
    const timer = setTimeout(() => {
      performSearch(query);
      updateURL(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 1) return;

    // 이전 요청 취소
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setCorrectedQuery(null);
    setIsLoading(true);
    setHasSearched(true);

    try {
      // ✅ 1단계: DB만 빠르게 (0.1~0.3초)
      const phase1Res = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery)}&phase=1`,
        { signal },
      );
      const phase1Data = await phase1Res.json();

      if (phase1Data.items?.length > 0) {
        setResults(phase1Data.items);
        setCurrentPage(1);
        setIsLoading(false); // ✅ 로딩 먼저 해제해서 DB 결과 즉시 표시
      }

      // ✅ 2단계: 외부 API 전체 검색 (백그라운드, 3~5초)
      const phase2Res = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery)}`,
        { signal },
      );
      const phase2Data = await phase2Res.json();

      if (phase2Data.success && phase2Data.items?.length > 0) {
        setResults(phase2Data.items); // 전체 결과로 교체
        setCurrentPage(1);
        saveSearchHistory(searchQuery);
      } else if (phase1Data.items?.length === 0) {
        // DB도 없고 외부 API도 없으면 AI fallback
        if (phase2Data.correctedQuery) {
          setCorrectedQuery(phase2Data.correctedQuery);
        }
        toast.info("등록된 제품이 없습니다. AI로 분석 중...");

        try {
          const aiResponse = await fetch("/api/food/analyze-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery }),
            signal,
          });
          const aiData = await aiResponse.json();

          if (aiData.success) {
            const aiResultId = `ai-text-${Date.now()}`;
            saveAiResult(aiResultId, {
              productName: aiData.productName || searchQuery,
              manufacturer: aiData.manufacturer || "",
              weight: aiData.weight || "",
              detectedIngredients: aiData.detectedIngredients || [],
              allergens: aiData.allergens || [],
              hasUserAllergen: aiData.hasUserAllergen || false,
              matchedUserAllergens: aiData.matchedUserAllergens || [],
              dataSource: "ai",
              rawMaterials: aiData.rawMaterials || "",
              nutritionInfo: aiData.nutritionInfo || null,
            });

            setResults([
              {
                foodCode: aiResultId,
                foodName: aiData.productName || searchQuery,
                manufacturer: aiData.manufacturer || "AI 분석 결과",
                allergens: aiData.allergens || [],
                hasAllergen: aiData.hasUserAllergen || false,
                dataSource: "ai",
                rawMaterials: aiData.rawMaterials || "",
                weight: aiData.weight || "",
                ingredients:
                  aiData.ingredients || aiData.detectedIngredients || [],
                detectedIngredients:
                  aiData.detectedIngredients || aiData.ingredients || [],
                nutritionInfo: aiData.nutritionInfo || null,
                matchedUserAllergens: aiData.matchedUserAllergens || [],
              },
            ]);
            setCurrentPage(1);
            saveSearchHistory(searchQuery);
            toast.success("AI 분석 완료!");
          } else {
            setResults([]);
            toast.error("제품을 찾을 수 없습니다");
          }
        } catch (aiError: any) {
          if (aiError.name === "AbortError") return;
          setResults([]);
          toast.error("AI 분석 중 오류가 발생했습니다");
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;

      const errInfo = classifyApiError(error);
      console.error("Search error:", errInfo.type, error);
      setResults([]);
      toast.error(errInfo.message, {
        duration: getToastDuration(errInfo.type),
      });
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

  const handleCorrectSearch = (corrected: string) => {
    setQuery(corrected);
    setCorrectedQuery(null);
    updateURL(corrected);
    performSearch(corrected);
  };

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const currentResults = results.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleProductClick = (foodCode: string) => {
    if (foodCode.startsWith("ai-")) {
      const aiResult = results.find((r) => r.foodCode === foodCode);
      if (aiResult) {
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
                  query.length >= 1 &&
                  results.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center py-12">
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
                      {/* ✅ 안전/위험 비율 시각화 */}
                      {safetyStats.total > 0 && (
                        <div className="mb-4 rounded-lg border bg-muted/50 p-3">
                          {/* 통계 헤더 */}
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-medium">
                              최근 {safetyStats.total}개 중
                            </span>
                            <span className="text-xs text-muted-foreground">
                              <span className="font-bold text-green-600">
                                {safetyStats.safe}개 안전
                              </span>
                              {safetyStats.danger > 0 && (
                                <>
                                  {" · "}
                                  <span className="font-bold text-red-600">
                                    {safetyStats.danger}개 위험
                                  </span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* 프로그레스 바 */}
                          <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                              style={{ width: `${safetyStats.percentage}%` }}
                            />
                          </div>

                          {/* 퍼센트 표시 */}
                          <div className="mt-2 text-center">
                            <span className="text-2xl font-bold text-green-600">
                              {safetyStats.percentage}%
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              안전한 선택
                            </span>
                          </div>

                          {/* 격려 메시지 */}
                          {safetyStats.percentage >= 80 && (
                            <p className="mt-2 text-center text-xs text-green-700">
                              🎉 훌륭해요! 안전한 식품을 잘 선택하고 계세요
                            </p>
                          )}
                          {safetyStats.percentage >= 50 &&
                            safetyStats.percentage < 80 && (
                              <p className="mt-2 text-center text-xs text-blue-700">
                                💪 좋은 습관이에요! 조금만 더 주의하세요
                              </p>
                            )}
                          {safetyStats.percentage < 50 && (
                            <p className="mt-2 text-center text-xs text-orange-700">
                              ⚠️ 위험한 제품이 많아요. 신중하게 선택하세요
                            </p>
                          )}
                        </div>
                      )}
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
