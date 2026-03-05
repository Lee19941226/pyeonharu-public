"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  ImageIcon,
  PenLine,
  Trash2,
  X,
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Info,
  BarChart3,
  Trophy,
  Utensils,
  Flame,
  Calendar,
  Pencil,
  Sparkles,
  Download,
  Share2,
  Plus,
  School,
  Check,
  AlertTriangle,
} from "lucide-react";
import { shareToKakao } from "@/lib/utils/kakao-share";

function getTimePeriod(dateStr: string) {
  const h = new Date(dateStr).getHours();
  if (h >= 5 && h < 10)
    return { label: "아침", color: "bg-amber-100 text-amber-700" };
  if (h >= 10 && h < 15)
    return { label: "점심", color: "bg-orange-100 text-orange-700" };
  if (h >= 15 && h < 21)
    return { label: "저녁", color: "bg-blue-100 text-blue-700" };
  return { label: "야식", color: "bg-purple-100 text-purple-700" };
}

function getExercise(overCal: number) {
  return [
    { name: "걷기", emoji: "🚶", mins: Math.round(overCal / 4.5) },
    { name: "달리기", emoji: "🏃", mins: Math.round(overCal / 11) },
    { name: "계단", emoji: "🪜", mins: Math.round(overCal / 9) },
    { name: "자전거", emoji: "🚴", mins: Math.round(overCal / 7.5) },
  ];
}

