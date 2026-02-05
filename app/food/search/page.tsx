"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Clock, X, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export default function FoodSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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
    ].slice(0, 10); // 최근 10개만 저장

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
      setResults([]);
      setShowHistory(true);
      return;
    }

    if (query.length < 2) {
      return; // 2글자 이상부터 검색
    }

    setShowHistory(false);

    const timer = setTimeout(() => {
      handleSearch(query);
    }, 500); // 0.5초 대기

    return () => clearTimeout(timer);
  }, [query]);

  // ==========================================
  // 검색 실행
  // ==========================================
  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/food/search?q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await response.json();

      if (data.success) {
        setResults(data.items);
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            {/* 검색창 */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="제품명 또는 원재료로 검색하세요"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowHistory(query.length === 0)}
                className="pl-10 pr-10"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setShowHistory(true);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* 로딩 */}
            {isLoading && (
              <div className="text-center">
                <div className="mb-2 text-2xl">🔍</div>
                <p className="text-sm text-muted-foreground">검색 중...</p>
              </div>
            )}

            {/* 검색 기록 */}
            {showHistory && searchHistory.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
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
                  <div className="space-y-2">
                    {searchHistory.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleHistoryClick(item.query)}
                        className="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-muted"
                      >
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{item.query}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 검색 결과 */}
            {!isLoading && results.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {results.length}개 제품 찾음
                </p>
                {results.map((item) => (
                  <Card
                    key={item.foodCode}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => handleProductClick(item.foodCode)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="mb-1 font-medium">{item.foodName}</h3>
                          {item.searchType && (
                            <span className="mb-2 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                              {item.searchType}
                            </span>
                          )}
                          {item.allergens.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              알레르기: {item.allergens.slice(0, 3).join(", ")}
                              {item.allergens.length > 3 && " 외"}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {item.hasAllergen ? (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                              <AlertCircle className="h-5 w-5 text-destructive" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 검색 결과 없음 */}
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mb-2 text-4xl">🔍</div>
                  <p className="mb-1 font-medium">검색 결과가 없습니다</p>
                  <p className="text-sm text-muted-foreground">
                    다른 검색어를 입력해보세요
                  </p>
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
