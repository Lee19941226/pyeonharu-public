"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Camera,
  Lock,
  ChevronRight,
  Stethoscope,
  UtensilsCrossed,
  MapPinned,
  Pill,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Building2,
  Phone,
  MapPin,
  Cross,
  ChevronDown,
  UtensilsCrossed as MealIcon,
  ShieldAlert,
  GraduationCap,
  LogIn,
  CalendarDays,
  AlertTriangle,
  Heart,
  MessageCircle,
  Eye,
  PenLine,
  Scan,
  Zap,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LoginModal } from "@/components/auth/login-modal";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { BookmarkButton } from "@/components/medical/bookmark-button";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { UploadSheet } from "@/components/food/upload-sheet";

// ─── 드롭다운 전용 미니맵 (naver-map.tsx와 동일한 스크립트 로딩) ───
function MiniNaverMap({
  lat,
  lng,
  name,
  userLocation,
}: {
  lat: number;
  lng: number;
  name: string;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const NAVER_CLIENT_ID =
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "4q5sd2kb26";

    if (window.naver?.maps) {
      setReady(true);
      return;
    }

    const existing = document.querySelector('script[src*="maps.js"]');
    if (existing) {
      const timer = setInterval(() => {
        if (window.naver?.maps) {
          setReady(true);
          clearInterval(timer);
        }
      }, 200);
      return () => clearInterval(timer);
    }

    const script = document.createElement("script");
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}`;
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => console.error("네이버 지도 로드 실패");
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const N = window.naver.maps;
    const placePos = new N.LatLng(lat, lng);

    const map = new N.Map(mapRef.current, {
      center: placePos,
      zoom: 16,
      zoomControl: false,
      mapDataControl: false,
      scaleControl: false,
    });

    const shortName = name.length > 10 ? name.slice(0, 10) + "…" : name;
    new N.Marker({
      position: placePos,
      map,
      icon: {
        content: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="padding:3px 8px;background:#dc2626;color:white;font-size:11px;font-weight:600;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;">
              📍 ${shortName}
            </div>
            <div style="width:2px;height:8px;background:#dc2626;"></div>
            <div style="width:8px;height:8px;background:#dc2626;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>
          </div>`,
        anchor: new N.Point(60, 48),
      },
    });

    if (userLocation) {
      const userPos = new N.LatLng(userLocation.lat, userLocation.lng);
      new N.Marker({
        position: userPos,
        map,
        icon: {
          content: `
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div style="padding:2px 6px;background:#2563eb;color:white;font-size:10px;font-weight:500;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.2);">내 위치</div>
              <div style="margin-top:2px;width:12px;height:12px;background:#3b82f6;border-radius:50%;border:2.5px solid white;box-shadow:0 0 0 2px rgba(59,130,246,.3),0 2px 6px rgba(0,0,0,.3);"></div>
            </div>`,
          anchor: new N.Point(24, 32),
        },
      });

      const bounds = new N.LatLngBounds(
        new N.LatLng(
          Math.min(lat, userLocation.lat) - 0.002,
          Math.min(lng, userLocation.lng) - 0.002,
        ),
        new N.LatLng(
          Math.max(lat, userLocation.lat) + 0.002,
          Math.max(lng, userLocation.lng) + 0.002,
        ),
      );
      map.fitBounds(bounds);

      new N.Polyline({
        map,
        path: [userPos, placePos],
        strokeColor: "#6366f1",
        strokeWeight: 2,
        strokeStyle: "shortdash",
        strokeOpacity: 0.6,
      });

      const R = 6371;
      const dLat = ((lat - userLocation.lat) * Math.PI) / 180;
      const dLng = ((lng - userLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distText =
        dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
      const midLat = (lat + userLocation.lat) / 2;
      const midLng = (lng + userLocation.lng) / 2;
      new N.Marker({
        position: new N.LatLng(midLat, midLng),
        map,
        icon: {
          content: `<div style="padding:2px 8px;background:white;border:1px solid #e2e8f0;border-radius:10px;font-size:10px;font-weight:600;color:#6366f1;box-shadow:0 1px 4px rgba(0,0,0,.15);white-space:nowrap;">🚶 ${distText}</div>`,
          anchor: new N.Point(30, 10),
        },
      });
    }
  }, [ready, lat, lng, name, userLocation]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full" />;
}

