"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles,
  Info,
  Filter,
  Map,
  X,
  Star,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Restaurant {
  name: string;
  category: string;
  categoryFull: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone: string;
  link: string;
  riskLevel: "safe" | "caution" | "danger";
  matchedAllergens: string[];
  categoryAllergens: string[];
  distance?: string;
  distanceKm?: number;
}

interface AIAnalysis {
  riskLevel: string;
  summary: string;
  popularity: string;
  popularityNote: string;
  estimatedMenus: Array<{
    name: string;
    price: string;
    allergens: string[];
    matchedUserAllergens: string[];
    risk: string;
  }>;
  safeOptions: string[];
  tips: string;
  overallReview: string;
  disclaimer: string;
}

const RISK_CONFIG = {
  safe: {
    icon: ShieldCheck,
    label: "안전",
    color: "bg-green-100 text-green-800 border-green-300",
    cardBorder: "border-green-200",
    badgeVariant: "default" as const,
    badgeClass: "bg-green-600 hover:bg-green-600",
  },
  caution: {
    icon: AlertTriangle,
    label: "주의",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    cardBorder: "border-amber-200",
    badgeVariant: "default" as const,
    badgeClass: "bg-amber-500 hover:bg-amber-500",
  },
  danger: {
    icon: XCircle,
    label: "위험",
    color: "bg-red-100 text-red-800 border-red-300",
    cardBorder: "border-red-200",
    badgeVariant: "destructive" as const,
    badgeClass: "",
  },
};

const RADIUS_STEPS = [100, 300, 500, 1000, 2000];
const RADIUS_LABELS = ["100m", "300m", "500m", "1km", "2km"];
const DEFAULT_RADIUS_INDEX = 3;

function formatRadius(meters: number): string {
  if (meters >= 1000) return `${meters / 1000}km`;
  return `${meters}m`;
}

// ── 카테고리 필터 정의 ──
const CATEGORY_FILTERS: { label: string; emoji: string; keywords: string[] }[] = [
  { label: "한식", emoji: "🍚", keywords: ["한식", "백반", "한정식", "국밥", "설렁탕", "갈비", "불고기", "해장국", "보리밥", "한식 일반"] },
  { label: "치킨", emoji: "🍗", keywords: ["치킨", "호프/통닭", "닭갈비", "닭볶음탕"] },
  { label: "중식", emoji: "🥟", keywords: ["중식", "중국식", "중식 일반"] },
  { label: "일식", emoji: "🍣", keywords: ["일식", "일식/수산물", "초밥", "롤", "일식 일반", "회", "횟집", "생선회"] },
  { label: "카페", emoji: "☕", keywords: ["카페", "카페/찻집", "커피전문점", "커피", "제과,베이커리", "제과점", "아이스크림"] },
  { label: "분식", emoji: "🍜", keywords: ["분식", "떡볶이", "순대", "김밥", "김밥(도시락)", "국수", "냉면"] },
  { label: "양식", emoji: "🍝", keywords: ["양식", "서양식", "피자", "패스트푸드"] },
  { label: "고기", emoji: "🥩", keywords: ["육류,고기요리", "삼겹살", "곱창,막창", "곱창전골", "족발,보쌈", "구이", "고기뷔페"] },
  { label: "찜/탕", emoji: "🍲", keywords: ["찜,탕", "탕/찌개", "국/탕/찌개류", "샤브샤브", "감자탕", "부대찌개", "순두부"] },
  { label: "해산물", emoji: "🦐", keywords: ["해물,생선요리", "해물", "수산물"] },
  { label: "아시안", emoji: "🍜", keywords: ["태국식", "동남아식", "베트남식", "인도식", "멕시코식"] },
  { label: "기타", emoji: "🍴", keywords: ["뷔페", "도시락", "샐러드", "주점", "음료", "죽"] },
];

