"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { NaverMap, type MapMarker } from "@/components/medical/naver-map";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Stethoscope,
  MapPin,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Phone,
  Navigation,
  Search,
  Check,
  Circle,
  ChevronRight,
  ExternalLink,
  UtensilsCrossed,
  Ban,
} from "lucide-react";
import { BookmarkButton } from "@/components/medical/bookmark-button";

// ─── Types ───
interface DietaryAdvice {
  item: string;
  emoji: string;
  reason: string;
}

interface AnalysisResult {
  suspectedDisease: string;
  department: string;
  confidence: number;
  healthAdvice: string[];
  dietaryAdvice?: DietaryAdvice[];
  avoidFoods?: string[];
  visitTip: string;
  emergencyLevel: "normal" | "urgent" | "emergency";
  possibleDepartments?: string[];
}

interface NearbyHospital {
  id: string;
  name: string;
  department: string;
  address: string;
  distance: string;
  phone: string;
  isAiRecommended: boolean;
  lat: number;
  lng: number;
  clCdNm?: string;
}

type ScreenState = "input" | "analyzing" | "result" | "detail";

// ─── 공공데이터 API로 주변 병원 검색 ───
async function fetchNearbyHospitals(
  lat: number,
  lng: number,
  department: string,
): Promise<NearbyHospital[]> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      department,
      radius: "3000",
    });
    const res = await fetch(`/api/hospitals?${params.toString()}`);
    const data = await res.json();

    if (!res.ok || !data.hospitals?.length) {
      console.warn("[fetchNearbyHospitals] API 결과 없음, 빈 배열 반환");
      return [];
    }

    return data.hospitals.slice(0, 5); // 최대 5개
  } catch (err) {
    console.error("[fetchNearbyHospitals] 에러:", err);
    return [];
  }
}

// ─── Daily usage limit (localStorage) ───
const DAILY_LIMIT = 5;
const STORAGE_KEY = "pyeonharu_symptom_usage";

function getUsageToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const today = new Date().toISOString().split("T")[0];
    return d.date === today ? d.count : 0;
  } catch {
    return 0;
  }
}

function incrementUsage(): number {
  const today = new Date().toISOString().split("T")[0];
  const n = getUsageToday() + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: n }));
  return n;
}

