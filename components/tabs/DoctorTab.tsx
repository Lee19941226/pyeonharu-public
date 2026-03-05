"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Star,
  Loader2,
  UserRound,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";

const QUICK_DEPARTMENTS = [
  "내과",
  "외과",
  "소아청소년과",
  "산부인과",
  "정형외과",
  "피부과",
  "이비인후과",
  "안과",
  "비뇨의학과",
  "정신건강의학과",
];

interface DiseaseStat {
  name: string;
  avgRating: number;
  count: number;
}

interface DoctorSummary {
  doctorName: string;
  hospitalName: string;
  department: string;
  avgRating: number;
  reviewCount: number;
  diseases: DiseaseStat[];
  hospitalLat: number | null;
  hospitalLng: number | null;
}

type SortMode = "rating" | "reviews" | "distance";

interface DoctorReviewDetail {
  id: string;
  doctorName: string;
  department: string;
  diseaseName: string;
  rating: number;
  content: string;
  isVerified: boolean;
  createdAt: string;
}

// ── 거리 계산 (Haversine) ──
function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── 모듈 레벨 캐시 (SPA 내비게이션 간 유지, 5분 TTL) ──
const CACHE_TTL = 5 * 60 * 1000;
const doctorListCache = new Map<string, { data: DoctorSummary[]; ts: number }>();
const doctorDetailCache = new Map<string, { data: DoctorReviewDetail[]; ts: number }>();

