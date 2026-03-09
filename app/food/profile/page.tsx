"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Shield,
  CheckCircle2,
  X,
  Check,
  ChevronRight,
  Loader2,
  Save,
  AlertTriangle,
  Zap,
  Circle,
} from "lucide-react";
import { AllergenDetailModal } from "@/components/allergen-detail-modal";
import {
  getDetailedAllergenInfo,
  DetailedAllergenInfo,
} from "@/lib/allergen-info";
import { Allergen } from "@/types/food";

const ALLERGENS: Allergen[] = [
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
    commonNames: ["꽃게", "대게"],
  },
  {
    code: "squid",
    name: "오징어",
    emoji: "🦑",
    description: "오징어, 오징어 가공품",
    category: "갑각류·어패류",
    severity: "medium",
  },
  {
    code: "mackerel",
    name: "고등어",
    emoji: "🐟",
    description: "고등어, 고등어 통조림",
    category: "갑각류·어패류",
    severity: "medium",
  },
  {
    code: "clam",
    name: "조개류",
    emoji: "🦪",
    description: "굴, 홍합, 전복, 바지락",
    category: "갑각류·어패류",
    severity: "medium",
  },
  {
    code: "peanut",
    name: "땅콩",
    emoji: "🥜",
    description: "땅콩, 땅콩버터, 땅콩과자",
    category: "견과류",
    severity: "high",
    commonNames: ["피넛", "아라키스"],
  },
  {
    code: "walnut",
    name: "호두",
    emoji: "🪨",
    description: "호두, 호두과자",
    category: "견과류",
    severity: "high",
  },
  {
    code: "pine_nut",
    name: "잣",
    emoji: "🌰",
    description: "잣, 잣죽",
    category: "견과류",
    severity: "medium",
  },
  {
    code: "peach",
    name: "복숭아",
    emoji: "🍑",
    description: "복숭아, 복숭아 주스, 통조림",
    category: "과일·채소",
    severity: "medium",
  },
  {
    code: "tomato",
    name: "토마토",
    emoji: "🍅",
    description: "토마토, 케첩, 토마토소스",
    category: "과일·채소",
    severity: "medium",
  },
  {
    code: "pork",
    name: "돼지고기",
    emoji: "🥩",
    description: "돼지고기, 햄, 소시지, 베이컨",
    category: "육류",
    severity: "medium",
  },
  {
    code: "beef",
    name: "쇠고기",
    emoji: "🥩",
    description: "쇠고기, 불고기, 갈비",
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

const COMMON_ALLERGENS = [
  "milk",
  "egg",
  "peanut",
  "shrimp",
  "wheat",
  "soy",
  "crab",
  "walnut",
];

const SEVERITY_OPTIONS = [
  {
    value: "low",
    label: "가벼움",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  {
    value: "medium",
    label: "보통",
    color: "bg-orange-100 text-orange-700 border-orange-300",
  },
  {
    value: "high",
    label: "심각",
    color: "bg-red-100 text-red-700 border-red-300",
  },
];

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  곡물: { icon: "🌾", color: "bg-amber-100 text-amber-700" },
  "유제품·계란": { icon: "🥛", color: "bg-blue-100 text-blue-700" },
  "갑각류·어패류": { icon: "🦐", color: "bg-cyan-100 text-cyan-700" },
  견과류: { icon: "🥜", color: "bg-orange-100 text-orange-700" },
  "과일·채소": { icon: "🍑", color: "bg-green-100 text-green-700" },
  육류: { icon: "🥩", color: "bg-red-100 text-red-700" },
  기타: { icon: "⚗️", color: "bg-purple-100 text-purple-700" },
};

export default function AllergyProfilePage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [severity, setSeverity] = useState<Record<string, string>>({});
  const [profileStatus, setProfileStatus] = useState<"unset" | "none" | "has_allergy">("unset");
  const [savedProfileStatus, setSavedProfileStatus] = useState<"unset" | "none" | "has_allergy">("unset");
  const [profileMode, setProfileMode] = useState<"none" | "has_allergy">("has_allergy");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedSelected, setSavedSelected] = useState<Set<string>>(new Set());
  const [savedSeverity, setSavedSeverity] = useState<Record<string, string>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAllergenDetail, setSelectedAllergenDetail] =
    useState<DetailedAllergenInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSeverityEditor, setShowSeverityEditor] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // ✅ 변경 사항 감지
  const hasChanges = (() => {
    if (!isAuthenticated) return false;
    if (profileStatus !== savedProfileStatus) return true;
    if (selected.size !== savedSelected.size) return true;
    for (const code of selected) {
      if (!savedSelected.has(code)) return true;
      if ((severity[code] || "medium") !== (savedSeverity[code] || "medium"))
        return true;
    }
    return false;
  })();

  // ✅ 완성도 계산 (전체 22개 기준)
  const completionPercent = Math.round(
    (selected.size / ALLERGENS.length) * 100,
  );

  const effectiveProfileState: "unset" | "none" | "has_allergy" =
    profileMode === "none" ? "none" : selected.size > 0 ? "has_allergy" : "unset";
  const headerMainCount =
    effectiveProfileState === "none" ? "완료" : `${selected.size}/${ALLERGENS.length}`;
  const headerSubText =
    effectiveProfileState === "none" ? "알레르기 없음" : "설정됨";

  useEffect(() => {
    loadUserAllergens();
    // 기본으로 첫 카테고리 열기
    setExpandedCategories(new Set(["유제품·계란"]));
  }, []);

  const loadUserAllergens = async () => {
    setIsPageLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsAuthenticated(false);
      setSelected(new Set());
      setSeverity({});
      setSavedSelected(new Set());
      setSavedSeverity({});
      setProfileStatus("unset");
      setSavedProfileStatus("unset");
      setProfileMode("has_allergy");
      setShowSeverityEditor(false);
      setIsPageLoading(false);
      return;
    }
    setIsAuthenticated(true);

    const [profileRes, allergyRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("allergy_profile_status")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_allergies").select("*").eq("user_id", user.id),
    ]);

    const status =
      (profileRes.data?.allergy_profile_status as
        | "unset"
        | "none"
        | "has_allergy"
        | undefined) || "unset";

    const data = allergyRes.data || [];
    const codes = new Set(data.map((item: any) => item.allergen_code as string));
    const severityMap: Record<string, string> = {};
    data.forEach((item: any) => {
      severityMap[item.allergen_code] = item.severity || "medium";
    });

    const resolvedStatus =
      codes.size > 0 ? "has_allergy" : status === "none" ? "none" : "unset";

    setSelected(codes);
    setSeverity(severityMap);
    setSavedSelected(new Set(codes));
    setSavedSeverity({ ...severityMap });
    setProfileStatus(resolvedStatus);
    setSavedProfileStatus(resolvedStatus);
    setProfileMode(resolvedStatus === "none" ? "none" : "has_allergy");
    setShowSeverityEditor(codes.size > 0);
    setIsPageLoading(false);
  };

  const handleToggle = (code: string) => {
    setProfileMode("has_allergy");
    setProfileStatus("has_allergy");
    const newSelected = new Set(selected);
    if (newSelected.has(code)) {
      newSelected.delete(code);
      const newSeverity = { ...severity };
      delete newSeverity[code];
      setSeverity(newSeverity);
    } else {
      newSelected.add(code);
      setSeverity((prev) => ({ ...prev, [code]: "medium" }));
    }
    setSelected(newSelected);
    setShowSeverityEditor(newSelected.size > 0);
  };

  const handleSeverityChange = (code: string, value: string) => {
    setSeverity((prev) => ({ ...prev, [code]: value }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  };

  const selectAllInCategory = (category: string) => {
    const codes = ALLERGENS.filter((a) => a.category === category).map(
      (a) => a.code,
    );
    setProfileMode("has_allergy");
    setProfileStatus("has_allergy");
    setSelected((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => {
        next.add(c);
        if (!severity[c]) setSeverity((s) => ({ ...s, [c]: "medium" }));
      });
      return next;
    });
    setShowSeverityEditor(true);
  };

  const deselectAllInCategory = (category: string) => {
    const codes = ALLERGENS.filter((a) => a.category === category).map(
      (a) => a.code,
    );
    setProfileMode("has_allergy");
    setProfileStatus("has_allergy");
    setSelected((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => next.delete(c));
      setShowSeverityEditor(next.size > 0);
      return next;
    });
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
      const nextStatus: "unset" | "none" | "has_allergy" =
        profileMode === "none"
          ? "none"
          : selected.size > 0
            ? "has_allergy"
            : "unset";

      await supabase.from("user_allergies").delete().eq("user_id", user.id);

      if (nextStatus === "has_allergy" && selected.size > 0) {
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

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ allergy_profile_status: nextStatus })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const finalSelected =
        nextStatus === "has_allergy" ? new Set(selected) : new Set<string>();
      const finalSeverity = nextStatus === "has_allergy" ? { ...severity } : {};

      setSelected(finalSelected);
      setSeverity(finalSeverity);
      setSavedSelected(new Set(finalSelected));
      setSavedSeverity({ ...finalSeverity });
      setProfileStatus(nextStatus);
      setSavedProfileStatus(nextStatus);

      if (nextStatus === "none") {
        toast.success("알레르기 없음으로 저장했어요");
      } else {
        toast.success(`알레르기 ${finalSelected.size}개 저장 완료`);
      }

      window.dispatchEvent(new CustomEvent("allergiesUpdated"));
      router.push("/mypage");
      router.refresh();
    } catch (error) {
      toast.error("저장 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDetail = (code: string) => {
    const detailInfo = getDetailedAllergenInfo(code);
    if (detailInfo) {
      setSelectedAllergenDetail(detailInfo);
      setIsModalOpen(true);
    }
  };

  const filteredAllergens = ALLERGENS.filter((allergen) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      allergen.name.toLowerCase().includes(q) ||
      allergen.description.toLowerCase().includes(q) ||
      allergen.commonNames?.some((n) => n.toLowerCase().includes(q))
    );
  });

  const categories = Array.from(new Set(ALLERGENS.map((a) => a.category)));
  const allergensByCategory = categories.map((cat) => ({
    category: cat,
    allergens: filteredAllergens.filter((a) => a.category === cat),
  }));

  if (isPageLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              알레르기 정보 불러오는 중...
            </p>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-24">
          <div className="container mx-auto px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5">
                <h1 className="text-xl font-bold">내 알레르기 관리</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  로그인 후 알레르기 프로필을 저장하고 식품 분석에 자동 반영할 수 있어요.
                </p>
              </div>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">
                    비로그인 상태에서는 프로필 저장이 불가능합니다.
                  </p>
                  <Button className="mt-4 w-full" onClick={() => router.push("/login?next=/food/profile")}>
                    로그인하고 설정하기
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-32 md:pb-20">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            {/* ── 헤더 ── */}
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-xl font-bold shadow">
                    🛡️
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">내 알레르기 관리</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      식약처 지정 22가지 알레르기 성분
                    </p>
                  </div>
                </div>
                {/* 완성도 */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{headerMainCount}</p>
                  <p className="text-xs text-muted-foreground">{headerSubText}</p>
                </div>
              </div>

              {/* 완성도 바 */}
              {effectiveProfileState === "has_allergy" && selected.size > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>알레르기 프로필 완성도</span>
                    <span className="font-medium text-primary">
                      {completionPercent}%
                    </span>
                  </div>
                  <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── 모드 선택 ── */}
            <Card className="mb-5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">알레르기 상태 선택</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMode("has_allergy");
                      if (selected.size > 0) setProfileStatus("has_allergy");
                      else setProfileStatus("unset");
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      profileMode === "has_allergy"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-semibold">알레르기 있음</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      내 알레르기 항목을 직접 선택해 관리
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMode("none");
                      setProfileStatus("none");
                      setSelected(new Set());
                      setSeverity({});
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      profileMode === "none"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-border hover:border-emerald-400"
                    }`}
                  >
                    <p className="text-sm font-semibold">알레르기 없음</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      알레르기 없음 상태로 간단하게 저장
                    </p>
                  </button>
                </div>
                <div className="mt-3 rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                  <p>미설정(unset): 아직 선택하지 않은 상태</p>
                  <p className="mt-1">알레르기 없음(none): 없음으로 저장 완료된 상태</p>
                </div>
              </CardContent>
            </Card>

            {profileMode === "none" && (
              <Card className="mb-5 border-emerald-200 bg-emerald-50/70">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-emerald-800">
                    알레르기 없음 모드
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    저장하면 등록된 알레르기 목록이 모두 해제됩니다. 나중에 필요하면 다시 설정할 수 있어요.
                  </p>
                </CardContent>
              </Card>
            )}

            {profileMode === "has_allergy" && (
              <>
            {/* ── 선택된 알레르기 요약 ── */}
            {selected.size > 0 ? (
              <Card className="mb-5 border-primary/20">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      선택한 알레르기 ({selected.size}개)
                    </CardTitle>
                    <button
                      onClick={() => {
                        setSelected(new Set());
                        setSeverity({});
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      전체 해제
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {/* 선택된 알레르기 칩 목록 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Array.from(selected).map((code) => {
                      const allergen = ALLERGENS.find((a) => a.code === code);
                      if (!allergen) return null;
                      const sev = severity[code] || "medium";
                      return (
                        <div
                          key={code}
                          className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm shadow-sm"
                        >
                          <span>{allergen.emoji}</span>
                          <span className="font-medium">{allergen.name}</span>
                          <button
                            onClick={() => handleToggle(code)}
                            className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* 심각도 설정 */}
                  <div className="border-t pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        심각도 설정 (각 알레르기별 반응 강도)
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowSeverityEditor((v) => !v)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {showSeverityEditor ? "접기" : "펼치기"}
                      </button>
                    </div>
                    {showSeverityEditor && <div className="space-y-2">
                      {Array.from(selected).map((code) => {
                        const allergen = ALLERGENS.find((a) => a.code === code);
                        if (!allergen) return null;
                        const sev = severity[code] || "medium";
                        return (
                          <div key={code} className="flex items-center gap-2">
                            <span className="text-sm w-20 shrink-0 font-medium">
                              {allergen.emoji} {allergen.name}
                            </span>
                            <div className="flex gap-1.5">
                              {SEVERITY_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() =>
                                    handleSeverityChange(code, opt.value)
                                  }
                                  className={`px-2.5 py-1 rounded-full text-xs border transition-all font-medium ${
                                    sev === opt.value
                                      ? opt.color + " shadow-sm scale-105"
                                      : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* ── 빈 상태 ── */
              <div className="mb-5 rounded-xl border-2 border-dashed border-muted-foreground/20 p-6 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="font-medium text-sm">
                  아직 알레르기를 선택하지 않았어요
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  아래 빠른 선택 또는 카테고리에서 선택해주세요
                </p>
              </div>
            )}

            {/* ── 빠른 선택 ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2.5">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">
                  자주 선택되는 알레르기
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map((code) => {
                  const allergen = ALLERGENS.find((a) => a.code === code);
                  if (!allergen) return null;
                  const isSelected = selected.has(code);
                  return (
                    <button
                      key={code}
                      onClick={() => handleToggle(code)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <span>{allergen.emoji}</span>
                      <span>{allergen.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 검색바 ── */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="알레르기 검색... (예: 우유, 글루텐, 땅콩)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
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

            {/* ── 카테고리별 목록 ── */}
            <div className="space-y-3">
              {allergensByCategory.map(({ category, allergens }) => {
                if (allergens.length === 0) return null;
                const isExpanded = expandedCategories.has(category);
                const meta = CATEGORY_META[category] || {
                  icon: "•",
                  color: "bg-gray-100 text-gray-700",
                };
                const selectedInCategory = allergens.filter((a) =>
                  selected.has(a.code),
                ).length;
                const allSelected = selectedInCategory === allergens.length;

                return (
                  <Card key={category} className="overflow-hidden">
                    <CardHeader
                      className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${meta.color}`}
                          >
                            {meta.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{category}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedInCategory > 0
                                ? `${selectedInCategory}/${allergens.length} 선택됨`
                                : `${allergens.length}개`}
                            </p>
                          </div>
                          {selectedInCategory > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-5"
                            >
                              {selectedInCategory}
                            </Badge>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {allergens.length > 1 && (
                            <button
                              onClick={() =>
                                allSelected
                                  ? deselectAllInCategory(category)
                                  : selectAllInCategory(category)
                              }
                              className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/5"
                            >
                              {allSelected ? "전체 해제" : "전체 선택"}
                            </button>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-3 px-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {allergens.map((allergen) => {
                            const isSelected = selected.has(allergen.code);
                            return (
                              <div
                                key={allergen.code}
                                onClick={() => handleToggle(allergen.code)}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                                  isSelected
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-transparent bg-muted/40 hover:border-muted-foreground/20 hover:bg-muted/60"
                                }`}
                              >
                                <span className="text-xl shrink-0">
                                  {allergen.emoji}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-sm">
                                      {allergen.name}
                                    </p>
                                    {allergen.severity === "high" && (
                                      <Badge
                                        variant="destructive"
                                        className="text-[9px] px-1 h-3.5"
                                      >
                                        심각
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {allergen.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isSelected ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShowDetail(allergen.code);
                                    }}
                                    className="p-1 hover:bg-background rounded transition-colors"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

              </>
            )}

            {/* ── 참고 자료 ── */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                {
                  label: "대한 알레르기학회",
                  url: "https://www.allergy.or.kr",
                },
                {
                  label: "식품안전나라",
                  url: "https://foodsafetykorea.go.kr/main.do",
                },
                {
                  label: "Allergy Insider",
                  url: "https://www.thermofisher.com/allergy/kr/ko/home.html",
                },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border bg-card p-2.5 text-xs hover:border-primary/40 transition-colors"
                >
                  <span className="font-medium truncate">{link.label}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── 하단 sticky 저장 바 ── */}
      <div
        className={`fixed bottom-16 md:bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
          hasChanges
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="border-t bg-background/95 backdrop-blur-sm shadow-lg px-4 py-3">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-muted-foreground truncate">
                저장하지 않은 변경사항이 있어요
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadUserAllergens}
                disabled={isLoading}
                className="h-9"
              >
                되돌리기
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
                className="h-9 min-w-[80px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1.5" />
                    저장
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <MobileNav />

      <AllergenDetailModal
        allergen={selectedAllergenDetail}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}

