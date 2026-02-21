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
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";
import { LoginModal } from "@/components/auth/login-modal";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ─── 탭 컴포넌트 ───
import FoodTab from "@/components/tabs/FoodTab";
import RestaurantTab from "@/components/tabs/RestaurantTab";
import DietTab from "@/components/tabs/DietTab";
import SymptomTab from "@/components/tabs/SymptomTab";
import HospitalTab from "@/components/tabs/HospitalTab";
import MedicineTab from "@/components/tabs/MedicineTab";

// ─── Types ───
type MainTab = "meal" | "sick";
type MealSubTab = "restaurant" | "food" | "diet";
type SickSubTab = "symptom" | "hospital" | "medicine";

// ─── TabButton ───
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
      className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all relative ${
        active
          ? `${color} after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:rounded-full after:bg-current`
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

// ─── SubTabButton ───
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
      className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap cursor-pointer ${
        active
          ? "text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:rounded-full after:bg-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─── Loading Fallback ───
function TabLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ─── Component ───
export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // ─── 탭 상태 ───
  const [mainTab, setMainTab] = useState<MainTab>("meal");
  const [mealSubTab, setMealSubTab] = useState<MealSubTab>("food");
  const [sickSubTab, setSickSubTab] = useState<SickSubTab>("symptom");

  // 한 번이라도 방문한 탭만 마운트 (lazy mount)
  const [visited, setVisited] = useState<Set<string>>(new Set(["food"]));
  const activeTab = mainTab === "meal" ? mealSubTab : sickSubTab;

  // ─── 초기 로딩 프로그레스 (실제 진행률 기반) ───
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState("시작하는 중...");
  const [isFadingOut, setIsFadingOut] = useState(false);

  // FoodTab → page.tsx 진행률 콜백 (항상 증가만 허용)
  const handleFoodTabProgress = useCallback((progress: number, label: string) => {
    setLoadProgress((prev) => {
      const next = Math.max(prev, progress);
      return Math.min(next, 100);
    });
    setLoadLabel(label);
  }, []);

  // 100% 도달 시 페이드아웃 → 제거
  useEffect(() => {
    if (loadProgress >= 100 && isInitialLoading) {
      setIsFadingOut(true);
      const timer = setTimeout(() => setIsInitialLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loadProgress, isInitialLoading]);

  // 안전장치: 8초 후에도 안 끝나면 강제 완료
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

  // ★ 투어 가이드
  const [tourActive, setTourActive] = useState(false);

  // ─── Auth ───
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

  // 페이지 마운트 시 초기 진행률
  useEffect(() => {
    setLoadProgress(10);
    setLoadLabel("페이지 준비 중...");
  }, []);

  // ★ 투어 가이드 트리거
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
      } catch { /* 무시 */ }
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("pyeonharu_tour_done", "true");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ═══ 초기 로딩 프로그레스 바 (실제 진행률 기반) ═══ */}
      {isInitialLoading && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
            isFadingOut ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex flex-col items-center gap-6">
            {/* 로고 */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
                <span className="text-2xl font-bold text-primary-foreground">편</span>
              </div>
              <span className="text-2xl font-bold text-foreground">편하루</span>
            </div>

            {/* 프로그레스 바 */}
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

      <Header
        mainTab={mainTab}
        onMainTabChange={setMainTab}
      />

      {/* ═══ 메인 탭 (모바일에서만 표시, 데스크톱은 헤더에) ═══ */}
      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
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

      {/* ═══ 서브 탭 ═══ */}
      <div className="sticky top-[7.5rem] md:top-16 z-30 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center overflow-x-auto scrollbar-hide" data-tour="search-tabs">
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
                  label="병원"
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

      {/* ═══ 탭 콘텐츠 (방문한 탭만 마운트, 활성 탭만 표시) ═══ */}
      <main className="flex-1 pb-16 md:pb-0">
        <div style={{ display: activeTab === "food" ? "block" : "none" }}>
          {visited.has("food") && <FoodTab onProgress={handleFoodTabProgress} />}
        </div>
        <div style={{ display: activeTab === "restaurant" ? "block" : "none" }}>
          {visited.has("restaurant") && <RestaurantTab />}
        </div>
        <div style={{ display: activeTab === "diet" ? "block" : "none" }}>
          {visited.has("diet") && <DietTab />}
        </div>
        <div style={{ display: activeTab === "medicine" ? "block" : "none" }}>
          {visited.has("medicine") && <MedicineTab />}
        </div>
        {activeTab === "symptom" && <SymptomTab />}
        {activeTab === "hospital" && <HospitalTab />}
      </main>

      <Footer />

      {/* 모바일 하단 네비 */}
      <MobileNav mainTab={mainTab} onMainTabChange={setMainTab} />

      {/* 로그인 모달 */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={() => router.refresh()}
      />

      {/* 온보딩 투어 */}
      <OnboardingTour active={tourActive} onFinish={handleTourFinish} />
    </div>
  );
}
