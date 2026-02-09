"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Search,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { AllergenDetailModal } from "@/components/allergen-detail-modal";
import {
  getDetailedAllergenInfo,
  DetailedAllergenInfo,
} from "@/lib/allergen-info";

interface Allergen {
  code: string;
  name: string;
  emoji: string;
  description: string;
  category:
    | "곡물"
    | "유제품·계란"
    | "갑각류·어패류"
    | "견과류"
    | "과일·채소"
    | "육류"
    | "기타";
  severity: "high" | "medium" | "low";
  commonNames?: string[];
}

const ALLERGENS: Allergen[] = [
  // 곡물류
  {
    code: "wheat",
    name: "밀",
    emoji: "🌾",
    description: "밀가루, 빵, 파스타, 과자",
    category: "곡물",
    severity: "high",
    commonNames: ["글루텐", "밀가루", "듀럼밀"],
  },
  {
    code: "buckwheat",
    name: "메밀",
    emoji: "🍜",
    description: "메밀국수, 메밀전병, 메밀차",
    category: "곡물",
    severity: "high",
    commonNames: ["소바"],
  },

  // 유제품 & 계란
  {
    code: "milk",
    name: "우유",
    emoji: "🥛",
    description: "우유, 치즈, 버터, 요구르트, 생크림",
    category: "유제품·계란",
    severity: "high",
    commonNames: ["유당", "카제인", "유청"],
  },
  {
    code: "egg",
    name: "계란",
    emoji: "🥚",
    description: "계란, 마요네즈, 머랭, 계란 가공품",
    category: "유제품·계란",
    severity: "high",
    commonNames: ["난황", "난백", "전란"],
  },

  // 갑각류 & 어패류
  {
    code: "shrimp",
    name: "새우",
    emoji: "🦐",
    description: "새우, 새우젓, 새우튀김",
    category: "갑각류·어패류",
    severity: "high",
    commonNames: ["크릴", "보리새우", "대하"],
  },
  {
    code: "crab",
    name: "게",
    emoji: "🦀",
    description: "게, 게장, 게살",
    category: "갑각류·어패류",
    severity: "high",
    commonNames: ["꽃게", "대게", "킹크랩"],
  },
  {
    code: "mackerel",
    name: "고등어",
    emoji: "🐟",
    description: "고등어, 고등어조림, 고등어구이",
    category: "갑각류·어패류",
    severity: "medium",
  },
  {
    code: "squid",
    name: "오징어",
    emoji: "🦑",
    description: "오징어, 건오징어, 오징어젓",
    category: "갑각류·어패류",
    severity: "medium",
  },
  {
    code: "shellfish",
    name: "조개류",
    emoji: "🦪",
    description: "굴, 전복, 홍합, 바지락, 모시조개",
    category: "갑각류·어패류",
    severity: "high",
    commonNames: ["굴", "전복", "홍합", "바지락"],
  },

  // 견과류
  {
    code: "peanut",
    name: "땅콩",
    emoji: "🥜",
    description: "땅콩, 땅콩버터, 땅콩기름",
    category: "견과류",
    severity: "high",
    commonNames: ["피넛"],
  },
  {
    code: "walnut",
    name: "호두",
    emoji: "🌰",
    description: "호두, 호두과자, 호두파이",
    category: "견과류",
    severity: "high",
  },
  {
    code: "pine_nut",
    name: "잣",
    emoji: "🌲",
    description: "잣, 잣죽, 잣국수",
    category: "견과류",
    severity: "medium",
  },
  {
    code: "tree_nuts",
    name: "기타 견과류",
    emoji: "🥥",
    description: "아몬드, 캐슈넛, 피스타치오, 마카다미아",
    category: "견과류",
    severity: "high",
    commonNames: ["아몬드", "캐슈넛", "피스타치오"],
  },

  // 과일 & 채소
  {
    code: "peach",
    name: "복숭아",
    emoji: "🍑",
    description: "복숭아, 천도복숭아, 복숭아주스",
    category: "과일·채소",
    severity: "medium",
  },
  {
    code: "tomato",
    name: "토마토",
    emoji: "🍅",
    description: "토마토, 토마토소스, 케첩",
    category: "과일·채소",
    severity: "low",
  },
  {
    code: "kiwi",
    name: "키위",
    emoji: "🥝",
    description: "키위, 키위주스",
    category: "과일·채소",
    severity: "medium",
  },
  {
    code: "mango",
    name: "망고",
    emoji: "🥭",
    description: "망고, 망고주스, 망고푸딩",
    category: "과일·채소",
    severity: "medium",
  },
  {
    code: "orange",
    name: "오렌지",
    emoji: "🍊",
    description: "오렌지, 오렌지주스, 귤",
    category: "과일·채소",
    severity: "low",
  },

  // 육류
  {
    code: "pork",
    name: "돼지고기",
    emoji: "🥓",
    description: "돼지고기, 삼겹살, 햄, 소시지",
    category: "육류",
    severity: "medium",
  },
  {
    code: "beef",
    name: "쇠고기",
    emoji: "🥩",
    description: "쇠고기, 소고기, 육포",
    category: "육류",
    severity: "medium",
  },
  {
    code: "chicken",
    name: "닭고기",
    emoji: "🍗",
    description: "닭고기, 치킨, 닭가슴살",
    category: "육류",
    severity: "medium",
  },

  // 기타
  {
    code: "soy",
    name: "대두",
    emoji: "🫘",
    description: "콩, 두부, 된장, 간장, 두유",
    category: "기타",
    severity: "medium",
    commonNames: ["콩", "대두유"],
  },
  {
    code: "sulfites",
    name: "아황산류",
    emoji: "⚗️",
    description: "와인, 건과일, 새우 등 보존제",
    category: "기타",
    severity: "medium",
    commonNames: ["이산화황", "아황산나트륨"],
  },
  {
    code: "sesame",
    name: "참깨",
    emoji: "🌾",
    description: "참깨, 참기름, 깨소금",
    category: "기타",
    severity: "medium",
  },
];

