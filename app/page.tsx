"use client";

import { useState, useEffect, lazy, Suspense } from "react";
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

// ─── 탭 컴포넌트 (lazy) ───
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

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
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
          {visited.has("food") && <FoodTab />}
        </div>
        <div style={{ display: activeTab === "restaurant" ? "block" : "none" }}>
          {visited.has("restaurant") && <RestaurantTab />}
        </div>
        <div style={{ display: activeTab === "diet" ? "block" : "none" }}>
          {visited.has("diet") && <DietTab />}
        </div>
        <div style={{ display: activeTab === "symptom" ? "block" : "none" }}>
          {visited.has("symptom") && <SymptomTab />}
        </div>
        <div style={{ display: activeTab === "hospital" ? "block" : "none" }}>
          {visited.has("hospital") && <HospitalTab />}
        </div>
        <div style={{ display: activeTab === "medicine" ? "block" : "none" }}>
          {visited.has("medicine") && <MedicineTab />}
        </div>
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