// ═══════════════════════════════════════
// Main component
// ═══════════════════════════════════════
function SymptomContent() {
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<ScreenState>("input");
  const [symptom, setSymptom] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [selectedHospital, setSelectedHospital] =
    useState<NearbyHospital | null>(null);
  const [error, setError] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const hasAutoAnalyzed = useRef(false);

  useEffect(() => {
    setUsageCount(getUsageToday());
    // 사용자 위치
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => setUserLocation({ lat: 37.5665, lng: 126.978 }), // 서울 기본값
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      setUserLocation({ lat: 37.5665, lng: 126.978 });
    }
  }, []);

  const remaining = DAILY_LIMIT - usageCount;
  const limitReached = remaining <= 0;

  const runAnalysis = useCallback(
    async (text: string) => {
      if (!text.trim() || limitReached) return;
      setScreen("analyzing");
      setAnalysisStep(0);
      setResult(null);
      setError("");

      const timers = [
        setTimeout(() => setAnalysisStep(1), 600),
        setTimeout(() => setAnalysisStep(2), 1400),
      ];

      try {
        const res = await fetch("/api/symptom-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symptom: text.trim() }),
        });
        const data = await res.json();

        if (!res.ok) {
          timers.forEach(clearTimeout);
          setError(data.error || "분석 중 오류가 발생했습니다.");
          setScreen("input");
          return;
        }

        setAnalysisStep(3);
        await new Promise((r) => setTimeout(r, 500));
        setAnalysisStep(4);
        await new Promise((r) => setTimeout(r, 400));

        setResult(data);

        // 공공데이터 API로 주변 병원 검색
        const loc = userLocation || { lat: 37.5665, lng: 126.978 };
        const nearbyHospitals = await fetchNearbyHospitals(
          loc.lat,
          loc.lng,
          data.department,
        );
        setHospitals(nearbyHospitals);

        setUsageCount(incrementUsage());
        setScreen("result");
      } catch {
        timers.forEach(clearTimeout);
        setError("네트워크 오류가 발생했습니다.");
        setScreen("input");
      }
    },
    [limitReached, userLocation],
  );

  // URL 쿼리 자동 분석
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !hasAutoAnalyzed.current) {
      hasAutoAnalyzed.current = true;
      setSymptom(q);
      const timer = setTimeout(() => runAnalysis(q), 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams, runAnalysis]);

  // 병원 목록 → 지도 마커 변환
  const hospitalMarkers: MapMarker[] = hospitals.map((h) => ({
    id: h.id,
    lat: h.lat,
    lng: h.lng,
    label: h.name.length > 8 ? h.name.slice(0, 8) + "…" : h.name,
    isAiRecommended: h.isAiRecommended,
  }));

  return (
    <div className="w-full">
      <div className="flex-1">
        {screen === "input" && (
          <InputScreen
            symptom={symptom}
            setSymptom={setSymptom}
            remaining={remaining}
            limitReached={limitReached}
            error={error}
            setError={setError}
            onAnalyze={() => runAnalysis(symptom)}
          />
        )}
        {screen === "analyzing" && (
          <AnalyzingScreen symptom={symptom} step={analysisStep} />
        )}
        {screen === "result" && result && (
          <ResultScreen
            result={result}
            hospitals={hospitals}
            markers={hospitalMarkers}
            userLocation={userLocation}
            onBack={() => {
              setScreen("input");
              setResult(null);
            }}
            onDetail={(h) => {
              setSelectedHospital(h);
              setScreen("detail");
            }}
            onNew={() => {
              setScreen("input");
              setSymptom("");
              setResult(null);
            }}
            onMarkerClick={(id) => {
              const h = hospitals.find((h) => h.id === id);
              if (h) {
                setSelectedHospital(h);
                setScreen("detail");
              }
            }}
          />
        )}
        {screen === "detail" && selectedHospital && result && (
          <DetailScreen
            hospital={selectedHospital}
            result={result}
            userLocation={userLocation}
            onBack={() => {
              setScreen("result");
              setSelectedHospital(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ① 증상 입력 화면
// ═══════════════════════════════════════
function InputScreen({
  symptom,
  setSymptom,
  remaining,
  limitReached,
  error,
  setError,
  onAnalyze,
}: {
  symptom: string;
  setSymptom: (v: string) => void;
  remaining: number;
  limitReached: boolean;
  error: string;
  setError: (v: string) => void;
  onAnalyze: () => void;
}) {
  const MAX = 500;
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* A 히어로 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">
            어디가 불편하신가요?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            증상을 직접 입력하면 AI가 분석하여
            <br />
            맞춤 진료과와 가까운 병원을 추천해드려요
          </p>
        </div>

        {/* B 증상 입력 */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">증상을 알려주세요</CardTitle>
            <p className="text-sm text-muted-foreground">
              현재 겪고 있는 증상을 자세히 설명해주세요
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Textarea
                placeholder="예: 기침하고 콧물이 나와요. 열은 없어요. 36.7도에요. 3일째 계속되고 있어요."
                value={symptom}
                onChange={(e) => {
                  if (e.target.value.length <= MAX) {
                    setSymptom(e.target.value);
                    if (error) setError("");
                  }
                }}
                rows={5}
                className="resize-none pb-8"
                disabled={limitReached}
              />
              <span
                className={`absolute bottom-3 right-3 text-xs ${symptom.length > MAX * 0.9 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {symptom.length}/{MAX}
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* C AI 분석하기 버튼 */}
            <Button
              onClick={onAnalyze}
              disabled={!symptom.trim() || limitReached}
              className="w-full rounded-full py-6 text-base"
              size="lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              AI 분석하기
            </Button>
          </CardContent>
        </Card>

        {/* D 의료 면책 안내 */}
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-amber-800 dark:text-amber-200">
            AI 분석 결과는 참고용이며, 정확한 진단은 의료 전문가와 상담하세요.
            응급 시{" "}
            <a href="tel:119" className="font-semibold underline">
              119
            </a>{" "}
            연락.
          </p>
        </div>

        {/* E 남은 분석 횟수 */}
        <p
          className={`text-center text-sm ${limitReached ? "font-semibold text-destructive" : "text-muted-foreground"}`}
        >
          {limitReached
            ? "오늘 분석 횟수를 모두 사용했습니다"
            : `오늘 남은 분석 횟수 ${remaining}/${DAILY_LIMIT}`}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ② AI 분석 중 화면
// ═══════════════════════════════════════
function AnalyzingScreen({ symptom, step }: { symptom: string; step: number }) {
  const steps = [
    "증상 키워드 추출",
    "질환 가능성 분석",
    "주변 병원 검색",
    "맞춤 가이드 생성",
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex justify-center">
          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            AI 분석 중 화면
          </Badge>
        </div>

        {/* A 펄스 애니메이션 */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-6 flex h-32 w-32 items-center justify-center">
            <div
              className="absolute inset-0 animate-ping rounded-full bg-primary/20"
              style={{ animationDuration: "2s" }}
            />
            <div
              className="absolute inset-2 animate-ping rounded-full bg-primary/15"
              style={{ animationDuration: "2.5s", animationDelay: "0.3s" }}
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-bold">증상을 분석하고 있어요</h2>
        </div>

        {/* B 사용자 입력 원문 */}
        <div className="mb-8 rounded-lg border bg-muted/50 p-4">
          <p className="text-center text-sm italic text-muted-foreground">
            &ldquo; {symptom} &rdquo;
          </p>
        </div>

        {/* C 단계별 진행 */}
        <div className="space-y-4">
          {steps.map((label, i) => {
            const done = step >= i + 1;
            const current = step === i;
            return (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {done ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  ) : current ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                      <Circle className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <span
                  className={`flex-1 text-sm font-medium ${done ? "text-foreground" : current ? "text-primary" : "text-muted-foreground/50"}`}
                >
                  {label}
                </span>
                <span
                  className={`text-xs ${done ? "text-primary font-medium" : current ? "text-primary" : "text-muted-foreground/40"}`}
                >
                  {done ? "완료" : current ? "분석 중..." : "대기"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ③ 분석 결과 화면
// ═══════════════════════════════════════
function ResultScreen({
  result,
  hospitals,
  markers,
  userLocation,
  onBack,
  onDetail,
  onNew,
  onMarkerClick,
}: {
  result: AnalysisResult;
  hospitals: NearbyHospital[];
  markers: MapMarker[];
  userLocation: { lat: number; lng: number } | null;
  onBack: () => void;
  onDetail: (h: NearbyHospital) => void;
  onNew: () => void;
  onMarkerClick: (id: string) => void;
}) {
  const isEmergency = result.emergencyLevel === "emergency";

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">AI 분석 결과</h1>
        </div>

        {/* A AI 메시지 카드 */}
        <Card
          className={`mb-6 ${isEmergency ? "border-destructive" : "border-primary/30"}`}
        >
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <span className="text-sm font-bold text-primary-foreground">
                  편
                </span>
              </div>
              <div>
                <span className="font-semibold">편하루 AI</span>
                <Badge
                  className="ml-2 bg-primary/10 text-primary hover:bg-primary/10"
                  variant="secondary"
                >
                  분석완료
                </Badge>
              </div>
            </div>

            <p className="mb-3 text-sm text-muted-foreground">
              입력하신 증상을 분석했어요.
            </p>

            <div
              className={`mb-4 rounded-lg p-3 ${isEmergency ? "bg-destructive/10" : "bg-primary/5"}`}
            >
              <p className="text-sm font-medium">
                🔬 의심 질환:{" "}
                <span
                  className={`font-bold ${isEmergency ? "text-destructive" : "text-primary"}`}
                >
                  {result.suspectedDisease}
                </span>
              </p>
            </div>

            {isEmergency && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3">
                <p className="mb-2 text-sm font-semibold text-destructive">
                  🚨 응급 상황이 의심됩니다
                </p>
                <Button
                  asChild
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <a href="tel:119">📞 119 응급 전화</a>
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {result.healthAdvice.map((a, i) => (
                <p key={i} className="text-sm leading-relaxed">
                  {a}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ★ 식이요법 추천 카드 (NEW) */}
        {result.dietaryAdvice && result.dietaryAdvice.length > 0 && (
          <Card className="mb-6 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UtensilsCrossed className="h-5 w-5 text-green-600" />
                증상 완화에 좋은 음식
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.dietaryAdvice.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-950/30"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      {item.item}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {item.reason}
                    </p>
                  </div>
                </div>
              ))}

              {/* 피해야 할 음식 */}
              {result.avoidFoods && result.avoidFoods.length > 0 && (
                <div className="mt-4 border-t border-green-200 pt-4 dark:border-green-800">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                    <Ban className="h-4 w-4" />
                    피하면 좋은 음식
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.avoidFoods.map((food, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                      >
                        {food}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* B 지도 미리보기 (네이버 지도 연동) */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              주변 추천 병원
            </h2>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs text-primary"
            >
              <a
                href={`/search?department=${encodeURIComponent(result.department)}`}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                크게 보기
              </a>
            </Button>
          </div>

          {/* ★ 네이버 지도: 사용자 위치(주황) + 병원 마커(파랑/초록) */}
          <NaverMap
            height="200px"
            userLocation={userLocation}
            markers={markers}
            fitBounds={true}
            onMarkerClick={onMarkerClick}
          />
        </div>

        {/* C 추천 병원 카드 */}
        <div className="mb-6 space-y-3">
          {hospitals.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <MapPin className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">주변 병원 정보를 찾지 못했어요</p>
                <p className="mt-1 text-sm text-muted-foreground">위치 권한을 허용하거나 직접 검색해보세요</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <a href={`/search?department=${encodeURIComponent(result.department)}`}>
                    병원 직접 검색하기
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
          {hospitals.map((h) => (
            <Card
              key={h.id}
              className={`cursor-pointer transition-all hover:shadow-md ${h.isAiRecommended ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
              onClick={() => onDetail(h)}
            >
              <CardContent className="p-4">
                {h.isAiRecommended && (
                  <Badge
                    className="mb-2 bg-primary/10 text-primary hover:bg-primary/10"
                    variant="secondary"
                  >
                    ⭐ AI 추천
                  </Badge>
                )}
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{h.name}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {h.department}
                    </Badge>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {h.address} · {h.distance}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {h.phone}
                  </p>
                </div>

                {/* D 즉시 행동 버튼 */}
                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    asChild
                  >
                    <a href={`tel:${h.phone}`}>
                      <Phone className="mr-1 h-3.5 w-3.5" />
                      전화하기
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    asChild
                  >
                    <a
                      href={`nmap://route/public?dlat=${h.lat}&dlng=${h.lng}&dname=${encodeURIComponent(h.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="mr-1 h-3.5 w-3.5" />
                      길찾기
                    </a>
                  </Button>
                  <BookmarkButton
                    type="hospital"
                    id={h.id}
                    name={h.name}
                    address={h.address}
                    phone={h.phone}
                    category={h.department || h.clCdNm || ""}
                    lat={h.lat}
                    lng={h.lng}
                    size="sm"
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>공공데이터 기반 정보이며, 방문 전 전화 확인을 권장합니다.</p>
        </div>

        <Button variant="outline" className="w-full" onClick={onNew}>
          다른 증상 분석하기
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ④ 병원 상세 화면
// ═══════════════════════════════════════
function DetailScreen({
  hospital,
  result,
  userLocation,
  onBack,
}: {
  hospital: NearbyHospital;
  result: AnalysisResult;
  userLocation: { lat: number; lng: number } | null;
  onBack: () => void;
}) {
  const singleMarker: MapMarker[] = [
    {
      id: hospital.id,
      lat: hospital.lat,
      lng: hospital.lng,
      label:
        hospital.name.length > 10
          ? hospital.name.slice(0, 10) + "…"
          : hospital.name,
      isAiRecommended: hospital.isAiRecommended,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        {/* A 지도 (병원 중심) */}
        <div className="relative mb-6">
          <NaverMap
            height="240px"
            userLocation={userLocation}
            markers={singleMarker}
            center={{ lat: hospital.lat, lng: hospital.lng }}
            zoom={16}
            fitBounds={false}
          />
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-3 top-3 z-20 h-9 w-9 rounded-full shadow-md"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* B 병원 상세 */}
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold">{hospital.name}</h1>
          <div className="mb-4 flex items-center gap-2">
            <Badge>{hospital.department}</Badge>
            {hospital.isAiRecommended && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                AI 추천
              </Badge>
            )}
          </div>
          <div className="space-y-3">
            <InfoRow
              icon={<MapPin className="h-5 w-5" />}
              label="주소"
              value={hospital.address}
            />
            <InfoRow
              icon={<Phone className="h-5 w-5" />}
              label="전화번호"
              value={hospital.phone}
            />
            <InfoRow
              icon={<Stethoscope className="h-5 w-5" />}
              label="진료과목"
              value={hospital.department}
            />
          </div>
        </div>

        {/* C 행동 버튼 */}
        <div className="mb-6 flex gap-3">
          <Button className="flex-1 rounded-full py-6" asChild>
            <a href={`tel:${hospital.phone}`}>
              <Phone className="mr-2 h-5 w-5" />
              전화하기
            </a>
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full py-6"
            asChild
          >
            <a
              href={`nmap://route/public?dlat=${hospital.lat}&dlng=${hospital.lng}&dname=${encodeURIComponent(hospital.name)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation className="mr-2 h-5 w-5" />
              길찾기
            </a>
          </Button>
          <BookmarkButton
            type="hospital"
            id={hospital.id}
            name={hospital.name}
            address={hospital.address}
            phone={hospital.phone}
            category={hospital.department || hospital.clCdNm || ""}
            lat={hospital.lat}
            lng={hospital.lng}
            size="md"
            className="rounded-full py-6"
          />
        </div>

        {/* D AI 방문 팁 */}
        {result.visitTip && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex gap-3 p-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="mb-1 text-sm font-semibold text-primary">
                  편하루 AI 방문 팁
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {result.visitTip}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Helper ───
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
export default function SymptomTab() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>로딩 중...</p>
        </div>
      }
    >
      <SymptomContent />
    </Suspense>
  );
}