// ═══════════════════════════════════════════
// restaurant_key 생성 (이름+주소 → 해시)
// ═══════════════════════════════════════════
function makeRestaurantKey(name: string, address: string): string {
  const raw = `${name.trim()}::${address.trim()}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ═══════════════════════════════════════════
// 별점 표시 컴포넌트
// ═══════════════════════════════════════════
function StarRating({
  rating,
  size = "sm",
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;
  const sizeClass = size === "md" ? "h-6 w-6" : "h-3.5 w-3.5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        >
          <Star
            className={`${sizeClass} ${
              star <= displayRating
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// 리뷰 작성/수정 모달
// ═══════════════════════════════════════════
function ReviewModal({
  open,
  onClose,
  restaurant,
  existingReview,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  restaurant: { name: string; address: string; key: string } | null;
  existingReview: { id: string; rating: number; memo: string } | null;
  onSubmit: (rating: number, memo: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [memo, setMemo] = useState(existingReview?.memo || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(existingReview?.rating || 0);
      setMemo(existingReview?.memo || "");
    }
  }, [open, existingReview]);

  if (!open || !restaurant) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("별점을 선택해주세요");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(rating, memo);
      onClose();
    } catch {
      // error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("리뷰를 삭제하시겠어요?")) return;
    setIsSubmitting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {existingReview ? "리뷰 수정" : "리뷰 작성"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">{restaurant.name}</p>

        {/* 별점 선택 */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">별점</p>
          <div className="flex items-center gap-3">
            <StarRating rating={rating} size="md" interactive onChange={setRating} />
            {rating > 0 && (
              <span className="text-lg font-bold text-amber-500">{rating}.0</span>
            )}
          </div>
        </div>

        {/* 메모 */}
        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium">한줄 메모 (선택)</p>
            <span className="text-xs text-muted-foreground">{memo.length}/100</span>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, 100))}
            placeholder="이 음식점에 대한 한줄평을 남겨주세요"
            className="w-full rounded-lg border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={2}
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          {existingReview && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {existingReview ? "수정" : "등록"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// AI 분석 결과 모달
// ═══════════════════════════════════════════
function AIAnalysisModal({
  open,
  onClose,
  restaurantName,
  analysis,
  isAnalyzing,
}: {
  open: boolean;
  onClose: () => void;
  restaurantName: string | null;
  analysis: AIAnalysis | null;
  isAnalyzing: boolean;
}) {
  if (!open || !restaurantName) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl animate-in zoom-in-95 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI 메뉴 분석
            </h3>
            <p className="text-sm text-muted-foreground">{restaurantName}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">AI가 메뉴를 분석하고 있어요...</p>
              <p className="text-xs text-muted-foreground mt-1">카테고리 기반 추정이라 10초 내외 소요됩니다</p>
            </div>
          )}

          {analysis && (
            <>
              {/* 요약 + 유명도 */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-sm font-medium">{analysis.summary}</p>
                {analysis.popularity && analysis.popularity !== "알 수 없음" && (
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      analysis.popularity === "높음" ? "bg-amber-100 text-amber-700" :
                      analysis.popularity === "보통" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      유명도: {analysis.popularity}
                    </span>
                    {analysis.popularityNote && (
                      <span className="text-xs text-muted-foreground">{analysis.popularityNote}</span>
                    )}
                  </div>
                )}
              </div>

              {/* 전반적 평가 */}
              {analysis.overallReview && (
                <p className="text-sm text-muted-foreground italic">&ldquo;{analysis.overallReview}&rdquo;</p>
              )}

              {/* 메뉴 분석 */}
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">메뉴 분석</p>
                <div className="space-y-1.5">
                  {analysis.estimatedMenus?.map((menu, i) => (
                    <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                      menu.risk === "danger" ? "bg-red-50" : menu.risk === "caution" ? "bg-amber-50" : "bg-green-50"
                    }`}>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{menu.name}</span>
                        {menu.price && <span className="ml-1.5 text-xs text-muted-foreground">{menu.price}</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {menu.matchedUserAllergens.length > 0 ? (
                          menu.matchedUserAllergens.map((a, j) => (
                            <span key={j} className="rounded bg-red-200 px-1.5 py-0.5 text-[10px] text-red-800">{a}</span>
                          ))
                        ) : (
                          <span className="text-[10px] text-green-700">✓ 안전</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 안전한 선택 */}
              {analysis.safeOptions && analysis.safeOptions.length > 0 && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="mb-1 text-xs font-semibold text-green-800">✅ 비교적 안전한 선택</p>
                  <p className="text-sm text-green-700">{analysis.safeOptions.join(", ")}</p>
                </div>
              )}

              {/* 팁 */}
              {analysis.tips && <p className="text-xs text-muted-foreground">💡 {analysis.tips}</p>}

              {/* 면책 */}
              <p className="text-[10px] text-muted-foreground/60">⚠️ {analysis.disclaimer}</p>
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="border-t p-4">
          <Button onClick={onClose} className="w-full">닫기</Button>
        </div>
      </div>
    </>
  );
}



// ═══════════════════════════════════════════
// 메인 페이지
// ═══════════════════════════════════════════
export default function RestaurantPage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationName, setLocationName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [radiusIndex, setRadiusIndex] = useState(DEFAULT_RADIUS_INDEX);
  const radius = RADIUS_STEPS[radiusIndex];

  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, AIAnalysis>>({});
  const [analyzingRestaurant, setAnalyzingRestaurant] = useState<string | null>(null);

  // 필터
  const [riskFilter, setRiskFilter] = useState<"all" | "safe" | "caution" | "danger">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ✅ 리뷰 관련
  const [restaurantRatings, setRestaurantRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ name: string; address: string; key: string } | null>(null);
  const [myReviews, setMyReviews] = useState<Record<string, { id: string; rating: number; memo: string }>>({});

  // ✅ AI 분석 모달
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // 초기화
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: allergyData } = await supabase
          .from("user_allergies")
          .select("allergen_name")
          .eq("user_id", user.id);
        if (allergyData && allergyData.length > 0) {
          setUserAllergens(allergyData.map((a) => a.allergen_name));
        }
      }
      detectLocation();
    };
    init();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("위치 서비스를 지원하지 않는 브라우저입니다");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`/api/restaurant/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          setLocationName(data.full || data.address || "내 위치");
        } catch {
          setLocationName("내 위치");
        }
        searchRestaurants(latitude, longitude, undefined, undefined, RADIUS_STEPS[radiusIndex]);
      },
      () => { toast.info("위치 권한을 허용하면 주변 음식점을 검색할 수 있어요"); },
    );
  };

  const searchRestaurants = async (lat: number, lng: number, query?: string, page?: number, customRadius?: number) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({
        lat: String(lat), lng: String(lng),
        radius: String(customRadius ?? radius),
        page: String(page || 1),
      });
      if (query) params.append("query", query);
      const res = await fetch(`/api/restaurant/search?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        if (page && page > 1) {
          setRestaurants(prev => [...prev, ...(data.restaurants || [])]);
        } else {
          setRestaurants(data.restaurants || []);
        }
        setTotalCount(data.total || 0);
        setCurrentPage(page || 1);
        if (data.userAllergens) setUserAllergens(data.userAllergens);
      } else {
        toast.error(data.error || "검색에 실패했습니다");
        if (!page || page === 1) setRestaurants([]);
      }
    } catch {
      toast.error("검색 중 오류가 발생했습니다");
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!userCoords) {
      toast.error("위치 정보가 없습니다. '내 위치로 검색'을 먼저 눌러주세요");
      return;
    }
    searchRestaurants(userCoords.lat, userCoords.lng, searchQuery.trim() || undefined);
  };

  const handleLoadMore = () => {
    if (!userCoords) return;
    searchRestaurants(userCoords.lat, userCoords.lng, searchQuery.trim() || undefined, currentPage + 1);
  };

  const handleRadiusChange = useCallback((newIndex: number) => {
    setRadiusIndex(newIndex);
    if (userCoords && hasSearched) {
      setCurrentPage(1);
      searchRestaurants(userCoords.lat, userCoords.lng, searchQuery.trim() || undefined, 1, RADIUS_STEPS[newIndex]);
    }
  }, [userCoords, hasSearched, searchQuery]);

  const analyzeRestaurant = async (restaurant: Restaurant) => {
    const key = restaurant.name;

    // 이미 분석 결과가 있으면 바로 모달 표시
    if (aiAnalysis[key]) {
      setSelectedRestaurant(key);
      setAiModalOpen(true);
      return;
    }

    if (userAllergens.length === 0) {
      toast.error("알레르기를 등록해야 AI 분석을 사용할 수 있어요", {
        action: { label: "등록하기", onClick: () => router.push("/food/profile") },
      });
      return;
    }

    // 분석 시작 → 모달 열기
    setSelectedRestaurant(key);
    setAnalyzingRestaurant(key);
    setAiModalOpen(true);

    try {
      const res = await fetch("/api/restaurant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: restaurant.name,
          category: restaurant.category,
          address: restaurant.roadAddress || restaurant.address,
          userAllergens,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiAnalysis((prev) => ({ ...prev, [key]: data.analysis }));
      } else { toast.error("AI 분석에 실패했습니다"); }
    } catch { toast.error("AI 분석 중 오류가 발생했습니다"); }
    finally { setAnalyzingRestaurant(null); }
  };

  // ═══════════════════════════════════════════
  // ✅ 리뷰: 평균 별점 일괄 조회
  // ═══════════════════════════════════════════
  const fetchRatings = useCallback(async (restaurantList: Restaurant[]) => {
    if (restaurantList.length === 0) return;
    const keys = restaurantList.map(r =>
      makeRestaurantKey(r.name, r.roadAddress || r.address)
    );
    try {
      const res = await fetch(`/api/restaurant/reviews?keys=${keys.join(",")}`);
      const data = await res.json();
      if (data.ratings) {
        setRestaurantRatings(prev => ({ ...prev, ...data.ratings }));
      }
      // ✅ 내 리뷰 복원 (새로고침 시 "내 리뷰" 버튼 유지)
      if (data.myReviews) {
        setMyReviews(prev => ({ ...prev, ...data.myReviews }));
      }
    } catch {
      // 별점 조회 실패 무시
    }
  }, []);

  useEffect(() => {
    if (restaurants.length > 0) {
      fetchRatings(restaurants);
    }
  }, [restaurants, fetchRatings]);

  // ═══════════════════════════════════════════
  // ✅ 리뷰: 모달 열기
  // ═══════════════════════════════════════════
  const openReviewModal = (restaurant: Restaurant) => {
    if (!user) {
      toast.error("로그인이 필요합니다", {
        action: { label: "로그인", onClick: () => router.push("/login") },
      });
      return;
    }
    const key = makeRestaurantKey(restaurant.name, restaurant.roadAddress || restaurant.address);
    setReviewTarget({
      name: restaurant.name,
      address: restaurant.roadAddress || restaurant.address,
      key,
    });
    setReviewModalOpen(true);

    // 내 기존 리뷰 조회
    fetch(`/api/restaurant/reviews?key=${key}`)
      .then(res => res.json())
      .then(data => {
        if (data.myReview) {
          setMyReviews(prev => ({ ...prev, [key]: data.myReview }));
        }
      })
      .catch(() => {});
  };

  // ═══════════════════════════════════════════
  // ✅ 리뷰: 작성/수정
  // ═══════════════════════════════════════════
  const handleReviewSubmit = async (rating: number, memo: string) => {
    if (!reviewTarget) return;
    const res = await fetch("/api/restaurant/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: reviewTarget.name,
        address: reviewTarget.address,
        rating,
        memo,
      }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(myReviews[reviewTarget.key] ? "리뷰가 수정되었어요" : "리뷰가 등록되었어요!");
      setMyReviews(prev => ({
        ...prev,
        [reviewTarget.key]: { id: data.review.id, rating: data.review.rating, memo: data.review.memo },
      }));
      fetchRatings(restaurants);
    } else {
      toast.error(data.error || "리뷰 저장에 실패했습니다");
      throw new Error(data.error);
    }
  };

  // ═══════════════════════════════════════════
  // ✅ 리뷰: 삭제
  // ═══════════════════════════════════════════
  const handleReviewDelete = async () => {
    if (!reviewTarget || !myReviews[reviewTarget.key]) return;
    const res = await fetch(`/api/restaurant/reviews?id=${myReviews[reviewTarget.key].id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      toast.success("리뷰가 삭제되었어요");
      setMyReviews(prev => {
        const next = { ...prev };
        delete next[reviewTarget.key];
        return next;
      });
      fetchRatings(restaurants);
    } else {
      toast.error("삭제에 실패했습니다");
    }
  };

  // ── 카테고리별 음식점 수 계산 ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cf of CATEGORY_FILTERS) {
      counts[cf.label] = restaurants.filter(r =>
        cf.keywords.some(kw => r.category === kw || r.category.includes(kw) || kw.includes(r.category))
      ).length;
    }
    return counts;
  }, [restaurants]);

  // ── 복합 필터링 ──
  const filteredRestaurants = useMemo(() => {
    let list = restaurants;

    // 위험도 필터
    if (riskFilter !== "all") {
      list = list.filter(r => r.riskLevel === riskFilter);
    }

    // 카테고리 필터
    if (categoryFilter) {
      const cf = CATEGORY_FILTERS.find(c => c.label === categoryFilter);
      if (cf) {
        list = list.filter(r =>
          cf.keywords.some(kw => r.category === kw || r.category.includes(kw) || kw.includes(r.category))
        );
      }
    }

    return list;
  }, [restaurants, riskFilter, categoryFilter]);

  // ═══════════════════════════════════════════
  // 필터 사이드바 (데스크톱 우측 고정 / 모바일 상단 sticky)
  // ═══════════════════════════════════════════
  const FilterPanel = () => (
    <div className="space-y-4">
      {/* 위험도 필터 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">위험도</p>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "safe", "caution", "danger"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRiskFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                riskFilter === f
                  ? f === "all"
                    ? "bg-primary text-primary-foreground"
                    : f === "safe"
                    ? "bg-green-600 text-white"
                    : f === "caution"
                    ? "bg-amber-500 text-white"
                    : "bg-red-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "all" ? "전체" : RISK_CONFIG[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 필터 */}
      {hasSearched && restaurants.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">카테고리</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              전체 {restaurants.length}
            </button>
            {CATEGORY_FILTERS.map((cf) => {
              const count = categoryCounts[cf.label] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={cf.label}
                  onClick={() => setCategoryFilter(prev => prev === cf.label ? null : cf.label)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    categoryFilter === cf.label
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cf.emoji} {cf.label} {count}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 반경 슬라이더 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">검색 반경</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {formatRadius(radius)}
          </span>
        </div>
        <div className="relative px-1">
          <div className="relative h-1.5 w-full rounded-full bg-muted">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${(radiusIndex / (RADIUS_STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <div className="absolute top-0 flex h-1.5 w-full items-center justify-between">
            {RADIUS_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => handleRadiusChange(i)}
                className={`h-2 w-2 rounded-full border-2 transition-all ${
                  i <= radiusIndex ? "border-primary bg-primary" : "border-muted-foreground/30 bg-background"
                }`}
                style={{ zIndex: 2 }}
              />
            ))}
          </div>
          <input
            type="range" min={0} max={RADIUS_STEPS.length - 1} step={1} value={radiusIndex}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className="absolute top-1/2 left-0 h-6 w-full -translate-y-1/2 cursor-pointer opacity-0"
            style={{ zIndex: 3 }}
          />
        </div>
        <div className="mt-1.5 flex w-full justify-between">
          {RADIUS_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => handleRadiusChange(i)}
              className={`text-[10px] transition-colors ${
                i === radiusIndex ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 알레르기 미등록 안내 */}
      {hasSearched && userAllergens.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-medium text-amber-800">알레르기 미등록</p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[10px] text-amber-700 underline"
              onClick={() => router.push("/food/profile")}
            >
              등록하기 →
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4">

          {/* ── 검색바 (전체 너비) ── */}
          <div className="mx-auto mb-4 max-w-4xl space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="상호명 또는 업종 검색 (예: 치킨, 한식)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
              </Button>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={detectLocation}>
              <Navigation className="h-3.5 w-3.5" />내 위치로 검색
            </Button>
          </div>

          {/* ── 모바일: 상단 고정 필터 ── */}
          <div className="sticky top-16 z-30 -mx-4 mb-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 pb-1">
                {/* 위험도 필터 */}
                {(["all", "safe", "caution", "danger"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setRiskFilter(f)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      riskFilter === f
                        ? f === "all" ? "bg-primary text-primary-foreground"
                          : f === "safe" ? "bg-green-600 text-white"
                          : f === "caution" ? "bg-amber-500 text-white"
                          : "bg-red-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {f === "all" ? "전체" : RISK_CONFIG[f].label}
                  </button>
                ))}
                <div className="mx-1 w-px shrink-0 bg-border" />
                {/* 카테고리 칩 */}
                {CATEGORY_FILTERS.map((cf) => {
                  const count = categoryCounts[cf.label] || 0;
                  if (count === 0 && hasSearched) return null;
                  return (
                    <button
                      key={cf.label}
                      onClick={() => setCategoryFilter(prev => prev === cf.label ? null : cf.label)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        categoryFilter === cf.label
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {cf.emoji} {cf.label}{count > 0 ? ` ${count}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 반경 미니 슬라이더 (모바일) */}
            <div className="mt-2 flex items-center gap-3">
              <span className="shrink-0 text-[10px] text-muted-foreground">반경</span>
              <input
                type="range" min={0} max={RADIUS_STEPS.length - 1} step={1} value={radiusIndex}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-primary"
              />
              <span className="shrink-0 text-xs font-semibold text-primary">{formatRadius(radius)}</span>
            </div>
          </div>

          {/* ── 메인 레이아웃: 리스트 + 사이드바 ── */}
          <div className="mx-auto flex max-w-4xl gap-6">

            {/* 왼쪽: 음식점 리스트 */}
            <div className="min-w-0 flex-1">

              {/* 위치 + 결과 수 */}
              {locationName && hasSearched && (
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <p className="truncate">
                    <span className="font-medium text-foreground">{locationName}</span>
                    {" · "}{filteredRestaurants.length}개
                    {categoryFilter && <span className="text-primary"> ({categoryFilter})</span>}
                  </p>
                </div>
              )}

              {/* 로딩 */}
              {isLoading && restaurants.length === 0 && (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-56" />
                          </div>
                          <Skeleton className="h-6 w-14 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 검색 전 안내 */}
              {!hasSearched && !isLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mb-2 text-lg font-semibold">내 주변 음식점 알레르기 체크</h2>
                  <p className="text-sm text-muted-foreground">위치를 허용하면 주변 음식점을 자동으로 검색해요</p>
                </div>
              )}

              {/* 결과 없음 */}
              {hasSearched && !isLoading && filteredRestaurants.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-muted-foreground">
                    {categoryFilter
                      ? `'${categoryFilter}' 카테고리에 맞는 음식점이 없어요`
                      : riskFilter !== "all"
                      ? "해당 필터에 맞는 음식점이 없어요"
                      : "음식점을 찾을 수 없어요. 반경을 넓혀보세요"}
                  </p>
                  {(categoryFilter || riskFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => { setCategoryFilter(null); setRiskFilter("all"); }}
                    >
                      필터 초기화
                    </Button>
                  )}
                </div>
              )}

              {/* ═══ 음식점 카드 리스트 ═══ */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredRestaurants.map((restaurant, idx) => {
                  const risk = RISK_CONFIG[restaurant.riskLevel];
                  const RiskIcon = risk.icon;
                  const rKey = makeRestaurantKey(restaurant.name, restaurant.roadAddress || restaurant.address);
                  const ratingData = restaurantRatings[rKey];

                  return (
                    <Card
                      key={`${restaurant.name}-${idx}`}
                      className={`transition-all ${risk.cardBorder}`}
                    >
                      <CardContent className="p-4">
                        {/* 상단 */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{restaurant.name}</h3>
                            <p className="text-xs text-muted-foreground">{restaurant.category}</p>
                            {/* ✅ 평균 별점 표시 */}
                            {ratingData && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <StarRating rating={Math.round(ratingData.avg)} />
                                <span className="text-xs font-semibold text-amber-600">{ratingData.avg.toFixed(1)}</span>
                                <span className="text-[10px] text-muted-foreground">({ratingData.count})</span>
                              </div>
                            )}
                          </div>
                          <Badge variant={risk.badgeVariant} className={`ml-2 shrink-0 ${risk.badgeClass}`}>
                            <RiskIcon className="mr-1 h-3 w-3" />
                            {risk.label}
                          </Badge>
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground truncate">
                          {restaurant.roadAddress || restaurant.address}
                        </p>
                        {restaurant.distance && (
                          <p className="mt-0.5 text-xs text-primary font-medium">📍 {restaurant.distance}</p>
                        )}

                        {restaurant.matchedAllergens.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {restaurant.matchedAllergens.map((a, i) => (
                              <span key={i} className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">{a}</span>
                            ))}
                          </div>
                        )}

                        {/* 액션 버튼 */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          <Button
                            variant="outline"
                            size="sm" className="h-7 gap-1 text-xs"
                            onClick={() => analyzeRestaurant(restaurant)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            AI 분석
                          </Button>
                          {/* ✅ 리뷰 버튼 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => openReviewModal(restaurant)}
                          >
                            {myReviews[rKey]
                              ? <><Pencil className="h-3.5 w-3.5" />내 리뷰</>
                              : <><MessageSquare className="h-3.5 w-3.5" />리뷰</>
                            }
                          </Button>
                          {restaurant.phone && (
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                              onClick={() => window.open(`tel:${restaurant.phone}`)}>
                              <Phone className="h-3.5 w-3.5" />전화
                            </Button>
                          )}
                          {restaurant.lat && restaurant.lng && (
                            <Button
                              variant="ghost"
                              size="sm" className="h-7 gap-1 text-xs"
                              onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name)}`, "_blank")}
                            >
                              <Map className="h-3.5 w-3.5" />지도
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* 더보기 */}
              {hasSearched && !isLoading && totalCount > restaurants.length && (
                <Button variant="outline" className="mt-4 w-full" onClick={handleLoadMore}>
                  더 많은 음식점 보기 ({restaurants.length} / {totalCount})
                </Button>
              )}
              {isLoading && restaurants.length > 0 && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* ═══ 오른쪽: 데스크톱 고정 필터 사이드바 ═══ */}
            <aside className="hidden md:block w-56 shrink-0">
              <div className="sticky top-20">
                <div className="rounded-xl border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">필터</span>
                  </div>
                  <FilterPanel />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* ✅ 리뷰 모달 */}
      <ReviewModal
        open={reviewModalOpen}
        onClose={() => { setReviewModalOpen(false); setReviewTarget(null); }}
        restaurant={reviewTarget}
        existingReview={reviewTarget ? myReviews[reviewTarget.key] || null : null}
        onSubmit={handleReviewSubmit}
        onDelete={handleReviewDelete}
      />

      {/* ✅ AI 분석 모달 */}
      <AIAnalysisModal
        open={aiModalOpen}
        onClose={() => { setAiModalOpen(false); }}
        restaurantName={selectedRestaurant}
        analysis={selectedRestaurant ? aiAnalysis[selectedRestaurant] || null : null}
        isAnalyzing={analyzingRestaurant !== null}
      />

      <MobileNav />
    </div>
  );
}
