"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Stethoscope,
  Store,
  ShieldCheck,
  Activity,
  Pill,
  Building2,
  HeartPulse,
  Loader2,
  Pin,
  Check,
  UserRound,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";
import { LoginModal } from "@/components/auth/login-modal";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import FoodTab from "@/components/tabs/FoodTab";
import RestaurantTab from "@/components/tabs/RestaurantTab";
import DietTab from "@/components/tabs/DietTab";
import SymptomTab from "@/components/tabs/SymptomTab";
import HospitalTab from "@/components/tabs/HospitalTab";
import MedicineTab from "@/components/tabs/MedicineTab";
import DoctorTab from "@/components/tabs/DoctorTab";
import { PyeonharuLogo } from "@/components/pyeonharu-logo";
import MealRecommend from "@/components/meal-recommend";
import { toast } from "sonner";
import { useBackHandler } from "@/lib/hooks/use-back-handler";

type MainTab = "meal" | "sick";
type MealSubTab = "restaurant" | "food" | "diet";
type SickSubTab = "symptom" | "hospital" | "medicine" | "doctor";

// ── 첫 화면 설정 키 ──
const HOME_TAB_KEY = "pyeonharu_home_tab";

// 탭 조합 → 한글 라벨
const TAB_LABELS: Record<string, string> = {
  "meal:food": "식사 > 식품",
  "meal:restaurant": "식사 > 음식점",
  "meal:diet": "식사 > 식단관리",
  "sick:symptom": "아파요 > 증상",
  "sick:hospital": "아파요 > 병원/약국",
  "sick:medicine": "아파요 > 약",
  "sick:doctor": "아파요 > 의사",
};

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all relative ${active ? `${color} after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:rounded-full after:bg-current` : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function SubTabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm transition-all relative whitespace-nowrap cursor-pointer ${active ? "font-semibold text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:rounded-full after:bg-primary" : "font-medium text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  useBackHandler(loginModalOpen, () => setLoginModalOpen(false));

  // ✅ 기본값으로 초기화 (SSR 안전)
  const [mainTab, setMainTab] = useState<MainTab>("meal");
  const [mealSubTab, setMealSubTab] = useState<MealSubTab>("food");
  const [sickSubTab, setSickSubTab] = useState<SickSubTab>("symptom");

  // ✅ 저장된 첫 화면 키
  const [savedHomeKey, setSavedHomeKey] = useState("meal:food");

  // ✅ 클라이언트에서 localStorage 읽어 첫 화면 복원
  const [homeRestored, setHomeRestored] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HOME_TAB_KEY);
      if (stored) {
        const [main, sub] = stored.split(":");
        if (main === "meal" && ["food", "restaurant", "diet"].includes(sub)) {
          setMainTab("meal");
          setMealSubTab(sub as MealSubTab);
        } else if (
          main === "sick" &&
          ["symptom", "hospital", "medicine", "doctor"].includes(sub)
        ) {
          setMainTab("sick");
          setSickSubTab(sub as SickSubTab);
        }
        setSavedHomeKey(stored);
      }
    } catch {}
    setHomeRestored(true);
    // 서브페이지에서 탭 선택 후 돌아온 경우
    const navTab = localStorage.getItem("pyeonharu_nav_tab");
    if (navTab) {
      localStorage.removeItem("pyeonharu_nav_tab");
      const [m, s] = navTab.split(":");
      if (m === "meal" && ["food", "restaurant", "diet"].includes(s)) {
        setMainTab("meal");
        setMealSubTab(s as any);
      } else if (
        m === "sick" &&
        ["symptom", "hospital", "medicine"].includes(s)
      ) {
        setMainTab("sick");
        setSickSubTab(s as any);
      }
    }
  }, []);

  // ✅ 현재 탭이 첫 화면으로 설정되어 있는지 확인
  const currentTabKey =
    mainTab === "meal" ? `meal:${mealSubTab}` : `sick:${sickSubTab}`;
  const isCurrentHome = currentTabKey === savedHomeKey;

  const setAsHome = () => {
    try {
      localStorage.setItem(HOME_TAB_KEY, currentTabKey);
      setSavedHomeKey(currentTabKey);
      toast.success(
        `'${TAB_LABELS[currentTabKey] || currentTabKey}'을(를) 첫 화면으로 설정했어요`,
      );
    } catch {
      toast.error("설정 저장에 실패했습니다");
    }
  };

  const [visited, setVisited] = useState<Set<string>>(
    new Set(["food", "restaurant", "diet", "medicine"]),
  );
  const activeTab = mainTab === "meal" ? mealSubTab : sickSubTab;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState("시작하는 중...");
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleFoodTabProgress = useCallback(
    (progress: number, label: string) => {
      setLoadProgress((prev) => Math.min(Math.max(prev, progress), 100));
      setLoadLabel(label);
    },
    [],
  );

  useEffect(() => {
    if (loadProgress >= 100 && isInitialLoading) {
      setIsFadingOut(true);
      const timer = setTimeout(() => setIsInitialLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loadProgress, isInitialLoading]);

  useEffect(() => {
    const fallback = setTimeout(() => {
      if (isInitialLoading) {
        setLoadProgress(100);
        setLoadLabel("완료!");
      }
    }, 8000);
    return () => clearTimeout(fallback);
  }, [isInitialLoading]);

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setLoadProgress(10);
    setLoadLabel("페이지 준비 중...");
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    const timer = setTimeout(() => {
      if (user) {
        const completed = user.user_metadata?.onboarding_completed === true;
        if (!completed) setTourActive(true);
      } else {
        if (typeof window !== "undefined") {
          const visited = localStorage.getItem("pyeonharu_tour_done");
          if (!visited) setTourActive(true);
        }
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [user]);

  const handleTourFinish = async () => {
    setTourActive(false);
    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { onboarding_completed: true },
        });
      } catch {
        /* 무시 */
      }
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("pyeonharu_tour_done", "true");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ✅ pointer-events-none 추가: 로딩 중에도 뒤 탭 클릭 가능 */}
      {isInitialLoading && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 pointer-events-none ${isFadingOut ? "opacity-0" : "opacity-100"}`}
        >
          <div className="flex flex-col items-center gap-6">
            <PyeonharuLogo size="lg" />
            <div className="w-72">
              <div className="mb-2 flex items-center justify-between px-0.5">
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {loadLabel}
                </span>
                <span className="text-sm font-bold tabular-nums text-primary">
                  {loadProgress}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              안전한 식사를 준비하고 있어요 🍽️
            </p>
          </div>
        </div>
      )}

      <Header mainTab={mainTab} onMainTabChange={setMainTab} />

      {/* ✅ 모바일 식사/아파요 탭 */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex">
          <TabButton
            active={mainTab === "meal"}
            onClick={() => setMainTab("meal")}
            icon={UtensilsCrossed}
            label="식사"
            color="text-amber-600"
          />
          <TabButton
            active={mainTab === "sick"}
            onClick={() => setMainTab("sick")}
            icon={HeartPulse}
            label="아파요"
            color="text-rose-600"
          />
        </div>
      </div>

      <div className="sticky top-[calc(7.5rem+env(safe-area-inset-top))] md:top-16 z-30 bg-background border-b">
        <div className="container mx-auto px-4">
          <div
            className="flex items-center justify-center overflow-x-auto scrollbar-hide"
            data-tour="search-tabs"
          >
            {mainTab === "meal" ? (
              <>
                <SubTabButton
                  active={mealSubTab === "food"}
                  onClick={() => setMealSubTab("food")}
                  icon={ShieldCheck}
                  label="식품"
                />
                <SubTabButton
                  active={mealSubTab === "restaurant"}
                  onClick={() => setMealSubTab("restaurant")}
                  icon={Store}
                  label="음식점"
                />
                <SubTabButton
                  active={mealSubTab === "diet"}
                  onClick={() => setMealSubTab("diet")}
                  icon={Activity}
                  label="식단관리"
                />
              </>
            ) : (
              <>
                <SubTabButton
                  active={sickSubTab === "symptom"}
                  onClick={() => setSickSubTab("symptom")}
                  icon={Stethoscope}
                  label="증상"
                />
                <SubTabButton
                  active={sickSubTab === "hospital"}
                  onClick={() => setSickSubTab("hospital")}
                  icon={Building2}
                  label="병원/약국"
                />
                <SubTabButton
                  active={sickSubTab === "doctor"}
                  onClick={() => setSickSubTab("doctor")}
                  icon={UserRound}
                  label="의사"
                />
                <SubTabButton
                  active={sickSubTab === "medicine"}
                  onClick={() => setSickSubTab("medicine")}
                  icon={Pill}
                  label="약"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 pb-20 md:pb-0">
        {/* ═══ 식품 탭 (+ AI 추천 사이드바) ═══ */}
        <div style={{ display: activeTab === "food" ? "block" : "none" }}>
          <div className="container mx-auto px-4 pt-3">
            <div className="flex gap-4 justify-center">
              <div className="w-full max-w-2xl">
                <FoodTab onProgress={handleFoodTabProgress} />
              </div>
              <div className="hidden lg:block w-[320px] shrink-0">
                <div className="sticky top-[7.5rem]">
                  <MealRecommend />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: activeTab === "restaurant" ? "block" : "none" }}>
          <RestaurantTab />
        </div>
        <div style={{ display: activeTab === "diet" ? "block" : "none" }}>
          <DietTab />
        </div>
        <div style={{ display: activeTab === "medicine" ? "block" : "none" }}>
          <MedicineTab />
        </div>
        {activeTab === "symptom" && <SymptomTab />}
        {activeTab === "hospital" && <HospitalTab />}
        {activeTab === "doctor" && <DoctorTab />}
      </main>

      {/* ═══ 첫 화면 설정 고정 버튼 (로딩 완료 후 표시) ═══ */}
      {!isInitialLoading && homeRestored && (
        <div className="fixed bottom-20 right-3 z-40 md:bottom-6 md:right-6">
          <button
            onClick={setAsHome}
            disabled={isCurrentHome}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium shadow-lg transition-all active:scale-95 ${
              isCurrentHome
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-background text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
            }`}
          >
            {isCurrentHome ? (
              <>
                <Check className="h-3.5 w-3.5" />첫 화면
              </>
            ) : (
              <>
                <Pin className="h-3.5 w-3.5" />첫 화면으로 설정
              </>
            )}
          </button>
        </div>
      )}

      <Footer />
      <MobileNav />
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={() => router.refresh()}
      />
      <WelcomeModal active={tourActive} onFinish={handleTourFinish} />
    </div>
  );
}