export default function AllergyProfilePage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [severity, setSeverity] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 카테고리별 표시 개수 관리
  const [categoryShowCount, setCategoryShowCount] = useState<
    Record<string, number>
  >({});
  const ITEMS_PER_PAGE = 5;

  // 모달 상태
  const [selectedAllergenDetail, setSelectedAllergenDetail] =
    useState<DetailedAllergenInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadUserAllergens();

    // 초기 카테고리별 표시 개수 설정
    const categories = Array.from(new Set(ALLERGENS.map((a) => a.category)));
    const initialCounts: Record<string, number> = {};
    categories.forEach((cat) => {
      initialCounts[cat] = ITEMS_PER_PAGE;
    });
    setCategoryShowCount(initialCounts);
  }, []);

  const loadUserAllergens = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_allergies")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      const codes = new Set(data.map((item) => item.allergen_code));
      setSelected(codes);

      const severityMap: Record<string, string> = {};
      data.forEach((item) => {
        severityMap[item.allergen_code] = item.severity || "medium";
      });
      setSeverity(severityMap);
    }
  };

  const handleToggle = (code: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(code)) {
      newSelected.delete(code);
      const newSeverity = { ...severity };
      delete newSeverity[code];
      setSeverity(newSeverity);
    } else {
      newSelected.add(code);
      setSeverity({ ...severity, [code]: "medium" });
    }
    setSelected(newSelected);
  };

  const handleSeverityChange = (code: string, value: string) => {
    setSeverity({ ...severity, [code]: value });
  };

  const handleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("알레르기 정보를 저장하려면 로그인해주세요");
      return;
    }

    setIsLoading(true);

    try {
      await supabase.from("user_allergies").delete().eq("user_id", user.id);

      if (selected.size > 0) {
        const insertData = Array.from(selected).map((code) => {
          const allergen = ALLERGENS.find((a) => a.code === code);
          return {
            user_id: user.id,
            allergen_code: code,
            allergen_name: allergen?.name || "",
            severity: severity[code] || "medium",
          };
        });

        await supabase.from("user_allergies").insert(insertData);
      }

      toast.success("알레르기 정보가 저장되었습니다");
      router.push("/food");
    } catch (error) {
      console.error(error);
      toast.error("알레르기 정보 저장 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDetail = (code: string) => {
    const detailInfo = getDetailedAllergenInfo(code);
    if (detailInfo) {
      setSelectedAllergenDetail(detailInfo);
      setIsModalOpen(true);
    } else {
      toast.error("상세 정보를 불러올 수 없습니다");
    }
  };

  // 카테고리별 더보기
  const handleShowMore = (category: string) => {
    setCategoryShowCount((prev) => ({
      ...prev,
      [category]: (prev[category] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE,
    }));
  };

  // 검색 필터링
  const filteredAllergens = ALLERGENS.filter((allergen) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      allergen.name.toLowerCase().includes(query) ||
      allergen.description.toLowerCase().includes(query) ||
      allergen.commonNames?.some((name) => name.toLowerCase().includes(query))
    );
  });

  // 카테고리별 그룹화
  const categories = Array.from(
    new Set(ALLERGENS.map((a) => a.category)),
  ).sort();

  const allergensByCategory = categories.map((category) => ({
    category,
    allergens: filteredAllergens.filter((a) => a.category === category),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            {/* 헤더 */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">내 알레르기 관리</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    식약처 지정 22가지 + 추가 알레르기
                  </p>
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "저장 중..." : "저장"}
                </Button>
              </div>

              {/* 선택된 알레르기 요약 */}
              {selected.size > 0 && (
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="p-3">
                    <p className="mb-2 text-xs font-medium text-gray-700">
                      선택됨: {selected.size}개
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selected)
                        .slice(0, 8)
                        .map((code) => {
                          const allergen = ALLERGENS.find(
                            (a) => a.code === code,
                          );
                          return allergen ? (
                            <Badge
                              key={code}
                              variant="secondary"
                              className="text-xs"
                            >
                              {allergen.emoji} {allergen.name}
                            </Badge>
                          ) : null;
                        })}
                      {selected.size > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{selected.size - 8}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 안내 */}
            <Card className="mb-4 border-gray-200 bg-gray-50">
              <CardContent className="flex items-start gap-2 p-3">
                <Info className="h-4 w-4 shrink-0 text-gray-600" />
                <div className="text-xs text-gray-700">
                  <p className="font-medium">
                    알레르기 정보는 의사와 상담 후 등록하세요
                  </p>
                  <p className="mt-1">
                    💊 자세히 버튼으로 증상, 대처법 확인 가능
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 외부 참고 사이트 */}
            <Card className="mb-4 border-gray-200">
              <CardContent className="p-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <BookOpen className="h-4 w-4" />
                  전문 정보 사이트
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href="https://www.allergy.or.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs transition-all hover:border-gray-400 hover:shadow-sm"
                  >
                    <span className="font-medium">대한 알레르기학회</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </a>

                  <a
                    href="https://www.allergyclean.or.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs transition-all hover:border-gray-400 hover:shadow-sm"
                  >
                    <span className="font-medium">천식알레르기협회</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </a>

                  <a
                    href="https://www.thermofisher.com/allergy/kr/ko/home.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs transition-all hover:border-gray-400 hover:shadow-sm"
                  >
                    <span className="font-medium">Allergy Insider</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </a>

                  <a
                    href="https://www.foodsafetykorea.go.kr/portal/healthyfoodlife/foodAllergyMain.do"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs transition-all hover:border-gray-400 hover:shadow-sm"
                  >
                    <span className="font-medium">식품안전나라</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* 검색창 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="알레르기 검색 (예: 새우, 땅콩, 우유)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>

            {/* 카테고리별 알레르기 목록 */}
            <div className="space-y-3">
              {allergensByCategory.map(({ category, allergens }) => {
                if (allergens.length === 0) return null;

                const showCount = categoryShowCount[category] || ITEMS_PER_PAGE;
                const visibleAllergens = allergens.slice(0, showCount);
                const hasMore = allergens.length > showCount;

                return (
                  <Card key={category} className="border-gray-200">
                    <CardContent className="p-3">
                      {/* 카테고리 헤더 */}
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">
                        {category} ({allergens.length})
                      </h3>

                      {/* 알레르기 항목들 */}
                      <div className="space-y-2">
                        {visibleAllergens.map((allergen) => {
                          const isSelected = selected.has(allergen.code);

                          return (
                            <Card
                              key={allergen.code}
                              className={
                                isSelected
                                  ? "border border-primary bg-primary/5"
                                  : "border border-gray-100 bg-white"
                              }
                            >
                              <CardContent className="p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <span className="text-xl">
                                      {allergen.emoji}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium">
                                          {allergen.name}
                                        </p>
                                        <Badge
                                          variant={
                                            allergen.severity === "high"
                                              ? "destructive"
                                              : "secondary"
                                          }
                                          className="text-xs"
                                        >
                                          {allergen.severity === "high"
                                            ? "⚠️"
                                            : ""}
                                        </Badge>
                                      </div>
                                      <p className="truncate text-xs text-gray-500">
                                        {allergen.description}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleShowDetail(allergen.code)
                                      }
                                      className="h-7 px-2 text-xs"
                                    >
                                      자세히
                                    </Button>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        handleToggle(allergen.code)
                                      }
                                    />
                                  </div>
                                </div>

                                {/* 심각도 선택 */}
                                {isSelected && (
                                  <div className="mt-2 border-t pt-2">
                                    <p className="mb-2 text-xs font-medium text-gray-700">
                                      내 반응 심각도
                                    </p>
                                    <RadioGroup
                                      value={
                                        severity[allergen.code] || "medium"
                                      }
                                      onValueChange={(value: string) =>
                                        handleSeverityChange(
                                          allergen.code,
                                          value,
                                        )
                                      }
                                      className="grid grid-cols-3 gap-2"
                                    >
                                      <div>
                                        <RadioGroupItem
                                          value="high"
                                          id={`${allergen.code}-high`}
                                          className="peer sr-only"
                                        />
                                        <Label
                                          htmlFor={`${allergen.code}-high`}
                                          className="flex cursor-pointer flex-col items-center justify-center rounded border-2 border-gray-200 bg-white p-2 text-center hover:bg-gray-50 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50"
                                        >
                                          <span className="text-base">🔴</span>
                                          <span className="mt-1 text-xs font-medium">
                                            심함
                                          </span>
                                        </Label>
                                      </div>
                                      <div>
                                        <RadioGroupItem
                                          value="medium"
                                          id={`${allergen.code}-medium`}
                                          className="peer sr-only"
                                        />
                                        <Label
                                          htmlFor={`${allergen.code}-medium`}
                                          className="flex cursor-pointer flex-col items-center justify-center rounded border-2 border-gray-200 bg-white p-2 text-center hover:bg-gray-50 peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50"
                                        >
                                          <span className="text-base">🟡</span>
                                          <span className="mt-1 text-xs font-medium">
                                            보통
                                          </span>
                                        </Label>
                                      </div>
                                      <div>
                                        <RadioGroupItem
                                          value="low"
                                          id={`${allergen.code}-low`}
                                          className="peer sr-only"
                                        />
                                        <Label
                                          htmlFor={`${allergen.code}-low`}
                                          className="flex cursor-pointer flex-col items-center justify-center rounded border-2 border-gray-200 bg-white p-2 text-center hover:bg-gray-50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50"
                                        >
                                          <span className="text-base">🟢</span>
                                          <span className="mt-1 text-xs font-medium">
                                            경미
                                          </span>
                                        </Label>
                                      </div>
                                    </RadioGroup>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* 더보기 버튼 */}
                      {hasMore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowMore(category)}
                          className="mt-2 w-full text-xs text-gray-600 hover:text-gray-900"
                        >
                          더보기 ({allergens.length - showCount}개 더)
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 하단 저장 버튼 */}
            <div className="mt-6">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "저장 중..." : `${selected.size}개 알레르기 저장`}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <MobileNav />

      {/* 상세 정보 모달 */}
      <AllergenDetailModal
        allergen={selectedAllergenDetail}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
