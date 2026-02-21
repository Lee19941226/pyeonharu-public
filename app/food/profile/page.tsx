"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Shield,
  CheckCircle2,
  X,
  Zap,
  Check,
  ChevronRight,
  Circle,
  Loader2,
  Save,
} from "lucide-react";
import { AllergenDetailModal } from "@/components/allergen-detail-modal";
import {
  getDetailedAllergenInfo,
  DetailedAllergenInfo,
} from "@/lib/allergen-info";
import { Allergen } from "@/types/food";

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

  const [showCompactView, setShowCompactView] = useState(false);
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

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const selectAllInCategory = (category: string) => {
    const categoryAllergens = ALLERGENS.filter((a) => a.category === category);
    setSelected((prev) => {
      const next = new Set(prev);
      categoryAllergens.forEach((a) => next.add(a.code));
      return next;
    });
  };

  const deselectAllInCategory = (category: string) => {
    const categoryAllergens = ALLERGENS.filter((a) => a.category === category);
    setSelected((prev) => {
      const next = new Set(prev);
      categoryAllergens.forEach((a) => next.delete(a.code));
      return next;
    });
  };

  // 자주 선택되는 알레르기
  const COMMON_ALLERGENS = ["milk", "egg", "peanut", "shrimp", "crab"];
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

      router.push("/mypage");
      router.refresh();

      window.dispatchEvent(new CustomEvent("allergiesUpdated"));
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories),
  );
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
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />내 알레르기 관리
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    식약처 지정 22가지 + 추가 알레르기
                  </p>
                </div>
                <Button onClick={handleSave} disabled={isLoading} size="lg">
                  {isLoading ? "저장 중..." : "저장"}
                </Button>
              </div>

              {/* 진행도 표시 */}
              {selected.size > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      알레르기 설정 진행
                    </span>
                    <span className="font-medium text-primary">
                      {selected.size}개 선택됨
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.min((selected.size / 10) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 선택된 알레르기 요약 카드 */}
            {selected.size > 0 && (
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-primary flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      선택한 알레르기 ({selected.size}개)
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCompactView(!showCompactView)}
                      className="h-7 text-xs"
                    >
                      {showCompactView ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronUp className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {!showCompactView && (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(selected).map((code) => {
                        const allergen = ALLERGENS.find((a) => a.code === code);
                        if (!allergen) return null;

                        return (
                          <Badge
                            key={code}
                            variant="secondary"
                            className="px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-destructive/10 transition-colors group"
                            onClick={() => handleToggle(code)}
                          >
                            <span className="mr-1.5">{allergen.emoji}</span>
                            {allergen.name}
                            <X className="ml-1.5 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 빠른 선택 버튼 */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  빠른 선택
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((code) => {
                    const allergen = ALLERGENS.find((a) => a.code === code);
                    if (!allergen) return null;
                    const isSelected = selected.has(code);

                    return (
                      <button
                        key={code}
                        onClick={() => handleToggle(code)}
                        className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 
                        transition-all duration-200 font-medium text-sm
                        ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-md scale-105"
                            : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                        }
                      `}
                      >
                        <span className="text-lg">{allergen.emoji}</span>
                        <span>{allergen.name}</span>
                        {isSelected && <Check className="h-4 w-4 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 검색바 */}
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="알레르기 항목 검색... (예: 우유, 땅콩)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base border-2"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* 카테고리별 알레르기 목록 */}
            <div className="space-y-4">
              {allergensByCategory.map(({ category, allergens }) => {
                if (allergens.length === 0) return null;

                const isExpanded = expandedCategories.has(category);
                const categorySelectedCount = allergens.filter((a) =>
                  selected.has(a.code),
                ).length;
                const allCategorySelected =
                  categorySelectedCount === allergens.length;

                return (
                  <Card key={category} className="overflow-hidden">
                    <CardHeader
                      className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`
                          p-2 rounded-lg
                          ${category === "곡물" ? "bg-amber-100 text-amber-700" : ""}
                          ${category === "유제품·계란" ? "bg-blue-100 text-blue-700" : ""}
                          ${category === "갑각류·어패류" ? "bg-cyan-100 text-cyan-700" : ""}
                          ${category === "견과류" ? "bg-orange-100 text-orange-700" : ""}
                          ${category === "과일·채소" ? "bg-green-100 text-green-700" : ""}
                          ${category === "육류" ? "bg-red-100 text-red-700" : ""}
                          ${category === "기타" ? "bg-purple-100 text-purple-700" : ""}
                        `}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {category}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {categorySelectedCount > 0
                                ? `${categorySelectedCount}/${allergens.length} 선택됨`
                                : `총 ${allergens.length}개`}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {categorySelectedCount > 0 &&
                            categorySelectedCount < allergens.length && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectAllInCategory(category)}
                                className="h-8 text-xs"
                              >
                                전체 선택
                              </Button>
                            )}
                          {categorySelectedCount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deselectAllInCategory(category)}
                              className="h-8 text-xs"
                            >
                              {allCategorySelected ? "전체 해제" : "선택 해제"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {allergens
                            .slice(
                              0,
                              categoryShowCount[category] || ITEMS_PER_PAGE,
                            )
                            .map((allergen) => {
                              const isSelected = selected.has(allergen.code);
                              const severityColor =
                                allergen.severity === "high"
                                  ? "border-red-200 bg-red-50"
                                  : allergen.severity === "medium"
                                    ? "border-orange-200 bg-orange-50"
                                    : "border-yellow-200 bg-yellow-50";

                              return (
                                <div
                                  key={allergen.code}
                                  onClick={() => handleToggle(allergen.code)}
                                  className={`
                                  flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer
                                  transition-all duration-200
                                  ${
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-sm"
                                      : `${severityColor} hover:shadow-md hover:scale-[1.02]`
                                  }
                                `}
                                >
                                  <div className="flex-shrink-0 text-2xl">
                                    {allergen.emoji}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm truncate">
                                        {allergen.name}
                                      </p>
                                      {allergen.severity === "high" && (
                                        <Badge
                                          variant="destructive"
                                          className="text-[10px] px-1.5 py-0 h-4"
                                        >
                                          심각
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {allergen.description}
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {isSelected ? (
                                      <CheckCircle2 className="h-5 w-5 text-primary" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShowDetail(allergen.code);
                                    }}
                                    className="flex-shrink-0 p-1 hover:bg-background/80 rounded transition-colors"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </div>
                              );
                            })}
                        </div>

                        {allergens.length >
                          (categoryShowCount[category] || ITEMS_PER_PAGE) && (
                          <Button
                            variant="outline"
                            onClick={() => handleShowMore(category)}
                            className="w-full mt-3"
                          >
                            더보기 (
                            {allergens.length -
                              (categoryShowCount[category] || ITEMS_PER_PAGE)}
                            개 남음)
                          </Button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* 하단 정보 카드 */}
            <Card className="mt-6 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  알레르기 정보 참고자료
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://www.allergy.or.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs transition-all hover:border-primary/50 hover:shadow-sm"
                  >
                    <span className="font-medium">대한 알레르기학회</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </a>

                  <a
                    href="https://www.thermofisher.com/allergy/kr/ko/home.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs transition-all hover:border-primary/50 hover:shadow-sm"
                  >
                    <span className="font-medium">Allergy Insider</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </a>

                  <a
                    href="https://foodsafetykorea.go.kr/main.do"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 text-xs transition-all hover:border-primary/50 hover:shadow-sm"
                  >
                    <span className="font-medium">식품안전나라</span>
                    <ExternalLink className="h-3 w-3 text-gray-500" />
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* 저장 버튼 (하단 고정) */}
            <div className="mt-6 pb-safe">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full h-12 text-base"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    알레르기 정보 저장
                  </>
                )}
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
