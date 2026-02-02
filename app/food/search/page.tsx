"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, AlertTriangle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FoodItem {
  foodCode: string;
  foodName: string;
  manufacturer: string;
  hasAllergen: boolean;
}

export default function FoodSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);

    try {
      const response = await fetch(
        `/api/food/search?q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();

      if (data.success) {
        // ✅ 중복 제거: foodCode 기준으로 유니크하게
        const uniqueItems = data.items.reduce(
          (acc: FoodItem[], current: FoodItem) => {
            const exists = acc.find(
              (item) => item.foodCode === current.foodCode,
            );
            if (!exists) {
              acc.push(current);
            }
            return acc;
          },
          [],
        );

        setResults(uniqueItems);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            {/* Search Input */}
            <div className="mb-6">
              <h1 className="mb-4 text-2xl font-bold">식품 검색</h1>
              <div className="flex gap-2">
                <Input
                  placeholder="식품명을 입력하세요 (예: 새우깡, 바나나우유)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tips */}
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-primary">💡 검색 팁</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• "새우깡", "바나나우유" 등 제품명으로 검색</li>
                  <li>• "갑각류", "우유" 등 성분명으로도 검색 가능</li>
                </ul>
              </CardContent>
            </Card>

            {/* Search Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">
                  검색 결과 ({results.length}개)
                </h2>
                {results.map((item, i) => (
                  <Link
                    key={`${item.foodCode}-${i}`}
                    href={`/food/result/${item.foodCode}`}
                  >
                    <Card className="cursor-pointer transition-all hover:shadow-md">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.foodName}</p>
                            {item.hasAllergen ? (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.manufacturer}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isSearching && results.length === 0 && query && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">검색 결과가 없습니다</p>
              </div>
            )}

            {/* Popular Keywords */}
            {!query && (
              <div>
                <h2 className="mb-3 text-lg font-semibold">인기 검색어</h2>
                <div className="flex flex-wrap gap-2">
                  {["새우깡", "초코파이", "바나나우유", "식빵", "라면"].map(
                    (keyword) => (
                      <Button
                        key={keyword}
                        variant="outline"
                        size="sm"
                        onClick={() => setQuery(keyword)}
                      >
                        #{keyword}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