// ─── 학교 급식 카드 (월간 급식표 포함) ───
function SchoolMealCard({
  entry,
  hasDanger,
  dangerItems,
  onNavigate,
}: {
  entry: { school: MySchool; meals: MealData[] };
  hasDanger: boolean;
  dangerItems: MealMenuItem[];
  onNavigate: () => void;
}) {
  const [showMonthly, setShowMonthly] = useState(false);
  const [monthlyData, setMonthlyData] = useState<
    { date: string; meals: MealData[] }[]
  >([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const allMenuItems = entry.meals.flatMap((m) => m.menu);
  const cautionItems = allMenuItems.filter((m) => m.status === "caution");
  const hasCaution = cautionItems.length > 0;

  const loadMonthlyMeals = async () => {
    if (monthlyData.length > 0) {
      setShowMonthly(!showMonthly);
      return;
    }
    setShowMonthly(true);
    setMonthlyLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      const results: { date: string; meals: MealData[] }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}${String(month).padStart(2, "0")}${String(d).padStart(2, "0")}`;
        try {
          const res = await fetch(
            `/api/school/meals?schoolCode=${entry.school.school_code}&officeCode=${entry.school.office_code}&date=${dateStr}`,
          );
          const data = await res.json();
          if (data.meals && data.meals.length > 0)
            results.push({ date: dateStr, meals: data.meals });
        } catch {
          /* skip */
        }
      }
      setMonthlyData(results);
    } catch (e) {
      console.error("월간 급식 로드 실패:", e);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  const cardStyle = hasDanger
    ? "border-red-200 hover:bg-red-50/50 active:bg-red-50"
    : hasCaution
      ? "border-yellow-200 hover:bg-yellow-50/50 active:bg-yellow-50"
      : "border-green-200 hover:bg-green-50/50 active:bg-green-50";

  return (
    <Card
      className={`border shadow-none cursor-pointer transition-colors ${cardStyle}`}
      onClick={onNavigate}
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${hasDanger ? "bg-red-100" : hasCaution ? "bg-yellow-100" : "bg-green-100"}`}
            >
              {hasDanger ? (
                <ShieldAlert className="h-4 w-4 text-red-500" />
              ) : hasCaution ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {entry.school.school_name} 오늘 급식
              </p>
              <p
                className={`text-xs ${hasDanger ? "text-red-600" : hasCaution ? "text-yellow-600" : "text-green-600"}`}
              >
                {hasDanger
                  ? `⚠️ 주의 메뉴 ${dangerItems.length}개 — ${[...new Set(dangerItems.flatMap((d) => d.matchedAllergens))].join(", ")}`
                  : hasCaution
                    ? `⚠️ 교차오염 주의 ${cautionItems.length}개`
                    : "✅ 오늘 급식은 안전해요!"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        {entry.meals.map((meal, mi) => (
          <div key={mi} className={mi > 0 ? "mt-2 border-t pt-2" : ""}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {meal.mealTypeName} {meal.calInfo && `· ${meal.calInfo}`}
            </p>
            <div className="flex flex-wrap gap-1">
              {meal.menu.map((item, j) => (
                <Badge
                  key={j}
                  variant={
                    item.status === "danger" ? "destructive" : "secondary"
                  }
                  className={`text-xs font-normal ${item.status === "danger" ? "" : item.status === "caution" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" : "bg-muted text-muted-foreground"}`}
                >
                  {(item.status === "danger" || item.status === "caution") &&
                    "⚠️ "}
                  {item.name}
                </Badge>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={(e) => {
            e.stopPropagation();
            loadMonthlyMeals();
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {showMonthly
            ? `${monthLabel} 급식표 접기`
            : `${monthLabel} 급식표 보기`}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showMonthly ? "rotate-180" : ""}`}
          />
        </button>

        {showMonthly && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            {monthlyLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">
                  급식표를 불러오는 중...
                </span>
              </div>
            ) : monthlyData.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                이번 달 급식 정보가 없습니다
              </p>
            ) : (
              (() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = now.getDate();
                const mealsByDay: Record<number, MealData[]> = {};
                monthlyData.forEach((d) => {
                  mealsByDay[Number(d.date.slice(6, 8))] = d.meals;
                });
                const cells: (number | null)[] = [];
                for (let i = 0; i < firstDay; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                while (cells.length % 7 !== 0) cells.push(null);
                const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
                return (
                  <div className="overflow-x-auto">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: "1px",
                      }}
                      className="mb-px"
                    >
                      {dayNames.map((d, i) => (
                        <div
                          key={d}
                          className={`py-1 text-center text-[10px] font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: "1px",
                      }}
                      className="rounded-lg border bg-border overflow-hidden"
                    >
                      {cells.map((day, i) => {
                        if (day === null)
                          return (
                            <div key={i} className="min-h-[80px] bg-muted/30" />
                          );
                        const meals = mealsByDay[day];
                        const isToday = day === today;
                        const dayOfWeek = (firstDay + day - 1) % 7;
                        return (
                          <div
                            key={i}
                            className={`min-h-[80px] p-1 bg-white ${isToday ? "ring-2 ring-inset ring-primary" : ""}`}
                          >
                            <p
                              className={`text-[10px] font-bold mb-0.5 ${isToday ? "text-primary" : dayOfWeek === 0 ? "text-red-400" : dayOfWeek === 6 ? "text-blue-400" : "text-foreground"}`}
                            >
                              {day}
                            </p>
                            {meals ? (
                              <div className="space-y-px">
                                {meals
                                  .flatMap((m) => m.menu)
                                  .map((item, j) => (
                                    <p
                                      key={j}
                                      className={`truncate text-[9px] leading-tight ${item.status === "danger" ? "text-red-600 font-semibold" : item.status === "caution" ? "text-yellow-600 font-medium" : "text-gray-500"}`}
                                      title={item.name}
                                    >
                                      {(item.status === "danger" ||
                                        item.status === "caution") &&
                                        "⚠️"}
                                      {item.name}
                                    </p>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-[9px] text-muted-foreground/40">
                                -
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />{" "}
                        알레르기 주의
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />{" "}
                        교차오염
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm ring-2 ring-primary" />{" "}
                        오늘
                      </span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Types ───
interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  phone: string;
  clCdNm?: string;
  distance: string;
  distanceNum: number;
  lat: number;
  lng: number;
}
interface MedicineItem {
  id: string;
  name: string;
  company: string;
  efficacy: string;
  image: string;
}
type SearchMode = "food" | "symptom" | "search" | "medicine";
interface MealMenuItem {
  name: string;
  allergenNames: string[];
  status: "safe" | "danger" | "caution" | "unknown";
  matchedAllergens: string[];
  crossAllergens?: string[];
}
interface MealData {
  mealTypeName: string;
  menu: MealMenuItem[];
  calInfo: string;
}
interface MySchool {
  id: string;
  school_code: string;
  office_code: string;
  school_name: string;
}

// ─── Component ───
export default function HomePage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<SearchMode>("food");
  const [symptomInput, setSymptomInput] = useState("");
  const [foodInput, setFoodInput] = useState("");

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [placeType, setPlaceType] = useState<"hospital" | "pharmacy">(
    "hospital",
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "loading" | "granted" | "denied"
  >("loading");
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(3);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState("");
  const [placeSearchResults, setPlaceSearchResults] = useState<NearbyPlace[]>(
    [],
  );
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [placeSearched, setPlaceSearched] = useState(false);
  const [placePage, setPlacePage] = useState(1);
  const PLACES_PER_PAGE = 5;

  const [medicineQuery, setMedicineQuery] = useState("");
  const [medicineResults, setMedicineResults] = useState<MedicineItem[]>([]);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [medicineSearched, setMedicineSearched] = useState(false);
  const [medicineTotalCount, setMedicineTotalCount] = useState(0);

  const [recentChecks, setRecentChecks] = useState<
    { foodName: string; isSafe: boolean; checkedAt: string }[]
  >([]);

  const [mySchools, setMySchools] = useState<MySchool[]>([]);
  const [allSchoolMeals, setAllSchoolMeals] = useState<
    { school: MySchool; meals: MealData[] }[]
  >([]);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealStatus, setMealStatus] = useState<
    "loading" | "no-login" | "no-school" | "no-meal" | "loaded"
  >("loading");

  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [popularLikes, setPopularLikes] = useState<any[]>([]);
  const [popularViews, setPopularViews] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  // 파일 업로드 관련
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // ★ 투어 가이드
  const [tourActive, setTourActive] = useState(false);

  // ─── Effects ───
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
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("food_check_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentChecks(
          parsed
            .sort(
              (a: any, b: any) =>
                new Date(b.checkedAt).getTime() -
                new Date(a.checkedAt).getTime(),
            )
            .slice(0, 3),
        );
      }
    } catch {
      /* 무시 */
    }
  }, []);

  // ★ 투어 가이드 트리거
  useEffect(() => {
    if (user === undefined) return;
    // 페이지 로드 후 약간의 딜레이 (UI 렌더링 대기)
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
    // 완료 기록
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

  // 급식 데이터 로드
  useEffect(() => {
    loadMealData();
  }, [user]);
  useEffect(() => {
    loadCommunityPosts();
  }, []);

  const loadCommunityPosts = async () => {
    setCommunityLoading(true);
    try {
      const schoolRes = await fetch("/api/school/register");
      const schoolData = await schoolRes.json();
      const schools = schoolData.schools || [];
      if (schools.length > 0) {
        const codes = schools.map((s: any) => s.school_code).join(",");
        const res = await fetch(
          `/api/community?schoolCodes=${codes}&sort=latest&limit=10`,
        );
        const data = await res.json();
        setCommunityPosts(data.posts || []);
      }
      const popRes = await fetch("/api/community?mode=popular");
      const popData = await popRes.json();
      setPopularLikes(popData.topLikes || []);
      setPopularViews(popData.topViews || []);
    } catch {
      /* 무시 */
    } finally {
      setCommunityLoading(false);
    }
  };

  const loadMealData = async () => {
    if (!user) {
      setMealStatus("no-login");
      return;
    }
    setMealLoading(true);
    try {
      const res = await fetch("/api/school/register");
      if (!res.ok) {
        setMealStatus("no-school");
        setMealLoading(false);
        return;
      }
      const data = await res.json();
      const schools: MySchool[] = data.schools || [];
      setMySchools(schools);
      if (schools.length === 0) {
        setMealStatus("no-school");
        setMealLoading(false);
        return;
      }
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const results: { school: MySchool; meals: MealData[] }[] = [];
      for (const school of schools) {
        try {
          const mealRes = await fetch(
            `/api/school/meals?schoolCode=${school.school_code}&officeCode=${school.office_code}&date=${today}`,
          );
          const mealData = await mealRes.json();
          results.push({ school, meals: mealData.meals || [] });
        } catch {
          results.push({ school, meals: [] });
        }
      }
      setAllSchoolMeals(results);
      setMealStatus("loaded");
    } catch (e) {
      console.error("급식 로드 실패:", e);
      setMealStatus("no-school");
    } finally {
      setMealLoading(false);
    }
  };

  useEffect(() => {
    if (searchMode !== "search") return;
    if (userLocation) {
      fetchNearbyPlaces();
      return;
    }
    setLocationStatus("loading");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLocationStatus("granted");
        },
        () => {
          setUserLocation({ lat: 37.3595, lng: 126.9354 });
          setLocationStatus("denied");
        },
      );
    } else {
      setUserLocation({ lat: 37.3595, lng: 126.9354 });
      setLocationStatus("denied");
    }
  }, [searchMode]);

  useEffect(() => {
    if (searchMode === "search" && userLocation) {
      setSelectedPlaceId(null);
      fetchNearbyPlaces();
    }
  }, [userLocation, placeType, radiusKm]);

  const fetchNearbyPlaces = async () => {
    if (!userLocation) return;
    setPlaceLoading(true);
    try {
      const radiusM = radiusKm * 1000;
      if (placeType === "hospital") {
        const res = await fetch(
          `/api/hospitals?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radiusM}&numOfRows=1000`,
        );
        const data = await res.json();
        setNearbyPlaces(
          data.success && data.hospitals
            ? data.hospitals.map((h: any) => ({
                id: h.id,
                name: h.name,
                address: h.address,
                phone: h.phone,
                clCdNm: h.clCdNm,
                distance: h.distance,
                distanceNum: h.distanceNum || 0,
                lat: h.lat,
                lng: h.lng,
              }))
            : [],
        );
      } else {
        const res = await fetch(
          `/api/pharmacies?lat=${userLocation.lat}&lng=${userLocation.lng}`,
        );
        const data = await res.json();
        setNearbyPlaces(
          data.pharmacies
            ? data.pharmacies
                .map((p: any) => ({
                  id: p.hpid || String(Math.random()),
                  name: p.dutyName,
                  address: p.dutyAddr,
                  phone: p.dutyTel1,
                  clCdNm: "약국",
                  distance: p.distance || "",
                  distanceNum: parseFloat(p.distance) || 0,
                  lat: p.wgs84Lat,
                  lng: p.wgs84Lon,
                }))
                .sort(
                  (a: NearbyPlace, b: NearbyPlace) =>
                    a.distanceNum - b.distanceNum,
                )
            : [],
        );
      }
    } catch {
      setNearbyPlaces([]);
    } finally {
      setPlaceLoading(false);
    }
  };

  const handleSymptomSearch = () => {
    if (symptomInput.trim())
      router.push(`/symptom?q=${encodeURIComponent(symptomInput)}`);
  };
  const handleFoodSearch = () => {
    if (foodInput.trim())
      router.push(`/can-i-eat?q=${encodeURIComponent(foodInput)}`);
  };
  const handleMedicineSearch = async () => {
    if (!medicineQuery.trim()) return;
    setMedicineLoading(true);
    setMedicineSearched(true);
    try {
      const response = await fetch(
        `/api/medicine?itemName=${encodeURIComponent(medicineQuery)}`,
      );
      const data = await response.json();
      if (response.ok) {
        setMedicineResults((data.items || []).slice(0, 5));
        setMedicineTotalCount(data.totalCount || 0);
      } else {
        setMedicineResults([]);
        setMedicineTotalCount(0);
      }
    } catch {
      setMedicineResults([]);
    } finally {
      setMedicineLoading(false);
    }
  };

  const getSidoCdFromLocation = (lat: number, lng: number): string => {
    const centers: Record<string, { lat: number; lng: number; code: string }> =
      {
        서울: { lat: 37.5665, lng: 126.978, code: "110000" },
        부산: { lat: 35.1796, lng: 129.0756, code: "210000" },
        대구: { lat: 35.8714, lng: 128.6014, code: "220000" },
        인천: { lat: 37.4563, lng: 126.7052, code: "230000" },
        광주: { lat: 35.1595, lng: 126.8526, code: "240000" },
        대전: { lat: 36.3504, lng: 127.3845, code: "250000" },
        울산: { lat: 35.5384, lng: 129.3114, code: "260000" },
        세종: { lat: 36.48, lng: 127.259, code: "290000" },
        경기: { lat: 37.275, lng: 127.0094, code: "310000" },
        강원: { lat: 37.8228, lng: 128.1555, code: "320000" },
        충북: { lat: 36.6357, lng: 127.4913, code: "330000" },
        충남: { lat: 36.6588, lng: 126.6728, code: "340000" },
        전북: { lat: 35.8203, lng: 127.1088, code: "350000" },
        전남: { lat: 34.8161, lng: 126.4629, code: "360000" },
        경북: { lat: 36.576, lng: 128.506, code: "370000" },
        경남: { lat: 35.2384, lng: 128.6924, code: "380000" },
        제주: { lat: 33.4996, lng: 126.5312, code: "390000" },
      };
    let closest = "310000";
    let minDist = Infinity;
    for (const c of Object.values(centers)) {
      const d = Math.sqrt((lat - c.lat) ** 2 + (lng - c.lng) ** 2);
      if (d < minDist) {
        minDist = d;
        closest = c.code;
      }
    }
    return closest;
  };

  const handlePlaceSearch = async () => {
    if (!placeSearchQuery.trim()) {
      setPlaceSearched(false);
      setPlaceSearchResults([]);
      return;
    }
    if (!userLocation) return;
    setPlaceSearchLoading(true);
    setPlaceSearched(true);
    setPlacePage(1);
    setSelectedPlaceId(null);
    try {
      const sidoCd = getSidoCdFromLocation(userLocation.lat, userLocation.lng);
      if (placeType === "hospital") {
        const res = await fetch(
          `/api/area/hospitals?sidoCd=${sidoCd}&keyword=${encodeURIComponent(placeSearchQuery)}&numOfRows=50`,
        );
        const data = await res.json();
        setPlaceSearchResults(
          (data.hospitals || []).map((h: any) => ({
            id: h.id,
            name: h.name,
            address: h.address,
            phone: h.phone,
            clCdNm: h.clCdNm,
            distance: "",
            distanceNum: 0,
            lat: h.lat,
            lng: h.lng,
          })),
        );
      } else {
        const res = await fetch(
          `/api/area/pharmacies?sidoCd=${sidoCd}&keyword=${encodeURIComponent(placeSearchQuery)}&numOfRows=50`,
        );
        const data = await res.json();
        setPlaceSearchResults(
          (data.pharmacies || []).map((p: any) => ({
            id: p.id || String(Math.random()),
            name: p.name,
            address: p.address,
            phone: p.phone,
            clCdNm: "약국",
            distance: "",
            distanceNum: 0,
            lat: p.lat,
            lng: p.lng,
          })),
        );
      }
    } catch {
      setPlaceSearchResults([]);
    } finally {
      setPlaceSearchLoading(false);
    }
  };

  const tabStyle = (mode: SearchMode) =>
    searchMode === mode
      ? { borderColor: "#f59e0b", backgroundColor: "#fffbeb", color: "#b45309" }
      : { borderColor: "transparent", color: "#9ca3af" };
  // ==========================================
  // 사진 업로드 처리 (AI 분석)
  // ==========================================
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    setIsProcessing(true);
    toast.info("이미지 분석 중...");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/food/analyze-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.analysisId) {
        // ✅ 분석 완료 → 결과 페이지로
        toast.success("분석 완료!");
        router.push(`/food/result/${data.analysisId}`);
      } else {
        toast.error(data.error || "분석에 실패했습니다");
      }
    } catch (error) {
      console.error("이미지 분석 오류:", error);
      toast.error("이미지 분석 중 오류가 발생했습니다");
    } finally {
      setIsProcessing(false);
      // ✅ input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ==========================================
  // 바코드 스캔 처리
  // ==========================================
  const handleBarcodeUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    setIsProcessing(true);
    toast.info("바코드 인식 중...");

    try {
      // ✅ QR 코드 감지
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;

        try {
          const html5QrCode = new Html5Qrcode("qr-reader-hidden");
          const barcode = await html5QrCode.scanFile(file, false);

          // ✅ 바코드 인식 성공
          toast.success("바코드 인식 성공!");
          router.push(`/food/result/${barcode}`);
        } catch (error) {
          // ✅ 바코드 없음 → AI 분석으로 전환
          toast.error("바코드를 인식할 수 없습니다");
          console.log("AI 분석으로 전환 필요");
        } finally {
          setIsProcessing(false);
          if (barcodeInputRef.current) {
            barcodeInputRef.current.value = "";
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("바코드 스캔 오류:", error);
      toast.error("바코드 스캔 중 오류가 발생했습니다");
      setIsProcessing(false);
    }
  };
  // ==========================================
  // ✅ 드래그 앤 드롭 핸들러
  // ==========================================
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    console.log("📁 파일:", file.name);

    // 파일을 base64로 변환
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;

      try {
        console.log("🔍 바코드 감지 시작...");
        toast.info("바코드 확인 중...");

        const html5QrCode = new Html5Qrcode("qr-reader-hidden");

        // base64 → File 변환 (바코드 감지용)
        const arr = imageData.split(",");
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const imageFile = new File([u8arr], "drop.jpg", { type: mime });

        try {
          const barcode = await html5QrCode.scanFile(imageFile, false);
          console.log("✅ 바코드 발견:", barcode);
          toast.success("바코드 인식 성공!");
          router.push(`/food/result/${barcode}`);
        } catch (barcodeError) {
          console.log("❌ 바코드 없음, AI 분석 시작");
          toast.info("AI가 성분표를 분석 중...");

          try {
            // ✅ 사용자 알레르기 가져오기
            const supabase = createClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();
            let userAllergens: string[] = [];

            if (user) {
              const { data } = await supabase
                .from("user_allergies")
                .select("allergen_name")
                .eq("user_id", user.id);
              if (data) {
                userAllergens = data.map((item) => item.allergen_name);
              }
            }

            console.log("🤖 AI 분석 API 호출...");

            // ✅ base64만 추출 (data:image/jpeg;base64, 제거)
            const base64Data = imageData.includes(",")
              ? imageData.split(",")[1]
              : imageData;

            // ✅ JSON으로 전송
            const response = await fetch("/api/food/analyze-image", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                imageBase64: base64Data,
                userAllergens: userAllergens,
              }),
            });

            console.log("📥 API 응답:", response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error("❌ API 에러:", errorText);
              throw new Error(`API 에러: ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ AI 분석 완료:", data);

            if (data.success && data.foodCode) {
              sessionStorage.setItem(
                `ai_result_${data.foodCode}`,
                JSON.stringify({
                  foodCode: data.foodCode,
                  productName: data.productName,
                  manufacturer: data.manufacturer,
                  weight: data.weight,
                  allergens: data.allergens,
                  hasUserAllergen: data.hasUserAllergen,
                  matchedUserAllergens: data.matchedUserAllergens || [],
                  ingredients: data.ingredients || [],
                  rawMaterials: data.rawMaterials || "",
                  nutritionInfo: data.nutritionInfo || null,
                  dataSource: data.dataSource || "ai",
                }),
              );
              toast.success("분석 완료!");
              router.push(`/food/result/${data.foodCode}`);
            } else {
              toast.error(data.error || "분석에 실패했습니다");
            }
          } catch (aiError) {
            console.error("❌ AI 분석 오류:", aiError);
            toast.error(
              aiError instanceof Error
                ? aiError.message
                : "분석 중 오류가 발생했습니다",
            );
          }
        }
      } catch (error) {
        console.error("❌ 처리 오류:", error);
        toast.error("이미지 처리 중 오류가 발생했습니다");
      }
    };

    reader.onerror = (error) => {
      console.error("❌ 파일 읽기 오류:", error);
      toast.error("파일을 읽을 수 없습니다");
    };

    reader.readAsDataURL(file);
  };
  // ─── Render ───
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={barcodeInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleBarcodeUpload}
      />
      <div id="qr-reader-hidden" className="hidden" />
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-2xl space-y-3 px-4 py-4">
          {/* ═══ 1. 4탭 통합 검색 ═══ */}
          <Card
            className="overflow-hidden border shadow-none"
            data-tour="search-tabs"
          >
            <CardContent className="p-0">
              <div className="flex border-b overflow-x-auto">
                <button
                  onClick={() => setSearchMode("food")}
                  className="flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-2.5 text-xs font-medium transition-all sm:flex-row sm:gap-1.5 sm:px-3 sm:py-3 sm:text-sm"
                  style={tabStyle("food")}
                  data-tour="tab-food"
                >
                  <UtensilsCrossed className="h-4 w-4 flex-shrink-0" />
                  <span>식품</span>
                </button>
                <button
                  onClick={() => setSearchMode("symptom")}
                  className="flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-2.5 text-xs font-medium transition-all sm:flex-row sm:gap-1.5 sm:px-3 sm:py-3 sm:text-sm"
                  style={tabStyle("symptom")}
                  data-tour="tab-symptom"
                >
                  <Stethoscope className="h-4 w-4 flex-shrink-0" />
                  <span>증상</span>
                </button>
                <button
                  onClick={() => setSearchMode("search")}
                  className="flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-2.5 text-xs font-medium transition-all sm:flex-row sm:gap-1.5 sm:px-3 sm:py-3 sm:text-sm"
                  style={tabStyle("search")}
                  data-tour="tab-search"
                >
                  <MapPinned className="h-4 w-4 flex-shrink-0" />
                  <span>병원</span>
                </button>
                <button
                  onClick={() => setSearchMode("medicine")}
                  className="flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-2.5 text-xs font-medium transition-all sm:flex-row sm:gap-1.5 sm:px-3 sm:py-3 sm:text-sm"
                  style={tabStyle("medicine")}
                  data-tour="tab-medicine"
                >
                  <Pill className="h-4 w-4 flex-shrink-0" />
                  <span>약</span>
                </button>
              </div>

              <div className="p-4">
                {searchMode === "food" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      음식 사진이나 이름으로 알레르기를 확인하세요
                    </p>

                    {/* ✅ 드래그 앤 드롭 영역 (별도) */}
                    <Card
                      className={`group transition-all ${
                        isDragging
                          ? "border-4 border-primary bg-primary/10 scale-[1.02]"
                          : "border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* 아이콘 */}
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                              isDragging
                                ? "bg-primary/30 scale-110"
                                : "bg-primary/10"
                            } transition-all`}
                          >
                            {isDragging ? (
                              <Upload className="h-6 w-6 text-primary animate-bounce" />
                            ) : (
                              <Camera className="h-6 w-6 text-primary" />
                            )}
                          </div>

                          {/* 텍스트 */}
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {isDragging
                                ? "이미지를 놓으세요!"
                                : "사진으로 빠르게 확인"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isDragging
                                ? "바코드 또는 성분표 이미지"
                                : "이미지를 드래그하거나 버튼을 눌러 업로드"}
                            </p>
                          </div>

                          {/* 버튼 */}
                          {!isDragging && (
                            <Button
                              onClick={() => setShowUploadSheet(true)}
                              size="sm"
                            >
                              <Camera className="mr-2 h-4 w-4" />
                              업로드
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* ✅ 검색창 (별도) */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="음식 이름 (예: 새우튀김, 땅콩버터)"
                          value={foodInput}
                          onChange={(e) => setFoodInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleFoodSearch()
                          }
                          className="h-10 pl-10"
                        />
                      </div>
                      <Button onClick={handleFoodSearch}>검색</Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      내 알레르기 정보를 기반으로 안전 여부를 AI가 분석해드려요
                    </p>

                    {/* 최근 확인 */}
                    {user && recentChecks.length > 0 && (
                      <div className="border-t pt-3 -mx-4 px-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            최근 확인
                          </p>
                          <button
                            onClick={() => router.push("/food/history")}
                            className="text-xs text-muted-foreground hover:text-primary"
                          >
                            전체보기 →
                          </button>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {recentChecks.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs shrink-0 text-muted-foreground"
                            >
                              {item.isSafe ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="max-w-[100px] truncate">
                                {item.foodName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ✅ 숨겨진 QR reader (맨 아래) */}
                <div id="qr-reader-hidden" className="hidden" />

                {/* ✅ 업로드 시트 (중복 제거) */}
                <UploadSheet
                  open={showUploadSheet}
                  onOpenChange={setShowUploadSheet}
                />

                {searchMode === "symptom" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      증상을 입력하면 AI가 적합한 진료과를 추천해드려요
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="증상 입력 (예: 목이 아프고 열이 나요)"
                          value={symptomInput}
                          onChange={(e) => setSymptomInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSymptomSearch()
                          }
                          className="h-10 pl-10"
                        />
                      </div>
                      <Button onClick={handleSymptomSearch}>분석</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ※ AI 분석 결과는 참고용이며, 정확한 진단은 의료진과
                      상담하세요
                    </p>
                  </div>
                )}
                {searchMode === "search" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      현재 위치 기반으로 가까운 병원/약국을 찾아드려요
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border overflow-hidden flex-1">
                        <button
                          onClick={() => {
                            setPlaceType("hospital");
                            setPlacePage(1);
                            setPlaceSearchQuery("");
                            setSelectedPlaceId(null);
                          }}
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${placeType === "hospital" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          병원
                        </button>
                        <button
                          onClick={() => {
                            setPlaceType("pharmacy");
                            setPlacePage(1);
                            setPlaceSearchQuery("");
                            setSelectedPlaceId(null);
                          }}
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${placeType === "pharmacy" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          약국
                        </button>
                      </div>
                      <select
                        value={radiusKm}
                        onChange={(e) => {
                          setRadiusKm(Number(e.target.value));
                          setPlacePage(1);
                        }}
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        {[1, 3, 5, 10].map((km) => (
                          <option key={km} value={km}>
                            반경 {km}km
                          </option>
                        ))}
                      </select>
                    </div>
                    {locationStatus === "granted" && (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder={`${placeType === "hospital" ? "병원" : "약국"} 이름 검색`}
                            value={placeSearchQuery}
                            onChange={(e) => {
                              if (!e.target.value.trim()) {
                                setPlaceSearched(false);
                                setPlaceSearchResults([]);
                              }
                              setPlaceSearchQuery(e.target.value);
                            }}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handlePlaceSearch()
                            }
                            className="h-9 pl-10 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handlePlaceSearch}
                          disabled={placeSearchLoading}
                        >
                          {placeSearchLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "검색"
                          )}
                        </Button>
                      </div>
                    )}
                    {locationStatus === "loading" && (
                      <div className="flex items-center justify-center py-6 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          위치 정보를 가져오는 중...
                        </span>
                      </div>
                    )}
                    {locationStatus === "denied" && (
                      <div className="text-center py-6">
                        <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                          위치 접근 권한이 필요합니다
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => router.push("/search")}
                        >
                          직접 검색하기
                        </Button>
                      </div>
                    )}
                    {locationStatus === "granted" &&
                      (() => {
                        const displayPlaces = placeSearched
                          ? placeSearchResults
                          : nearbyPlaces;
                        const isSearchMode = placeSearched;
                        const totalPages = Math.ceil(
                          displayPlaces.length / PLACES_PER_PAGE,
                        );
                        const paged = displayPlaces.slice(
                          (placePage - 1) * PLACES_PER_PAGE,
                          placePage * PLACES_PER_PAGE,
                        );
                        const loading = isSearchMode
                          ? placeSearchLoading
                          : placeLoading;
                        return (
                          <div>
                            {loading ? (
                              <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                  <Skeleton
                                    key={i}
                                    className="h-16 w-full rounded-lg"
                                  />
                                ))}
                              </div>
                            ) : displayPlaces.length > 0 ? (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {isSearchMode
                                    ? `"${placeSearchQuery}" 검색 결과 ${displayPlaces.length}개`
                                    : `내 주변 ${displayPlaces.length}개`}
                                  {totalPages > 1 &&
                                    ` · ${placePage}/${totalPages} 페이지`}
                                </p>
                                {paged.map((place) => {
                                  const isSelected =
                                    selectedPlaceId === place.id;
                                  return (
                                    <div
                                      key={place.id}
                                      className="border rounded-lg overflow-hidden"
                                    >
                                      <button
                                        onClick={() =>
                                          setSelectedPlaceId(
                                            isSelected ? null : place.id,
                                          )
                                        }
                                        className={`flex w-full items-start justify-between p-3 text-left transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"}`}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm truncate">
                                              {place.name}
                                            </p>
                                            {place.distance && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px] flex-shrink-0"
                                              >
                                                {place.distance}
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {place.address}
                                          </p>
                                          {place.clCdNm && (
                                            <Badge
                                              variant="outline"
                                              className="mt-1 text-[10px]"
                                            >
                                              {place.clCdNm}
                                            </Badge>
                                          )}
                                        </div>
                                        <ChevronDown
                                          className={`h-4 w-4 mt-1 transition-transform text-muted-foreground flex-shrink-0 ${isSelected ? "rotate-180" : ""}`}
                                        />
                                      </button>
                                      {isSelected && (
                                        <div className="border-t">
                                          <div
                                            style={{
                                              height: "208px",
                                              minHeight: "208px",
                                            }}
                                            className="bg-muted relative"
                                          >
                                            {place.lat > 0 && place.lng > 0 ? (
                                              <MiniNaverMap
                                                lat={place.lat}
                                                lng={place.lng}
                                                name={place.name}
                                                userLocation={userLocation}
                                              />
                                            ) : (
                                              <iframe
                                                src={`https://map.naver.com/v5/search/${encodeURIComponent(place.name + " " + place.address)}?c=15,0,0,0,dh`}
                                                className="h-full w-full border-0"
                                                loading="lazy"
                                                title={`${place.name} 지도`}
                                              />
                                            )}
                                          </div>
                                          <div className="px-3 py-3 space-y-2 bg-muted/20">
                                            <div className="flex items-start gap-2">
                                              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                                              <p className="text-xs">
                                                {place.address}
                                              </p>
                                            </div>
                                            {place.phone && (
                                              <div className="flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                <a
                                                  href={`tel:${place.phone}`}
                                                  className="text-xs text-primary hover:underline"
                                                >
                                                  {place.phone}
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center border-t px-2 py-2 gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="flex-1 gap-1.5 text-xs h-8"
                                              asChild
                                            >
                                              {place.phone ? (
                                                <a href={`tel:${place.phone}`}>
                                                  <Phone className="h-3 w-3" />
                                                  전화
                                                </a>
                                              ) : (
                                                <span className="text-muted-foreground">
                                                  전화번호 없음
                                                </span>
                                              )}
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="flex-1 gap-1.5 text-xs h-8"
                                              asChild
                                            >
                                              <a
                                                href={
                                                  place.lat > 0
                                                    ? `https://map.naver.com/v5/directions/-/${place.lng},${place.lat},${encodeURIComponent(place.name)}/-/transit?c=${place.lng},${place.lat},15,0,0,0,dh`
                                                    : `https://map.naver.com/v5/search/${encodeURIComponent(place.name + " " + place.address)}`
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                <MapPin className="h-3 w-3" />
                                                길찾기
                                              </a>
                                            </Button>
                                            <BookmarkButton
                                              type={
                                                placeType === "pharmacy"
                                                  ? "pharmacy"
                                                  : "hospital"
                                              }
                                              id={place.id}
                                              name={place.name}
                                              address={place.address}
                                              phone={place.phone}
                                              category={place.clCdNm}
                                              lat={place.lat}
                                              lng={place.lng}
                                            />
                                          </div>
                                          <a
                                            href={`https://map.naver.com/v5/search/${encodeURIComponent(place.name + " " + place.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 border-t px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                                          >
                                            네이버 지도에서 상세보기
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {totalPages > 1 && (
                                  <div className="flex items-center justify-center gap-1 pt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      disabled={placePage <= 1}
                                      onClick={() => {
                                        setPlacePage((p) => p - 1);
                                        setSelectedPlaceId(null);
                                      }}
                                    >
                                      ‹
                                    </Button>
                                    {Array.from(
                                      { length: Math.min(totalPages, 5) },
                                      (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) pageNum = i + 1;
                                        else if (placePage <= 3)
                                          pageNum = i + 1;
                                        else if (placePage >= totalPages - 2)
                                          pageNum = totalPages - 4 + i;
                                        else pageNum = placePage - 2 + i;
                                        return (
                                          <Button
                                            key={pageNum}
                                            variant={
                                              placePage === pageNum
                                                ? "default"
                                                : "outline"
                                            }
                                            size="sm"
                                            className="h-8 w-8 p-0 text-xs"
                                            onClick={() => {
                                              setPlacePage(pageNum);
                                              setSelectedPlaceId(null);
                                            }}
                                          >
                                            {pageNum}
                                          </Button>
                                        );
                                      },
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      disabled={placePage >= totalPages}
                                      onClick={() => {
                                        setPlacePage((p) => p + 1);
                                        setSelectedPlaceId(null);
                                      }}
                                    >
                                      ›
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">
                                  {isSearchMode
                                    ? `"${placeSearchQuery}" 검색 결과가 없습니다`
                                    : `반경 ${radiusKm}km 이내에 ${placeType === "hospital" ? "병원" : "약국"}이 없습니다`}
                                </p>
                                {isSearchMode ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => {
                                      setPlaceSearchQuery("");
                                      setPlaceSearched(false);
                                      setPlaceSearchResults([]);
                                    }}
                                  >
                                    검색 초기화
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() =>
                                      setRadiusKm(Math.min(radiusKm + 2, 10))
                                    }
                                  >
                                    범위 넓히기
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                )}
                {searchMode === "medicine" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      약 이름으로 복용법, 주의사항, 부작용을 확인하세요
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="약 이름 (예: 타이레놀, 아스피린)"
                          value={medicineQuery}
                          onChange={(e) => setMedicineQuery(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleMedicineSearch()
                          }
                          className="h-10 pl-10"
                        />
                      </div>
                      <Button
                        onClick={handleMedicineSearch}
                        disabled={medicineLoading}
                      >
                        {medicineLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "검색"
                        )}
                      </Button>
                    </div>
                    {medicineSearched &&
                      (medicineResults.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {medicineTotalCount}개 결과
                          </p>
                          {medicineResults.map((med) => (
                            <button
                              key={med.id}
                              onClick={() =>
                                router.push(
                                  `/medicine?q=${encodeURIComponent(med.name)}`,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                            >
                              <Pill className="h-5 w-5 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {med.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {med.company}
                                </p>
                              </div>
                            </button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() =>
                              router.push(
                                `/medicine?q=${encodeURIComponent(medicineQuery)}`,
                              )
                            }
                          >
                            전체 결과 보기{" "}
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          검색 결과가 없습니다
                        </p>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ═══ 2. 급식 알레르기 ═══ */}
          <div data-tour="meal-section">
            {mealStatus === "loaded" && allSchoolMeals.length > 0 && (
              <div className="flex items-center justify-between pt-1 mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  🍱 오늘의 급식
                </p>
                <button
                  onClick={() => router.push("/school")}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  학교 수정 →
                </button>
              </div>
            )}
            {mealStatus === "loaded" &&
              allSchoolMeals.map((entry, si) => {
                const hasMeals = entry.meals.length > 0;
                const allMenuItems = entry.meals.flatMap((m) => m.menu);
                const dangerItems = allMenuItems.filter(
                  (m) => m.status === "danger",
                );
                const hasDanger = dangerItems.length > 0;
                if (!hasMeals) {
                  return (
                    <Card
                      key={si}
                      className="border shadow-none cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70"
                      onClick={() =>
                        router.push(
                          `/school/${entry.school.office_code}-${entry.school.school_code}`,
                        )
                      }
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                            <MealIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {entry.school.school_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              오늘은 급식 정보가 없습니다 (방학/휴일)
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <SchoolMealCard
                    key={si}
                    entry={entry}
                    hasDanger={hasDanger}
                    dangerItems={dangerItems}
                    onNavigate={() =>
                      router.push(
                        `/school/${entry.school.office_code}-${entry.school.school_code}`,
                      )
                    }
                  />
                );
              })}

            {/* CTA 카드들 */}
            {!user && (
              <Card
                className="border shadow-none bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70"
                onClick={() => setLoginModalOpen(true)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        로그인하고 알레르기 정보 등록하기
                      </p>
                      <p className="text-xs text-muted-foreground">
                        맞춤 서비스를 위해 프로필을 완성해보세요
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            )}
            {mealStatus === "no-login" && (
              <Card
                className="border shadow-none bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70"
                onClick={() => setLoginModalOpen(true)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <MealIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        로그인하고 급식 정보 확인하기
                      </p>
                      <p className="text-xs text-muted-foreground">
                        학교를 등록하면 매일 급식 알레르기를 체크해드려요
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            )}
            {mealStatus === "no-school" && (
              <Card
                className="border shadow-none bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70"
                onClick={() => router.push("/school")}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        학교 등록하고 급식 알레르기 확인하기
                      </p>
                      <p className="text-xs text-muted-foreground">
                        학교를 등록하면 매일 급식 알레르기를 자동 체크해드려요
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            )}
          </div>

          {/* ═══ 3. 커뮤니티 ═══ */}
          <div className="pt-1 space-y-4">
            <div>
              <div className="mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  💬 내 학교 최신글
                </p>
              </div>
              {communityLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : communityPosts.length === 0 ? (
                <Card
                  className="border shadow-none border-dashed cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => router.push("/community")}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <MessageCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          커뮤니티에 첫 글을 작성해보세요
                        </p>
                        <p className="text-xs text-muted-foreground">
                          학교를 등록하면 커뮤니티에 참여할 수 있어요
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border shadow-none overflow-hidden">
                  <CardContent className="p-0">
                    {user && (
                      <button
                        onClick={() => router.push("/community/write")}
                        className="flex w-full items-center justify-center gap-1.5 border-b py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                      >
                        <PenLine className="h-3 w-3" /> 글쓰기
                      </button>
                    )}
                    {communityPosts.map((post, i) => (
                      <div
                        key={post.id}
                        onClick={() => router.push(`/community/${post.id}`)}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70 ${i > 0 ? "border-t" : ""}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {post.schoolName}
                          </span>
                          <p className="text-sm truncate">{post.title}</p>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground shrink-0 ml-3">
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-3 w-3" />
                            {post.like_count}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageCircle className="h-3 w-3" />
                            {post.comment_count}
                          </span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => router.push("/community")}
                      className="flex w-full items-center justify-center border-t py-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                    >
                      더보기
                    </button>
                  </CardContent>
                </Card>
              )}
            </div>
            {!communityLoading &&
              (popularLikes.length > 0 || popularViews.length > 0) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    🔥 인기 게시글
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="border shadow-none overflow-hidden">
                      <CardContent className="p-0">
                        <div className="px-3 py-2 bg-muted/30 text-[11px] font-semibold text-muted-foreground">
                          ❤️ 좋아요 TOP
                        </div>
                        {popularLikes.slice(0, 5).map((post, i) => (
                          <div
                            key={post.id}
                            onClick={() => router.push(`/community/${post.id}`)}
                            className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50 ${i > 0 ? "border-t" : ""}`}
                          >
                            <span className="shrink-0 text-[11px] font-bold text-primary/60 w-3">
                              {i + 1}
                            </span>
                            <p className="text-xs truncate flex-1">
                              {post.title}
                            </p>
                            <span className="flex items-center gap-0.5 text-[10px] text-red-400 shrink-0">
                              <Heart className="h-2.5 w-2.5 fill-red-400" />
                              {post.like_count}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card className="border shadow-none overflow-hidden">
                      <CardContent className="p-0">
                        <div className="px-3 py-2 bg-muted/30 text-[11px] font-semibold text-muted-foreground">
                          👀 조회수 TOP
                        </div>
                        {popularViews.slice(0, 5).map((post, i) => (
                          <div
                            key={`v-${post.id}`}
                            onClick={() => router.push(`/community/${post.id}`)}
                            className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50 ${i > 0 ? "border-t" : ""}`}
                          >
                            <span className="shrink-0 text-[11px] font-bold text-primary/60 w-3">
                              {i + 1}
                            </span>
                            <p className="text-xs truncate flex-1">
                              {post.title}
                            </p>
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                              <Eye className="h-2.5 w-2.5" />
                              {post.view_count}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
          </div>
        </div>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>

      {/* ★ data-tour 속성 추가 */}
      <div data-tour="bottom-nav">
        <MobileNav />
      </div>

      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={() => router.refresh()}
      />

      {/* ★ 투어 가이드 */}
      <OnboardingTour active={tourActive} onFinish={handleTourFinish} />
    </div>
  );
}
