"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Camera,
  Lock,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  CalendarDays,
  AlertTriangle,
  Heart,
  MessageCircle,
  Eye,
  Upload,
  ChevronDown,
  Info,
  UtensilsCrossed as MealIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginModal } from "@/components/auth/login-modal";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { UploadSheet } from "@/components/food/upload-sheet";
import { resizeImageForAI } from "@/lib/utils/image-resize";
import { saveAiResult } from "@/lib/utils/ai-result-storage";
import { LoginPromptSheet } from "@/components/auth/login-prompt-sheet";
// ─── 드롭다운 전용 미니맵 ───
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
    const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "";

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
      const dateStr = `${year}${String(month).padStart(2, "0")}01`;
      const res = await fetch(
        `/api/school/meals?schoolCode=${entry.school.school_code}&officeCode=${entry.school.office_code}&date=${dateStr}&mode=month`,
      );
      const data = await res.json();
      setMonthlyData(data.month || []);
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
export default function FoodTab({
  onProgress,
}: {
  onProgress?: (progress: number, label: string) => void;
}) {
  const router = useRouter();
  const [foodInput, setFoodInput] = useState("");
  const [user, setUser] = useState<SupabaseUser | null | undefined>(undefined);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

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

  const [loginPrompt, setLoginPrompt] = useState<{
    open: boolean;
    reason: "scan_limit" | "scan_warning" | "feature";
    remainingScans?: number;
  }>({ open: false, reason: "scan_warning" });
  const [hasAllergies, setHasAllergies] = useState<boolean | null>(null);
  // ─── 마운트 시 진행률 알림 ───
  useEffect(() => {
    onProgress?.(35, "화면 구성 중...");
  }, []);

  // ─── Effects ───
  useEffect(() => {
    const supabase = createClient();
    onProgress?.(20, "로그인 확인 중...");
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      onProgress?.(30, "사용자 확인 완료");
    });
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

  // ─── 알레르기 등록 여부 확인 ───
  useEffect(() => {
    if (!user) {
      setHasAllergies(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("user_allergies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setHasAllergies((count ?? 0) > 0));
  }, [user]);

  // ─── 급식/커뮤니티 로드 ───
  useEffect(() => {
    // loadMealData는 user를 클로저로 캡처하며, user가 deps에 있어 실제 stale 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadMealData();
  }, [user]);
  useEffect(() => {
    // 마운트 시 1회만 실행 의도적 패턴
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadCommunityPosts();
  }, []);

  const loadCommunityPosts = async () => {
    setCommunityLoading(true);
    onProgress?.(75, "커뮤니티 불러오는 중...");
    try {
      // 로그인된 경우에만 학교 커뮤니티 로드
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
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
      }

      onProgress?.(85, "인기 게시글 불러오는 중...");
      const popRes = await fetch("/api/community?mode=popular");
      const popData = await popRes.json();
      setPopularLikes(popData.topLikes || []);
      setPopularViews(popData.topViews || []);
    } catch {
      /* 무시 */
    } finally {
      setCommunityLoading(false);
      onProgress?.(100, "완료!");
    }
  };

  const loadMealData = async () => {
    if (user === undefined) return;
    if (!user) {
      setMealStatus("no-login");
      onProgress?.(50, "급식 확인 건너뜀");
      return;
    }
    setMealLoading(true);
    onProgress?.(45, "급식 정보 불러오는 중...");
    try {
      const res = await fetch("/api/school/register");
      if (!res.ok) {
        setMealStatus("no-school");
        setMealLoading(false);
        onProgress?.(55, "학교 정보 없음");
        return;
      }
      const data = await res.json();
      const schools: MySchool[] = data.schools || [];
      setMySchools(schools);
      if (schools.length === 0) {
        setMealStatus("no-school");
        setMealLoading(false);
        onProgress?.(55, "등록된 학교 없음");
        return;
      }
      onProgress?.(55, "급식 메뉴 분석 중...");
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
      onProgress?.(65, "급식 정보 완료");
    } catch (e) {
      console.error("급식 로드 실패:", e);
      setMealStatus("no-school");
      onProgress?.(55, "급식 로드 실패");
    } finally {
      setMealLoading(false);
    }
  };

  // ─── Handlers ───
  const handleFoodSearch = () => {
    if (foodInput.trim())
      router.push(`/food/search?q=${encodeURIComponent(foodInput.trim())}`);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    // ✅ 이미지 크기 사전 검증
    const MAX_IMAGE_SIZE = 7 * 1024 * 1024; // 7MB
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(
        "이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessing(true);
    toast.info("이미지 분석 중...");

    try {
      // ✅ 리사이즈 먼저
      const { base64: base64Data, wasResized } = await resizeImageForAI(file);
      if (wasResized) console.log("[FoodTab] 이미지 리사이즈 완료");

      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      let userAllergens: string[] = [];

      if (currentUser) {
        const { data } = await supabase
          .from("user_allergies")
          .select("allergen_name")
          .eq("user_id", currentUser.id);
        if (data) userAllergens = data.map((item) => item.allergen_name);
        if (userAllergens.length === 0) {
          toast.info("알레르기를 등록하면 맞춤 분석 결과를 알려드려요!", {
            action: {
              label: "등록하기",
              onClick: () => router.push("/food/profile"),
            },
            duration: 5000,
          });
        }
      }

      const response = await fetch("/api/food/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Data, userAllergens }),
      });

      // ── 413 이미지 크기 초과 ──
      if (response.status === 413) {
        toast.error(
          "이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.",
        );
        return;
      }

      // ── 스캔 제한 초과 ──
      if (response.status === 429) {
        setLoginPrompt({ open: true, reason: "scan_limit" });
        return;
      }

      // ── 남은 스캔 경고 (비로그인 && 2회 이하) ──
      const remaining = response.headers.get("X-Remaining-Scans");
      if (remaining !== null) {
        const remainingNum = parseInt(remaining);
        if (remainingNum <= 2 && remainingNum > 0) {
          setLoginPrompt({
            open: true,
            reason: "scan_warning",
            remainingScans: remainingNum,
          });
        }
      }

      const data = await response.json();

      if (data.success && data.foodCode) {
        saveAiResult(data.foodCode, {
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
        });
        toast.success("분석 완료!");
        router.push(`/food/result/${data.foodCode}`);
      } else {
        toast.error(data.error || "분석에 실패했습니다");
      }
    } catch (error) {
      console.error("이미지 분석 오류:", error);
      toast.error("이미지 분석 중 오류가 발생했습니다");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;

        try {
          const html5QrCode = new Html5Qrcode("qr-reader-hidden");
          const barcode = await html5QrCode.scanFile(file, false);

          toast.success("바코드 인식 성공!");
          router.push(`/food/result/${barcode}`);
        } catch (error) {
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

    // ✅ 이미지 크기 사전 검증
    const MAX_IMAGE_SIZE = 7 * 1024 * 1024; // 7MB
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(
        "이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.",
      );
      return;
    }

    console.log("📁 파일:", file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;

      try {
        console.log("🔍 바코드 감지 시작...");
        toast.info("바코드 확인 중...");

        const html5QrCode = new Html5Qrcode("qr-reader-hidden");

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
            // ✅ 원본 File에서 직접 리사이즈 (drop된 file 변수 사용)
            const { base64: base64Data } = await resizeImageForAI(file);

            const supabase = createClient();
            const {
              data: { user: currentUser },
            } = await supabase.auth.getUser();
            let userAllergens: string[] = [];

            if (currentUser) {
              const { data } = await supabase
                .from("user_allergies")
                .select("allergen_name")
                .eq("user_id", currentUser.id);
              if (data) userAllergens = data.map((item) => item.allergen_name);
              if (userAllergens.length === 0) {
                toast.info("알레르기를 등록하면 맞춤 분석 결과를 알려드려요!", {
                  action: {
                    label: "등록하기",
                    onClick: () => router.push("/food/profile"),
                  },
                  duration: 5000,
                });
              }
            }

            const response = await fetch("/api/food/analyze-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageBase64: base64Data, userAllergens }),
            });

            // ✅ 413 이미지 크기 초과 처리
            if (response.status === 413) {
              toast.error(
                "이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.",
              );
              return;
            }

            const data = await response.json();

            if (data.success && data.foodCode) {
              saveAiResult(data.foodCode, {
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
              });
              toast.success("분석 완료!");
              router.push(`/food/result/${data.foodCode}`);
            } else {
              toast.error(data.error || "분석에 실패했습니다");
            }
          } catch (aiError) {
            console.error("❌ AI 분석 오류:", aiError);
            toast.error("분석 중 오류가 발생했습니다");
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

  // ─── 학교 등록 여부 판단 (커뮤니티 섹션용) ───
  const hasSchool = mySchools.length > 0;

  // ─── Render ───
  return (
    <div className="w-full">
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

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {/* ═══ 1. 식품 안전 확인 ═══ */}
        {hasAllergies === false ? (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Info className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    알레르기를 등록하시면 자동으로 위험 성분을 확인해드립니다
                  </p>
                  <Link href="/food/profile">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-blue-600"
                    >
                      알레르기 등록하러 가기 →
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              음식 사진이나 이름으로 알레르기를 확인하세요
            </p>

            {/* 드래그 앤 드롭 영역 */}
            <Card
              role="button"
              tabIndex={0}
              aria-label="식품 이미지를 드래그하거나 클릭하여 알레르기 성분 확인"
              className={`group transition-all cursor-pointer ${
                isDragging
                  ? "border-4 border-primary bg-primary/10 scale-[1.02]"
                  : "border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              }`}
              onClick={() => !isDragging && setShowUploadSheet(true)}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isDragging) { e.preventDefault(); setShowUploadSheet(true); } }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      isDragging ? "bg-primary/30 scale-110" : "bg-primary/10"
                    } transition-all`}
                  >
                    {isDragging ? (
                      <Upload className="h-6 w-6 text-primary animate-bounce" />
                    ) : (
                      <Camera className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {isDragging ? "이미지를 놓으세요!" : "사진으로 빠르게 확인"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isDragging
                        ? "바코드 또는 성분표 이미지"
                        : "이미지를 드래그하거나 버튼을 눌러 업로드"}
                    </p>
                  </div>
                  {!isDragging && (
                    <Button
                      onClick={(e) => { e.stopPropagation(); setShowUploadSheet(true); }}
                      size="sm"
                      className="cursor-pointer"
                      aria-label="식품 이미지 업로드하여 알레르기 확인"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      업로드
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 검색창 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="음식 이름 (예: 새우튀김, 땅콩버터)"
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFoodSearch()}
                  className="h-10 pl-10"
                />
              </div>
              <Button onClick={handleFoodSearch}>검색</Button>
            </div>

            <p className="text-xs text-muted-foreground">
              내 알레르기 정보를 기반으로 안전 여부를 AI가 분석해드려요
            </p>
          </div>
        )}

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
            <div className="flex items-center justify-between pt-1 mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                💬 내 학교 최신글
              </p>
              {user && (
                <button
                  onClick={() => router.push("/community/write")}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  글쓰기 →
                </button>
              )}
            </div>
            {communityLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : communityPosts.length === 0 ? (
              /* ── 학교 미등록: 학교 등록 유도 / 학교 등록됨: 첫 글 작성 유도 ── */
              !hasSchool ? (
                <Card
                  className="border shadow-none border-dashed border-orange-300 cursor-pointer transition-colors hover:bg-orange-50/50"
                  onClick={() => router.push("/school")}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                        <GraduationCap className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          학교를 등록해보세요
                        </p>
                        <p className="text-xs text-muted-foreground">
                          학교를 등록하면 급식 체크와 커뮤니티를 이용할 수 있어요
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ) : (
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
                          같은 학교 친구들과 소통해보세요
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="border shadow-none overflow-hidden">
                <CardContent className="p-0">
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

      {/* 로그인 모달 */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={() => router.refresh()}
      />

      {/* 업로드 시트 */}
      <UploadSheet open={showUploadSheet} onOpenChange={setShowUploadSheet} />
      <LoginPromptSheet
        open={loginPrompt.open}
        onClose={() => setLoginPrompt((v) => ({ ...v, open: false }))}
        reason={loginPrompt.reason}
        remainingScans={loginPrompt.remainingScans}
      />
    </div>
  );
}