export default function DoctorTab() {
  const [query, setQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedDisease, setSelectedDisease] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [detailReviews, setDetailReviews] = useState<DoctorReviewDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 사용자 위치 (거리 정렬용)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    }
  }, []);

  const fetchDoctors = useCallback(async (q: string, dept: string, skipCache = false) => {
    setHasSearched(true);
    const cacheKey = `${q}::${dept}`;
    if (!skipCache) {
      const cached = doctorListCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setDoctors(cached.data);
        return;
      }
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (dept) params.set("department", dept);
      params.set("limit", "30");

      const res = await fetch(`/api/doctor-reviews?${params.toString()}`);
      const data = await res.json();
      const result = data.doctors || [];
      setDoctors(result);
      doctorListCache.set(cacheKey, { data: result, ts: Date.now() });
    } catch {
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchDoctors("", "");
  }, [fetchDoctors]);

  // 디바운스 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors(query, selectedDept);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedDept, fetchDoctors]);

  const handleDeptToggle = (dept: string) => {
    setSelectedDept((prev) => (prev === dept ? "" : dept));
  };

  const handleToggleExpand = async (doctor: DoctorSummary) => {
    const key = `${doctor.doctorName}::${doctor.hospitalName}`;
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    // 캐시 히트 → 즉시 표시
    const cached = doctorDetailCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setDetailReviews(cached.data);
      return;
    }
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({
        doctor: doctor.doctorName,
        hospitalName: doctor.hospitalName,
      });
      const res = await fetch(`/api/doctor-reviews?${params.toString()}`);
      const data = await res.json();
      const reviews = data.reviews || [];
      setDetailReviews(reviews);
      doctorDetailCache.set(key, { data: reviews, ts: Date.now() });
    } catch {
      setDetailReviews([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRefresh = () => {
    doctorDetailCache.clear();
    setExpandedKey(null);
    fetchDoctors(query, selectedDept, true);
  };

  // 현재 데이터에서 질병 목록 추출
  const availableDiseases = useMemo(() => {
    const set = new Set<string>();
    for (const d of doctors) {
      for (const ds of d.diseases) set.add(ds.name);
    }
    return Array.from(set).sort();
  }, [doctors]);

  // 질병 필터가 바뀌면 선택값 유효성 체크
  useEffect(() => {
    if (selectedDisease && !availableDiseases.includes(selectedDisease)) {
      setSelectedDisease("");
    }
  }, [availableDiseases, selectedDisease]);

  // 필터 + 정렬 적용
  const displayDoctors = useMemo(() => {
    let list = doctors;

    // 질병 필터
    if (selectedDisease) {
      list = list.filter((d) => d.diseases.some((ds) => ds.name === selectedDisease));
    }

    // 정렬
    return [...list].sort((a, b) => {
      if (sortMode === "rating") return b.avgRating - a.avgRating || b.reviewCount - a.reviewCount;
      if (sortMode === "reviews") return b.reviewCount - a.reviewCount || b.avgRating - a.avgRating;
      if (sortMode === "distance" && userLocation) {
        const distA = a.hospitalLat ? calcDistanceKm(userLocation.lat, userLocation.lng, a.hospitalLat, a.hospitalLng!) : 99999;
        const distB = b.hospitalLat ? calcDistanceKm(userLocation.lat, userLocation.lng, b.hospitalLat, b.hospitalLng!) : 99999;
        return distA - distB;
      }
      return 0;
    });
  }, [doctors, selectedDisease, sortMode, userLocation]);

  return (
    <div className="container mx-auto px-4 pt-3">
      <div className="mx-auto max-w-2xl">
        {/* 검색 + 새로고침 */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="의사명, 병명, 병원명으로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              병원 상세 페이지에서 의사 리뷰를 남기면 여기에 모여요
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 진료과 필터 */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_DEPARTMENTS.map((dept) => (
            <Badge
              key={dept}
              variant={selectedDept === dept ? "default" : "outline"}
              className="cursor-pointer transition-colors"
              onClick={() => handleDeptToggle(dept)}
            >
              {dept}
            </Badge>
          ))}
        </div>

        {/* 질병 필터 + 정렬 */}
        <div className="mb-4 flex items-center gap-2">
          {availableDiseases.length > 0 && (
            <Select value={selectedDisease} onValueChange={(v) => setSelectedDisease(v === "all" ? "" : v)}>
              <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
                <SelectValue placeholder="질병 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">질병 전체</SelectItem>
                {availableDiseases.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
              <ArrowUpDown className="mr-1 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">별점 순</SelectItem>
              <SelectItem value="reviews">리뷰 많은 순</SelectItem>
              <SelectItem value="distance">거리 순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 결과 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayDoctors.length === 0 ? (
          <div className="py-16 text-center">
            <UserRound className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {selectedDisease
                ? `"${selectedDisease}" 관련 의사가 없습니다`
                : hasSearched && query
                  ? "검색 결과가 없습니다"
                  : "아직 의사 리뷰가 없습니다"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              병원 상세 페이지에서 진료받은 의사 리뷰를 남겨보세요
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            {/* 테이블 헤더 */}
            <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
              <span className="w-24 shrink-0">의사명</span>
              <span className="w-20 shrink-0">진료과</span>
              <span className="flex-1 min-w-0">소속 병원</span>
              <span className="w-10 shrink-0 text-center">종합</span>
            </div>
            {/* 테이블 바디 */}
            {displayDoctors.map((doctor, idx) => {
              const key = `${doctor.doctorName}::${doctor.hospitalName}`;
              const isExpanded = expandedKey === key;
              return (
                <div key={`${doctor.doctorName}-${doctor.hospitalName}-${idx}`} className="border-b last:border-b-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => handleToggleExpand(doctor)}
                  >
                    <span className="w-24 shrink-0 text-sm font-semibold truncate">{doctor.doctorName}</span>
                    <Badge variant="secondary" className="w-20 shrink-0 justify-center text-[10px] px-1.5 py-0">{doctor.department}</Badge>
                    <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                      {doctor.hospitalName}
                      {sortMode === "distance" && userLocation && doctor.hospitalLat && (
                        <span className="ml-1 text-[10px] text-primary">
                          {(() => {
                            const d = calcDistanceKm(userLocation.lat, userLocation.lng, doctor.hospitalLat!, doctor.hospitalLng!);
                            return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
                          })()}
                        </span>
                      )}
                    </span>
                    <div className="w-10 shrink-0 flex items-center justify-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold">{doctor.avgRating}</span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  {/* 질병별 평점 */}
                  {doctor.diseases.length > 0 && (
                    <div className="px-3 pb-1.5 pl-4 space-y-0.5">
                      {doctor.diseases.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{d.name}</Badge>
                          <div className="flex items-center gap-0.5">
                            <Star className={`h-2.5 w-2.5 ${d.avgRating >= 4 ? "fill-green-500 text-green-500" : d.avgRating >= 3 ? "fill-amber-400 text-amber-400" : "fill-red-400 text-red-400"}`} />
                            <span className={`font-medium ${d.avgRating >= 4 ? "text-green-600" : d.avgRating >= 3 ? "text-amber-600" : "text-red-500"}`}>{d.avgRating}</span>
                          </div>
                          <span className="text-muted-foreground">({d.count}건)</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 펼쳐진 리뷰 상세 */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 px-3 py-2 space-y-2">
                      {detailLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : detailReviews.length === 0 ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">리뷰 내용이 없습니다</p>
                      ) : (
                        detailReviews.map((r) => (
                          <div key={r.id} className="rounded-md border bg-background p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{r.diseaseName}</Badge>
                              <div className="flex items-center gap-0.5">
                                <Star className={`h-2.5 w-2.5 ${r.rating >= 4 ? "fill-green-500 text-green-500" : r.rating >= 3 ? "fill-amber-400 text-amber-400" : "fill-red-400 text-red-400"}`} />
                                <span className={`text-[11px] font-medium ${r.rating >= 4 ? "text-green-600" : r.rating >= 3 ? "text-amber-600" : "text-red-500"}`}>{r.rating}</span>
                              </div>
                              {r.isVerified && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 text-green-700 bg-green-100">
                                  <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
                                  인증
                                </Badge>
                              )}
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                              </span>
                            </div>
                            {r.content && (
                              <p className="text-xs text-foreground/80">{r.content}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