function CircularProgress({
  current,
  total,
  isOver,
  size = 80,
}: {
  current: number;
  total: number;
  isOver: boolean;
  size?: number;
}) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(current / total, 2) : 0;
  const offset = circ * (1 - Math.min(pct, 1));
  const color = isOver ? "#DC2626" : "#4A7C59";
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-lg font-extrabold ${isOver ? "text-red-600" : "text-primary"}`}
        >
          {current.toLocaleString()}
        </span>
        <span className="text-[9px] text-muted-foreground">
          / {total > 0 ? total.toLocaleString() : "-"}
        </span>
      </div>
    </div>
  );
}

function BarChart({
  dailyStats,
  bmr,
  onDayClick,
}: {
  dailyStats: DailyStat[];
  bmr: number;
  onDayClick?: (date: string) => void;
}) {
  const maxCal =
    bmr > 0 ? bmr : Math.max(...dailyStats.map((d) => d.totalCal), 1);
  const todayStr = new Date().toLocaleDateString("en-CA");
  const total = dailyStats.length;
  const showLabel = (i: number) => {
    if (total <= 7) return true;
    if (total <= 14) return i % 2 === 0 || i === total - 1;
    if (total <= 31) return i === 0 || i === total - 1 || i % 5 === 0;
    return i === 0 || i === total - 1 || i % 7 === 0;
  };
  const BAR_MAX_H = 80;
  return (
    <div>
      {bmr > 0 && (
        <div className="flex items-center gap-1 mb-0.5">
          <div className="flex-1 border-t border-dashed border-red-300" />
          <span className="text-[8px] text-red-400">
            BMR {bmr.toLocaleString()}
          </span>
        </div>
      )}
      <div
        className="flex items-end gap-[2px]"
        style={{ height: BAR_MAX_H + 16 }}
      >
        {dailyStats.map((d) => {
          const ratio = maxCal > 0 ? Math.min(d.totalCal / maxCal, 1.3) : 0;
          const barH =
            d.totalCal > 0 ? Math.max(Math.round(ratio * BAR_MAX_H), 3) : 1;
          const isOver = bmr > 0 && d.totalCal > bmr;
          const dayDate = new Date(d.date + "T12:00:00");
          const isTd = d.date === todayStr;
          return (
            <div
              key={d.date}
              className={`flex-1 flex flex-col items-center justify-end gap-0 group relative ${onDayClick ? "cursor-pointer" : ""}`}
              onClick={() => onDayClick?.(d.date)}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[8px] px-1 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                {d.totalCal > 0 ? `${d.totalCal.toLocaleString()}` : "-"}
              </div>
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${isOver ? "bg-red-400" : d.totalCal > 0 ? "bg-primary/70" : "bg-muted/40"} hover:opacity-80`}
                style={{ height: `${barH}px` }}
              />
              {showLabel(dailyStats.indexOf(d)) && (
                <span
                  className={`text-[7px] leading-none mt-0.5 ${isTd ? "font-bold text-primary" : "text-muted-foreground/60"}`}
                >
                  {dayDate.getDate()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


interface DietEntry {
  id: string;
  food_name: string;
  estimated_cal: number;
  source: "ai" | "manual";
  emoji: string;
  ai_confidence: number | null;
  image_url: string | null;
  recorded_at: string;
}

interface UserSchool {
  id: string;
  school_code: string;
  office_code: string;
  school_name: string;
  school_address: string | null;
  is_primary: boolean;
  family_member_id: string | null;
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  avatar_emoji: string;
}

interface SchoolOwner {
  emoji: string;
  name: string;
  relation: string;
  memberId: string | null;
}

interface MemberSchoolGroup {
  memberId: string;
  memberName: string;
  memberEmoji: string;
  memberRelation: string;
  schools: UserSchool[];
}

interface SchoolListData {
  ownSchools: UserSchool[];
  memberSchools: MemberSchoolGroup[];
}

type MealCheckedMember =
  | { type: "self" }
  | { type: "member"; memberId: string; name: string; relation: string; avatarEmoji: string }
  | { type: "unknown" };

interface MealMenuItem {
  name: string;
  allergenNumbers: string[];
  allergenNames: string[];
  status?: "safe" | "danger" | "caution" | "unknown";
  matchedAllergens?: string[];
  crossAllergens?: string[];
}

interface MealData {
  mealType: string;
  mealTypeName: string;
  menu: MealMenuItem[];
  calInfo: string;
  ntrInfo: string;
  originInfo: string;
}
interface DailyStat {
  date: string;
  totalCal: number;
  count: number;
  isOver: boolean;
  overAmount: number;
}
interface ReportSummary {
  totalCalSum: number;
  avgCal: number;
  daysWithData: number;
  totalDays: number;
  overDays: number;
  maxDay: { date: string; totalCal: number } | null;
  minDay: { date: string; totalCal: number } | null;
  topFoods: { name: string; count: number }[];
}
type RangePreset = "7d" | "14d" | "30d" | "custom";

export default function DietTab() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const entriesCacheRef = useRef<Map<string, { entries: DietEntry[]; totalCal: number; bmr: number; isOver: boolean; overAmount: number }>>(new Map());

  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [totalCal, setTotalCal] = useState(0);
  const [bmr, setBmr] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );

  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [dashData, setDashData] = useState<{
    stats: DailyStat[];
    summary: ReportSummary;
  } | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCal, setManualCal] = useState("");
  const [manualGrams, setManualGrams] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [servingDesc, setServingDesc] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [warningShownToday, setWarningShownToday] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCal, setEditingCal] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const [manualImage, setManualImage] = useState<File | null>(null);
  const [manualImagePreview, setManualImagePreview] = useState<string | null>(
    null,
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const manualImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  // ✅ 새로 추가
  const [showRecordSheet, setShowRecordSheet] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isSharingToday, setIsSharingToday] = useState(false);
  const [isSharingReport, setIsSharingReport] = useState(false);

  // ✅ 학교 급식 자동 입력 상태
  const [showSchoolSelect, setShowSchoolSelect] = useState(false);
  const [showMealSelect, setShowMealSelect] = useState(false);
  const [schoolListData, setSchoolListData] = useState<SchoolListData>({ ownSchools: [], memberSchools: [] });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<UserSchool | null>(null);
  const [selectedSchoolOwner, setSelectedSchoolOwner] = useState<SchoolOwner | null>(null);
  const [schoolMeals, setSchoolMeals] = useState<MealData[]>([]);
  const [mealCheckedMember, setMealCheckedMember] = useState<MealCheckedMember>({ type: "unknown" });
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [selectedMealItems, setSelectedMealItems] = useState<Set<string>>(new Set());
  const [isAddingMeals, setIsAddingMeals] = useState(false);


  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (!user) setIsLoading(false);
    });
  }, []);

  const loadEntries = useCallback(async () => {
    if (!user) return;

    // 캐시 히트: API 호출 스킵
    const cached = entriesCacheRef.current.get(date);
    if (cached) {
      setEntries(cached.entries);
      setTotalCal(cached.totalCal);
      setBmr(cached.bmr);
      if (cached.isOver && !warningShownToday) {
        const key = `diet_warning_${date}`;
        if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
          setShowWarning(true);
          sessionStorage.setItem(key, "1");
          setWarningShownToday(true);
        }
      }
      return;
    }

    // 캐시 미스: fetch
    setIsLoading(true);
    try {
      const res = await fetch(`/api/diet/entries?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries);
        setTotalCal(data.totalCal);
        setBmr(data.bmr);
        // 캐시 저장
        entriesCacheRef.current.set(date, {
          entries: data.entries,
          totalCal: data.totalCal,
          bmr: data.bmr,
          isOver: !!data.isOver,
          overAmount: data.overAmount ?? 0,
        });
        if (data.isOver && !warningShownToday) {
          const key = `diet_warning_${date}`;
          if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
            setShowWarning(true);
            sessionStorage.setItem(key, "1");
            setWarningShownToday(true);
          }
        }
      }
    } catch {
      toast.error("데이터를 불러오지 못했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [user, date, warningShownToday]);
  useEffect(() => {
    if (user) loadEntries();
  }, [user, date, loadEntries]);

  const reloadEntries = useCallback(() => {
    entriesCacheRef.current.delete(date);
    loadEntries();
  }, [date, loadEntries]);

  const getDashRange = useCallback(() => {
    const today = new Date();
    const todayStr = today.toLocaleDateString("en-CA");
    if (rangePreset === "custom" && customStart && customEnd)
      return { start: customStart, end: customEnd };
    const days = rangePreset === "7d" ? 7 : rangePreset === "14d" ? 14 : 30;
    const s = new Date(today);
    s.setDate(s.getDate() - days + 1);
    return { start: s.toLocaleDateString("en-CA"), end: todayStr };
  }, [rangePreset, customStart, customEnd]);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setDashLoading(true);
    try {
      const { start, end } = getDashRange();
      const res = await fetch(
        `/api/diet/report?type=custom&startDate=${start}&endDate=${end}`,
      );
      const data = await res.json();
      if (data.success) {
        setDashData({ stats: data.dailyStats, summary: data.summary });
        if (data.bmr) setBmr(data.bmr);
      }
    } catch {
    } finally {
      setDashLoading(false);
    }
  }, [user, getDashRange]);
  useEffect(() => {
    if (user) loadDashboard();
  }, [user, loadDashboard]);

  // ✅ 외부에서 식단 추가 시 데이터 새로고침
  useEffect(() => {
    const handler = () => {
      if (user) {
        reloadEntries();
        loadDashboard();
      }
    };
    window.addEventListener("diet-entry-added", handler);
    return () => window.removeEventListener("diet-entry-added", handler);
  }, [user, reloadEntries, loadDashboard]);

  const handlePhotoAnalyze = async (file: File) => {
    // ✅ 이미지 크기 사전 검증
    const MAX_IMAGE_SIZE = 7 * 1024 * 1024; // 7MB
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(
        "이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.",
      );
      return;
    }

    setShowRecordSheet(false);
    setIsAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/diet/analyze", {
        method: "POST",
        body: fd,
      });
      // ✅ 413 이미지 크기 초과 처리
      if (res.status === 413) {
        toast.error(
          "이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.",
        );
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast.success(
          `${data.entry.emoji} ${data.entry.food_name} (${data.entry.estimated_cal}kcal) 추가 완료`,
        );
        reloadEntries();
        loadDashboard();
      } else toast.error(data.error || "분석 실패");
    } catch {
      toast.error("분석 중 오류");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEstimate = async () => {
    if (!manualName.trim()) {
      toast.error("음식 이름을 입력해주세요");
      return;
    }
    setIsEstimating(true);
    setServingDesc("");
    try {
      const res = await fetch("/api/diet/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name: manualName.trim(),
          grams: manualGrams || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.estimated_cal > 0) {
        setManualCal(String(data.estimated_cal));
        setServingDesc(data.serving_desc || "");
        toast.success(
          `${data.emoji || "🍽️"} ${data.estimated_cal}kcal 추정 완료`,
        );
      } else {
        toast.error(data.error || "추정에 실패했습니다");
      }
    } catch {
      toast.error("AI 추정 중 오류가 발생했습니다");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleManualImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 선택 가능합니다");
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      toast.error(
        "이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요.",
      );
      return;
    }
    setManualImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setManualImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadDietImage = async (
    file: File,
    entryId?: string,
  ): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (entryId) formData.append("entryId", entryId);
      const res = await fetch("/api/diet/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) return data.image_url;
      toast.error(data.error || "이미지 업로드 실패");
      return null;
    } catch {
      toast.error("이미지 업로드 중 오류");
      return null;
    }
  };

  const handleEditImage = async (entryId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 선택 가능합니다");
      return;
    }
    setIsUploadingImage(true);
    try {
      const imageUrl = await uploadDietImage(file, entryId);
      if (imageUrl) {
        toast.success("사진 추가 완료");
        reloadEntries();
        loadDashboard();
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDownloadImage = async (imageUrl: string, foodName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${foodName}_${new Date().toLocaleDateString("ko-KR")}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("이미지 저장 완료");
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  // ✅ 학교 목록 불러오기 (본인 + 구성원별 그룹)
  const loadUserSchools = async () => {
    setIsLoadingSchools(true);
    try {
      const res = await fetch("/api/school");
      const data = await res.json();
      if (data.ownSchools !== undefined) {
        setSchoolListData({
          ownSchools: data.ownSchools,
          memberSchools: data.memberSchools ?? [],
        });
      }
    } catch {
      toast.error("학교 목록을 불러오지 못했습니다");
    } finally {
      setIsLoadingSchools(false);
    }
  };

  // ✅ 가족 구성원 목록 불러오기 (학교 없는 구성원 표시용)
  const loadFamilyMembers = async () => {
    try {
      const res = await fetch("/api/family");
      const data = await res.json();
      if (data.success && data.members) {
        setFamilyMembers(
          data.members.map((m: any) => ({
            id: m.id,
            name: m.name,
            relation: m.relation,
            avatar_emoji: m.avatar_emoji,
          }))
        );
      }
    } catch {
      // 구성원 목록 오류는 무시 (선택적 기능)
    }
  };

  // ✅ 학교 급식 불러오기 (memberId 지원)
  const loadSchoolMeals = async (school: UserSchool, memberId: string | null) => {
    setIsLoadingMeals(true);
    setSchoolMeals([]);
    setMealCheckedMember({ type: "unknown" });
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const params = new URLSearchParams({
        schoolCode: school.school_code,
        officeCode: school.office_code,
        date: today,
      });
      if (memberId) params.set("memberId", memberId);
      const res = await fetch(`/api/school/meals?${params}`);
      const data = await res.json();
      if (data.meals && data.meals.length > 0) {
        setSchoolMeals(data.meals);
      } else {
        toast.info("오늘 급식 정보가 없습니다");
      }
      if (data.checkedMember) {
        setMealCheckedMember(data.checkedMember);
      }
    } catch {
      toast.error("급식 정보를 불러오지 못했습니다");
    } finally {
      setIsLoadingMeals(false);
    }
  };

  // ✅ 학교 선택 핸들러 (소유자 정보 포함)
  const handleSchoolSelect = async (school: UserSchool, owner: SchoolOwner) => {
    setSelectedSchool(school);
    setSelectedSchoolOwner(owner);
    setShowSchoolSelect(false);
    setShowMealSelect(true);
    await loadSchoolMeals(school, owner.memberId);
  };

  // ✅ 급식 메뉴 아이템 토글
  const toggleMealItem = (menuName: string) => {
    setSelectedMealItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuName)) {
        newSet.delete(menuName);
      } else {
        newSet.add(menuName);
      }
      return newSet;
    });
  };

  // ✅ 선택한 급식 메뉴를 식단에 추가
  const handleAddSelectedMeals = async () => {
    if (selectedMealItems.size === 0) {
      toast.error("추가할 메뉴를 선택해주세요");
      return;
    }

    setIsAddingMeals(true);
    try {
      // 선택된 메뉴들의 칼로리 계산 (급식 전체 칼로리를 메뉴 수로 나누어 추정)
      let totalMealCal = 0;
      let totalMenuCount = 0;

      for (const meal of schoolMeals) {
        const calMatch = meal.calInfo.match(/(\d+(?:\.\d+)?)/);
        if (calMatch) {
          totalMealCal += parseFloat(calMatch[1]);
        }
        totalMenuCount += meal.menu.length;
      }

      const avgCalPerItem = totalMenuCount > 0 ? Math.round(totalMealCal / totalMenuCount) : 100;

      // 선택된 각 메뉴를 식단에 추가
      const menuNames = Array.from(selectedMealItems);
      let successCount = 0;

      for (const menuName of menuNames) {
        try {
          const res = await fetch("/api/diet/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              food_name: menuName,
              estimated_cal: avgCalPerItem,
            }),
          });
          const data = await res.json();
          if (data.success) {
            successCount++;
          }
        } catch {
          // 개별 실패는 무시하고 계속 진행
        }
      }

      if (successCount > 0) {
        toast.success(`급식 ${successCount}개 메뉴 추가 완료`);
        reloadEntries();
        loadDashboard();
        closeMealSelect();
      } else {
        toast.error("메뉴 추가에 실패했습니다");
      }
    } catch {
      toast.error("급식 추가 중 오류가 발생했습니다");
    } finally {
      setIsAddingMeals(false);
    }
  };

  // ✅ 급식 모달 닫기
  const closeMealSelect = () => {
    setShowMealSelect(false);
    setSelectedSchool(null);
    setSelectedSchoolOwner(null);
    setSchoolMeals([]);
    setSelectedMealItems(new Set());
    setMealCheckedMember({ type: "unknown" });
  };

  // ✅ 학교 급식에서 선택 버튼 클릭
  const handleOpenSchoolMeal = async () => {
    setShowRecordSheet(false);
    setShowSchoolSelect(true);
    await Promise.all([loadUserSchools(), loadFamilyMembers()]);
  };

  const closeManualInput = () => {
    setShowManualInput(false);
    setManualName("");
    setManualCal("");
    setManualGrams("");
    setServingDesc("");
    setManualImage(null);
    setManualImagePreview(null);
  };

  const handleManualSubmit = async () => {
    if (!manualName.trim() || !manualCal) return;
    try {
      let imageUrl: string | null = null;
      if (manualImage) {
        setIsUploadingImage(true);
        imageUrl = await uploadDietImage(manualImage);
        setIsUploadingImage(false);
      }
      const res = await fetch("/api/diet/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name: manualName.trim(),
          estimated_cal: parseInt(manualCal),
          image_url: imageUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `${imageUrl ? "📸" : "📝"} ${manualName} (${manualCal}kcal)`,
        );
        closeManualInput();
        reloadEntries();
        loadDashboard();
      } else toast.error(data.error);
    } catch {
      toast.error("저장 실패");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 삭제?`)) return;
    try {
      const res = await fetch(`/api/diet/entries?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("삭제 완료");
        reloadEntries();
        loadDashboard();
      }
    } catch {
      toast.error("삭제 실패");
    }
  };

  const startEditCal = (entry: DietEntry) => {
    setEditingId(entry.id);
    setEditingCal(String(entry.estimated_cal));
    setTimeout(() => editInputRef.current?.focus(), 50);
  };
  const cancelEditCal = () => {
    setEditingId(null);
    setEditingCal("");
  };
  const handleEditCal = async () => {
    if (!editingId) return;
    const newCal = parseInt(editingCal);
    if (!newCal || newCal <= 0) {
      toast.error("올바른 칼로리를 입력해주세요");
      return;
    }
    const original = entries.find((e) => e.id === editingId);
    if (original && original.estimated_cal === newCal) {
      cancelEditCal();
      return;
    }
    try {
      const res = await fetch("/api/diet/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, estimated_cal: newCal }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`칼로리 ${newCal}kcal 수정 완료`);
        cancelEditCal();
        reloadEntries();
        loadDashboard();
      } else {
        toast.error(data.error || "수정 실패");
      }
    } catch {
      toast.error("수정 실패");
    }
  };

  const moveDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toLocaleDateString("en-CA"));
    setWarningShownToday(false);
  };

  // ─── 카카오 공유: 오늘 먹은 음식 ───
  const shareToday = async () => {
    setIsSharingToday(true);
    try {
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        toast.error("카카오톡 공유는 실제 도메인에서만 작동합니다", {
          description: "배포 후 테스트해주세요",
          duration: 5000,
        });
        return;
      }
      const shareUrl = `${window.location.origin}/diet`;
      const foodList =
        entries.length > 0
          ? entries
              .map((e) => `${e.emoji} ${e.food_name} (${e.estimated_cal}kcal)`)
              .slice(0, 5)
              .join(", ")
          : "아직 기록이 없어요";
      const moreText = entries.length > 5 ? ` 외 ${entries.length - 5}개 더` : "";
      const statusText = isOver
        ? `⚠️ 기초대사량 대비 ${overAmount.toLocaleString()}kcal 초과!`
        : bmr > 0
          ? `✅ 기초대사량 대비 ${(bmr - totalCal).toLocaleString()}kcal 남음`
          : `총 ${totalCal.toLocaleString()}kcal 섭취`;
      const shareResult = await shareToKakao({
        title: `🍽️ ${isToday ? "오늘" : new Date(date + "T12:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 먹은 것들`,
        description: `${foodList}${moreText} | ${statusText}`,
        imageUrl: `${window.location.origin}/api/og?name=편하루 식단관리&safe=true`,
        shareUrl,
        buttonText: "편하루에서 식단 관리하기",
      });
      if (shareResult.success) {
        toast.success("카카오톡 공유 완료");
      } else {
        toast.success("링크 복사 완료 — 카카오톡에 붙여넣기 하세요");
      }
      setShowShareMenu(false);
    } catch (err) {
      console.error("[카카오 공유 실패]", err);
      toast.error("공유에 실패했습니다. 다시 시도해주세요");
    } finally {
      setIsSharingToday(false);
    }
  };

  // ─── 카카오 공유: 식단 리포트 ───
  const shareReport = async () => {
    setIsSharingReport(true);
    try {
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        toast.error("카카오톡 공유는 실제 도메인에서만 작동합니다", {
          description: "배포 후 테스트해주세요",
          duration: 5000,
        });
        return;
      }
      const shareUrl = `${window.location.origin}/diet`;
      const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      });
      let title = `📊 ${dateLabel} 식단 리포트`;
      let description = `총 ${totalCal.toLocaleString()}kcal 섭취 · ${entries.length}끼`;
      if (bmr > 0) {
        description += isOver
          ? ` | ⚠️ BMR 대비 ${overAmount.toLocaleString()}kcal 초과`
          : ` | ✅ BMR 대비 ${(bmr - totalCal).toLocaleString()}kcal 남음`;
      }
      if (dashData?.summary) {
        const rangeLabel = getRangeLabel();
        title = `📊 식단 리포트 (${rangeLabel})`;
        description = `일 평균 ${dashData.summary.avgCal.toLocaleString()}kcal · ${dashData.summary.daysWithData}일 기록 / ${dashData.summary.totalDays}일`;
        if (bmr > 0 && dashData.summary.overDays > 0)
          description += ` · ⚠️ ${dashData.summary.overDays}일 초과`;
        if (dashData.summary.topFoods.length > 0)
          description += ` · 🍴 ${dashData.summary.topFoods
            .slice(0, 3)
            .map((f) => f.name)
            .join(", ")}`;
      }
      const shareResult = await shareToKakao({
        title,
        description,
        imageUrl: `${window.location.origin}/api/og?name=편하루 식단관리&safe=true`,
        shareUrl,
        buttonText: "편하루에서 식단 관리하기",
      });
      if (shareResult.success) {
        toast.success("카카오톡 공유 완료");
      } else {
        toast.success("링크 복사 완료 — 카카오톡에 붙여넣기 하세요");
      }
      setShowShareMenu(false);
    } catch (err) {
      console.error("[카카오 공유 실패]", err);
      toast.error("공유에 실패했습니다. 다시 시도해주세요");
    } finally {
      setIsSharingReport(false);
    }
  };

  const isToday = date === new Date().toLocaleDateString("en-CA");
  const isOver = bmr > 0 && totalCal > bmr;
  const overAmount = isOver ? totalCal - bmr : 0;
  const getRangeLabel = () => {
    const { start, end } = getDashRange();
    const s = new Date(start + "T12:00:00");
    const e = new Date(end + "T12:00:00");
    return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
  };

  if (!isLoading && !user)
    return (
      <div className="w-full">
        <div className="text-center space-y-4 px-4 py-12">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground">
            식단관리 기능은 로그인 후 이용할 수 있어요
          </p>
          <Button onClick={() => router.push("/login")}>로그인</Button>
        </div>
      </div>
    );

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-3">
        <div className="flex gap-5 justify-center">
          {/* ═══ 좌측: 일일 기록 ═══ */}
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => moveDate(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">
                  {new Date(date + "T12:00:00").toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </p>
                <h1 className="text-base font-bold">
                  {isToday ? "오늘의 식단" : "지난 기록"}
                </h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => moveDate(1)}
                disabled={isToday}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {bmr === 0 && !isLoading && (
              <Card className="border-dashed border-primary/50">
                <CardContent className="p-3 text-center space-y-1">
                  <Info className="h-5 w-5 text-primary mx-auto" />
                  <p className="text-xs font-medium">
                    기초대사량을 설정해주세요
                  </p>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => router.push("/mypage")}
                  >
                    마이페이지에서 설정
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="lg:hidden">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <CircularProgress
                      current={totalCal}
                      total={bmr}
                      isOver={isOver}
                      size={70}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">섭취</span>
                        <span
                          className={`font-bold ${isOver ? "text-red-600" : ""}`}
                        >
                          {totalCal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">BMR</span>
                        <span className="font-bold">
                          {bmr > 0 ? bmr.toLocaleString() : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {isOver ? "초과" : "남은"}
                        </span>
                        <span
                          className={`font-bold ${isOver ? "text-red-600" : "text-primary"}`}
                        >
                          {bmr > 0
                            ? isOver
                              ? `+${overAmount.toLocaleString()}`
                              : (bmr - totalCal).toLocaleString()
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ✅ 기록하기 + 공유 버튼 (통합) */}
            {isToday && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5 text-xs h-9"
                  onClick={() => setShowRecordSheet(true)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {isAnalyzing ? "분석 중..." : "기록하기"}
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    disabled={entries.length === 0}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  {showShareMenu && entries.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowShareMenu(false)}
                      />
                      <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border bg-background shadow-lg p-2 flex flex-col gap-2">
                        <button
                          onClick={shareToday}
                          disabled={isSharingToday || isSharingReport}
                          className="w-full flex items-center gap-3 rounded-lg px-4 min-h-[48px] text-left transition-opacity disabled:opacity-60 active:opacity-80"
                          style={{ backgroundColor: "#FEE500", color: "#000000" }}
                        >
                          {isSharingToday ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <span className="text-lg shrink-0">🍽️</span>
                          )}
                          <div>
                            <p className="font-semibold text-[13px]">먹은 음식 공유</p>
                            <p className="text-[10px] opacity-60">카카오톡으로 공유</p>
                          </div>
                        </button>
                        <button
                          onClick={shareReport}
                          disabled={isSharingToday || isSharingReport}
                          className="w-full flex items-center gap-3 rounded-lg px-4 min-h-[48px] text-left transition-opacity disabled:opacity-60 active:opacity-80"
                          style={{ backgroundColor: "#FEE500", color: "#000000" }}
                        >
                          {isSharingReport ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <span className="text-lg shrink-0">📊</span>
                          )}
                          <div>
                            <p className="font-semibold text-[13px]">식단 리포트 공유</p>
                            <p className="text-[10px] opacity-60">칼로리 요약 · 통계</p>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoAnalyze(f);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoAnalyze(f);
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            {isAnalyzing && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-xs">AI가 음식을 분석 중...</p>
                </CardContent>
              </Card>
            )}

            {isOver && entries.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[8px] font-bold">
                      AI
                    </div>
                    <p className="text-xs font-bold text-red-600">
                      칼로리 초과 · +{overAmount.toLocaleString()}kcal
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {getExercise(overAmount).map((ex) => (
                      <div
                        key={ex.name}
                        className="flex flex-col items-center rounded bg-green-50 py-1 text-[10px]"
                      >
                        <span>{ex.emoji}</span>
                        <span className="font-bold text-primary">
                          {ex.mins}분
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold flex items-center gap-1">
                📋 {isToday ? "오늘" : "이 날"} 먹은 것들
              </h2>
              <span className="text-[9px] text-muted-foreground">
                00시 리셋
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">
                  아직 기록이 없어요
                </p>
                {isToday && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    위 기록하기 버튼으로 음식을 추가해보세요
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {entries.map((entry, idx) => {
                  const period = getTimePeriod(entry.recorded_at);
                  const time = new Date(entry.recorded_at).toLocaleTimeString(
                    "ko-KR",
                    { hour: "2-digit", minute: "2-digit", hour12: false },
                  );
                  return (
                    <Card
                      key={entry.id}
                      className={`transition-all ${isOver && idx === entries.length - 1 ? "border-red-200" : ""}`}
                    >
                      <CardContent className="p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex gap-2 flex-1 min-w-0">
                            {entry.image_url ? (
                              <div className="flex-shrink-0 relative group">
                                <button
                                  onClick={() =>
                                    setPreviewImage(entry.image_url)
                                  }
                                  className="overflow-hidden rounded-lg border hover:border-primary/50"
                                >
                                  <img
                                    src={entry.image_url}
                                    alt={entry.food_name}
                                    className="h-10 w-10 object-cover"
                                  />
                                </button>
                                {isToday && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      editImageInputRef.current?.setAttribute(
                                        "data-entry-id",
                                        entry.id,
                                      );
                                      editImageInputRef.current?.click();
                                    }}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"
                                  >
                                    <Camera className="h-3.5 w-3.5 text-white" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (isToday) {
                                    editImageInputRef.current?.setAttribute(
                                      "data-entry-id",
                                      entry.id,
                                    );
                                    editImageInputRef.current?.click();
                                  }
                                }}
                                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-sm relative group ${isToday ? "cursor-pointer hover:bg-primary/10 transition-colors" : ""}`}
                              >
                                <span>{entry.emoji}</span>
                                {isToday && (
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                    <Camera className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </button>
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-medium truncate block">
                                {entry.food_name}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">
                                  {time}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 h-3.5 ${period.color}`}
                                >
                                  {period.label}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 h-3.5 ${entry.source === "ai" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}
                                >
                                  {entry.source === "ai" ? "AI" : "직접"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {editingId === entry.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  ref={editInputRef}
                                  type="number"
                                  value={editingCal}
                                  onChange={(e) =>
                                    setEditingCal(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditCal();
                                    if (e.key === "Escape") cancelEditCal();
                                  }}
                                  onBlur={handleEditCal}
                                  className="w-16 h-6 text-xs font-bold text-center border rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => isToday && startEditCal(entry)}
                                className={`flex items-center gap-0.5 group/cal ${isToday ? "cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors" : ""}`}
                                disabled={!isToday}
                              >
                                <span
                                  className={`text-xs font-bold ${isOver ? "text-red-600" : "text-primary"}`}
                                >
                                  {entry.estimated_cal}
                                </span>
                                {isToday && (
                                  <Pencil className="h-2.5 w-2.5 text-muted-foreground/50" />
                                )}
                              </button>
                            )}
                            {isToday && editingId !== entry.id && (
                              <button
                                onClick={() =>
                                  handleDelete(entry.id, entry.food_name)
                                }
                                className="text-muted-foreground hover:text-red-500 p-0.5"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <input
              ref={editImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                const entryId =
                  editImageInputRef.current?.getAttribute("data-entry-id");
                if (f && entryId) handleEditImage(entryId, f);
                e.target.value = "";
              }}
            />
          </div>

          {/* ═══ 우측: 대시보드 ═══ */}
          <div className="hidden lg:block">
            <div className="sticky top-20 w-72 space-y-2.5">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-bold">오늘</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CircularProgress
                      current={totalCal}
                      total={bmr}
                      isOver={isOver}
                      size={72}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">섭취</span>
                        <span
                          className={`font-bold ${isOver ? "text-red-600" : ""}`}
                        >
                          {totalCal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">BMR</span>
                        <span className="font-bold">
                          {bmr > 0 ? bmr.toLocaleString() : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {isOver ? "초과" : "남은"}
                        </span>
                        <span
                          className={`font-bold ${isOver ? "text-red-600" : "text-primary"}`}
                        >
                          {bmr > 0
                            ? isOver
                              ? `+${overAmount.toLocaleString()}`
                              : (bmr - totalCal).toLocaleString()
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex rounded-md bg-muted p-0.5 text-[10px]">
                      {(["7d", "14d", "30d"] as RangePreset[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            setRangePreset(p);
                            setShowCustom(false);
                          }}
                          className={`px-2 py-1 rounded-sm transition-all ${rangePreset === p && !showCustom ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {p === "7d" ? "7일" : p === "14d" ? "14일" : "30일"}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setRangePreset("custom");
                          setShowCustom(!showCustom);
                        }}
                        className={`px-2 py-1 rounded-sm transition-all flex items-center gap-0.5 ${showCustom ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Calendar className="h-2.5 w-2.5" />
                        기간
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    {getRangeLabel()}
                  </p>
                  {showCustom && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="border rounded px-1.5 py-0.5 text-[10px] bg-background w-[105px]"
                      />
                      <span className="text-muted-foreground">~</span>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="border rounded px-1.5 py-0.5 text-[10px] bg-background w-[105px]"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        disabled={!customStart || !customEnd}
                        onClick={loadDashboard}
                      >
                        조회
                      </Button>
                    </div>
                  )}
                  {dashLoading ? (
                    <Skeleton className="h-20 w-full rounded" />
                  ) : dashData?.stats?.length ? (
                    <BarChart
                      dailyStats={dashData.stats}
                      bmr={bmr}
                      onDayClick={(d) => setDate(d)}
                    />
                  ) : (
                    <div className="h-20 flex items-center justify-center text-[10px] text-muted-foreground">
                      데이터 없음
                    </div>
                  )}
                </CardContent>
              </Card>

              {dashData?.summary && (
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-xs font-bold">통계</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">일 평균</span>
                        <span className="font-medium text-primary">
                          {dashData.summary.avgCal.toLocaleString()} kcal
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">기록한 날</span>
                        <span className="font-medium">
                          {dashData.summary.daysWithData} /{" "}
                          {dashData.summary.totalDays}일
                        </span>
                      </div>
                      {bmr > 0 && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            초과한 날
                          </span>
                          <span
                            className={`font-medium ${dashData.summary.overDays > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {dashData.summary.overDays}일{" "}
                            {dashData.summary.overDays === 0 && "✓"}
                          </span>
                        </div>
                      )}
                      {dashData.summary.maxDay &&
                        dashData.summary.maxDay.totalCal > 0 && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              최대 섭취
                            </span>
                            <span className="font-medium">
                              {dashData.summary.maxDay.totalCal.toLocaleString()}{" "}
                              kcal
                            </span>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {dashData?.summary?.topFoods?.length ? (
                <Card>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-bold">자주 먹은 음식</span>
                    </div>
                    {dashData.summary.topFoods.slice(0, 5).map((f, i) => (
                      <div
                        key={f.name}
                        className="flex items-center gap-1.5 text-[11px]"
                      >
                        <span className="text-muted-foreground w-3">
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-muted-foreground">
                          {f.count}회
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>

          <div className="lg:hidden fixed bottom-16 right-3 z-30"></div>
        </div>
      </div>

      {/* ✅ 기록하기 바텀시트 (촬영/앨범/직접입력 선택) */}
      <AnimatePresence>
        {showRecordSheet && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center"
            onClick={() => setShowRecordSheet(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
          <motion.div
            className="w-full max-w-md rounded-t-2xl bg-background p-5 space-y-3"
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />
            <div className="text-center">
              <h3 className="text-base font-bold">🍽️ 식단 기록하기</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                음식을 기록할 방법을 선택하세요
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">카메라로 촬영</p>
                  <p className="text-xs text-muted-foreground">
                    AI가 음식을 분석하고 칼로리를 추정해요
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoAnalyze(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/10">
                  <ImageIcon className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">앨범에서 선택</p>
                  <p className="text-xs text-muted-foreground">
                    저장된 음식 사진으로 분석
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoAnalyze(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => {
                  setShowRecordSheet(false);
                  setShowManualInput(true);
                }}
                className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/10">
                  <PenLine className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">직접 입력</p>
                  <p className="text-xs text-muted-foreground">
                    음식 이름과 칼로리를 직접 입력해요
                  </p>
                </div>
              </button>
              <button
                onClick={handleOpenSchoolMeal}
                className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors border-green-200 bg-green-50/50"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500/10">
                  <School className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-green-700">학교 급식에서 선택</p>
                  <p className="text-xs text-muted-foreground">
                    등록된 학교의 오늘 급식 메뉴 불러오기
                  </p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowRecordSheet(false)}
              className="flex w-full items-center justify-center rounded-xl border p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              취소
            </button>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 직접 입력 모달 (AI 추정 기능 + 사진 첨부) ═══ */}
      {showManualInput && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeManualInput}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-background p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">음식 등록</h3>
                <p className="text-xs text-muted-foreground">
                  음식 이름을 입력하면 AI가 칼로리를 추정해요
                </p>
              </div>
              <button
                onClick={closeManualInput}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  사진 (선택)
                </label>
                <div className="mt-1">
                  {manualImagePreview ? (
                    <div className="relative">
                      <img
                        src={manualImagePreview}
                        alt="음식 사진"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => {
                          setManualImage(null);
                          setManualImagePreview(null);
                        }}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => manualImageInputRef.current?.click()}
                        className="absolute bottom-1 right-1 bg-black/50 text-white rounded-full px-2 py-0.5 text-[10px] hover:bg-black/70 transition-colors"
                      >
                        변경
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.capture = "environment";
                          input.onchange = (e) => {
                            const f = (e.target as HTMLInputElement).files?.[0];
                            if (f) handleManualImageSelect(f);
                          };
                          input.click();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        촬영
                      </button>
                      <button
                        onClick={() => manualImageInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        앨범에서 선택
                      </button>
                    </div>
                  )}
                  <input
                    ref={manualImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleManualImageSelect(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  음식 이름
                </label>
                <Input
                  placeholder="예: 김치찌개, 빅맥 세트"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  양 (선택)
                </label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="모르면 비워두세요"
                    value={manualGrams}
                    onChange={(e) => setManualGrams(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground self-center">
                    g
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  비워두면 1인분 기준으로 추정합니다
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                onClick={handleEstimate}
                disabled={!manualName.trim() || isEstimating}
              >
                {isEstimating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isEstimating ? "AI 추정 중..." : "AI 칼로리 추정"}
              </Button>
              {servingDesc && (
                <div className="rounded-lg bg-purple-50 p-2.5">
                  <p className="text-xs text-purple-700">
                    ✨ 기준: {servingDesc}
                  </p>
                  <p className="text-[10px] text-purple-500 mt-0.5">
                    추정값이 다르면 아래에서 직접 수정하세요
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  칼로리 (kcal)
                </label>
                <Input
                  type="number"
                  placeholder="AI 추정 또는 직접 입력"
                  value={manualCal}
                  onChange={(e) => setManualCal(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            {!servingDesc && (
              <div className="rounded-lg bg-blue-50 p-2.5">
                <p className="text-xs text-blue-700">
                  💡 칼로리를 알고 있다면 직접 입력해도 돼요
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={closeManualInput}
              >
                취소
              </Button>
              <Button
                className="flex-[2]"
                disabled={
                  !manualName.trim() ||
                  !manualCal ||
                  parseInt(manualCal) <= 0 ||
                  isUploadingImage
                }
                onClick={handleManualSubmit}
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    업로드 중...
                  </>
                ) : (
                  "등록"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 초과 경고 */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background overflow-hidden">
            <div className="bg-gradient-to-b from-red-100 to-red-50 p-5 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white text-lg">
                ⚠️
              </div>
              <h3 className="text-base font-extrabold text-red-600">
                칼로리 초과
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                오늘{" "}
                <strong className="text-red-600">
                  {totalCal.toLocaleString()}
                </strong>{" "}
                · BMR 대비{" "}
                <strong className="text-red-600">
                  +{overAmount.toLocaleString()}
                </strong>
              </p>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-4 gap-1.5">
                {getExercise(overAmount).map((ex) => (
                  <div
                    key={ex.name}
                    className="flex flex-col items-center rounded-lg bg-green-50 py-1.5 text-[10px]"
                  >
                    <span>{ex.emoji}</span>
                    <span className="font-bold text-primary">{ex.mins}분</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-3 pb-3">
              <Button
                className="w-full h-9 text-sm"
                onClick={() => setShowWarning(false)}
              >
                확인
              </Button>
              <p className="text-center text-[9px] text-muted-foreground mt-1.5">
                1일 1회 표시
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 학교 선택 모달 */}
      <AnimatePresence>
        {showSchoolSelect && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center"
            onClick={() => setShowSchoolSelect(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
          <motion.div
            className="w-full max-w-md rounded-t-2xl bg-background p-5 space-y-3"
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />
            <div className="text-center">
              <h3 className="text-base font-bold">🏫 학교 선택</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                급식을 불러올 학교를 선택하세요
              </p>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto">
              {isLoadingSchools ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : schoolListData.ownSchools.length === 0 && schoolListData.memberSchools.length === 0 ? (
                <div className="text-center py-8">
                  <School className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">등록된 학교가 없습니다</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    학교 페이지에서 학교를 먼저 등록해주세요
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setShowSchoolSelect(false);
                      router.push("/school");
                    }}
                  >
                    학교 등록하러 가기
                  </Button>
                </div>
              ) : (
                <>
                  {/* 본인 학교 섹션 */}
                  {schoolListData.ownSchools.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground px-1">🙋 내 학교</p>
                      {schoolListData.ownSchools.map((school) => (
                        <button
                          key={school.id}
                          onClick={() =>
                            handleSchoolSelect(school, {
                              emoji: "🙋",
                              name: "나",
                              relation: "본인",
                              memberId: null,
                            })
                          }
                          className="flex w-full items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <School className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate">{school.school_name}</p>
                              {school.is_primary && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-green-100 text-green-700">
                                  메인
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {school.school_address || "주소 정보 없음"}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 가족 구성원별 학교 섹션 */}
                  {schoolListData.memberSchools.map((group) => (
                    <div key={group.memberId} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground px-1">
                        {group.memberEmoji} {group.memberName} ({group.memberRelation})
                      </p>
                      {group.schools.length === 0 ? (
                        <button
                          onClick={() => {
                            setShowSchoolSelect(false);
                            router.push("/school");
                          }}
                          className="flex w-full items-center gap-3 rounded-xl border border-dashed p-3.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Plus className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">학교 등록하기</p>
                            <p className="text-xs text-muted-foreground/70">
                              {group.memberName}의 학교를 등록해주세요
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ) : (
                        group.schools.map((school) => (
                          <button
                            key={school.id}
                            onClick={() =>
                              handleSchoolSelect(school, {
                                emoji: group.memberEmoji,
                                name: group.memberName,
                                relation: group.memberRelation,
                                memberId: group.memberId,
                              })
                            }
                            className="flex w-full items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
                              {group.memberEmoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">{school.school_name}</p>
                                {school.is_primary && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700">
                                    메인
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {school.school_address || "주소 정보 없음"}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  ))}

                  {/* 가족 구성원 중 memberSchools에 없는 구성원 표시 */}
                  {familyMembers
                    .filter((m) => !schoolListData.memberSchools.some((g) => g.memberId === m.id))
                    .map((member) => (
                      <div key={member.id} className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground px-1">
                          {member.avatar_emoji} {member.name} ({member.relation})
                        </p>
                        <button
                          onClick={() => {
                            setShowSchoolSelect(false);
                            router.push("/school");
                          }}
                          className="flex w-full items-center gap-3 rounded-xl border border-dashed p-3.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl">
                            {member.avatar_emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">학교 등록하기</p>
                            <p className="text-xs text-muted-foreground/70">
                              {member.name}의 학교를 등록해주세요
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      </div>
                    ))}
                </>
              )}
            </div>
            <button
              onClick={() => setShowSchoolSelect(false)}
              className="flex w-full items-center justify-center rounded-xl border p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              취소
            </button>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ 급식 메뉴 선택 모달 */}
      {showMealSelect && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={closeMealSelect}
        >
          <div
            className="w-full max-w-md rounded-xl bg-background p-5 space-y-4 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">🍱 오늘의 급식</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedSchoolOwner && selectedSchoolOwner.memberId !== null
                    ? `${selectedSchoolOwner.emoji} ${selectedSchoolOwner.name}(${selectedSchoolOwner.relation}) · `
                    : ""}
                  {selectedSchool?.school_name} · {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                </p>
              </div>
              <button
                onClick={closeMealSelect}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 알레르기 체크 기준 배너 */}
            {mealCheckedMember.type === "member" && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                <span className="text-base">{mealCheckedMember.avatarEmoji}</span>
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">{mealCheckedMember.name}</span> 알레르기 기준으로 체크
                </p>
              </div>
            )}
            {mealCheckedMember.type === "self" && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                <span className="text-base">🙋</span>
                <p className="text-xs text-green-700">내 알레르기 기준으로 체크</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">
              {isLoadingMeals ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">급식 정보 불러오는 중...</p>
                </div>
              ) : schoolMeals.length === 0 ? (
                <div className="text-center py-12">
                  <Utensils className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">오늘 급식 정보가 없습니다</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    주말이나 공휴일에는 급식이 없을 수 있어요
                  </p>
                </div>
              ) : (
                schoolMeals.map((meal) => (
                  <div key={meal.mealType} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          meal.mealTypeName === "조식"
                            ? "bg-amber-100 text-amber-700"
                            : meal.mealTypeName === "중식"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {meal.mealTypeName}
                      </Badge>
                      {meal.calInfo && (
                        <span className="text-xs text-muted-foreground">{meal.calInfo}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {meal.menu.map((item, idx) => {
                        const isSelected = selectedMealItems.has(item.name);
                        const isDanger = item.status === "danger";
                        const isCaution = item.status === "caution";
                        return (
                          <button
                            key={`${meal.mealType}-${idx}`}
                            onClick={() => toggleMealItem(item.name)}
                            className={`flex w-full items-center gap-2 rounded-lg border p-2.5 transition-all text-left ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : isDanger
                                  ? "border-red-200 bg-red-50/50"
                                  : isCaution
                                    ? "border-yellow-200 bg-yellow-50/50"
                                    : "hover:bg-muted/50"
                            }`}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                isSelected
                                  ? "bg-primary border-primary text-white"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm truncate">{item.name}</span>
                                {isDanger && (
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                )}
                                {isCaution && (
                                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                                )}
                              </div>
                              {item.allergenNames.length > 0 && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {item.allergenNames.join(", ")}
                                </p>
                              )}
                            </div>
                            {isDanger && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                                알레르기
                              </Badge>
                            )}
                            {isCaution && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-yellow-100 text-yellow-700">
                                주의
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {schoolMeals.length > 0 && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeMealSelect}
                >
                  취소
                </Button>
                <Button
                  className="flex-[2] gap-1"
                  disabled={selectedMealItems.size === 0 || isAddingMeals}
                  onClick={handleAddSelectedMeals}
                >
                  {isAddingMeals ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      추가 중...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {selectedMealItems.size > 0
                        ? `${selectedMealItems.size}개 메뉴 추가`
                        : "메뉴 선택"}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 이미지 미리보기 + 다운로드 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-10 right-0 flex items-center gap-3">
              <button
                onClick={() => handleDownloadImage(previewImage, "음식사진")}
                className="text-white hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">저장</span>
              </button>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <img
              src={previewImage}
              alt="음식 사진"
              className="w-full rounded-xl object-contain max-h-[70vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
