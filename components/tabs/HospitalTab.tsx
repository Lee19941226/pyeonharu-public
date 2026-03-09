"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NaverMap } from "@/components/medical/naver-map";
import { SearchFilters } from "@/components/medical/search-filters";
import { PlaceList } from "@/components/medical/place-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map, List, Loader2, RefreshCw, Search, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export type PlaceType = "hospital" | "pharmacy";
export type ViewMode = "map" | "list";
type LocationSource = "gps" | "ip" | "default" | "manual";

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  address: string;
  phone: string;
  distance: string;
  distanceMeters: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  departments?: string[];
  lat: number;
  lng: number;
}

// ── 모듈 레벨 캐시 (SPA 내비게이션 간 유지, 5분 TTL) ──
const CACHE_TTL = 5 * 60 * 1000;
const placesCache: Record<string, { data: Place[]; ts: number }> = {};

function zoomToRadius(zoom: number): number {
  if (zoom >= 16) return 500;
  if (zoom === 15) return 1000;
  if (zoom === 14) return 2000;
  if (zoom === 13) return 3000;
  if (zoom === 12) return 5000;
  if (zoom === 11) return 8000;
  if (zoom === 10) return 12000;
  return 20000;
}

const RADIUS_STEPS = [500, 1000, 2000, 3000, 5000, 8000, 12000, 16000, 20000, 30000] as const;

function snapRadiusToStep(radiusMeters: number): number {
  const clamped = Math.max(300, Math.min(30000, Math.round(radiusMeters)));
  const matched = RADIUS_STEPS.find((step) => step >= clamped);
  return matched ?? 30000;
}

export default function HospitalTab() {
  const [isDesktopClient, setIsDesktopClient] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [placeType, setPlaceType] = useState<PlaceType | "all">("all");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [mapRadius, setMapRadius] = useState<number>(zoomToRadius(14));
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationSource, setLocationSource] = useState<LocationSource>("default");
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [listPage, setListPage] = useState(1);
  const hasLoadedOnce = useRef(false);
  const viewportFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);

  const stopLocationWatch = useCallback(() => {
    if (!navigator.geolocation || locationWatchIdRef.current == null) return;
    navigator.geolocation.clearWatch(locationWatchIdRef.current);
    locationWatchIdRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isMobileLike = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    setIsDesktopClient(!isMobileLike);
  }, []);


  const resolveBestLocation = useCallback(
    async (options?: { targetAccuracy?: number; maxWaitMs?: number }) => {
      const targetAccuracy = options?.targetAccuracy ?? 35;
      const maxWaitMs = options?.maxWaitMs ?? 9000;

      if (!navigator.geolocation) {
        throw new Error("geolocation_not_supported");
      }

      return await new Promise<{ lat: number; lng: number; accuracy: number }>((resolve, reject) => {
        let best: { lat: number; lng: number; accuracy: number } | null = null;
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const finish = (
          result?: { lat: number; lng: number; accuracy: number },
          err?: GeolocationPositionError | Error,
        ) => {
          if (settled) return;
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          stopLocationWatch();
          if (result) resolve(result);
          else if (err) reject(err);
          else reject(new Error("geolocation_failed"));
        };

        locationWatchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const current = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy ?? 9999,
            };
            if (!best || current.accuracy < best.accuracy) best = current;
            if (current.accuracy <= targetAccuracy) finish(current);
          },
          (error) => {
            if (best) {
              finish(best);
              return;
            }
            finish(undefined, error);
          },
          { enableHighAccuracy: true, timeout: maxWaitMs, maximumAge: 0 },
        );

        timeoutId = setTimeout(() => {
          if (best) {
            finish(best);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => {
              finish({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy ?? 9999,
              });
            },
            (error) => finish(undefined, error),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
          );
        }, maxWaitMs);
      });
    },
    [stopLocationWatch],
  );

  const resolveReverseGeocodeName = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/restaurant/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (!res.ok) return;
      const data = await res.json();
      const resolved =
        data?.address || data?.full || [data?.sigungu, data?.dong].filter(Boolean).join(" ");
      if (resolved && typeof resolved === "string") {
        setLocationName(resolved);
      }
    } catch {
      // 위치명 조회 실패는 치명적이지 않으므로 무시
    }
  }, []);

  const resolveIpFallbackLocation = useCallback(async () => {
    const res = await fetch("/api/location/ip", { cache: "no-store" });
    if (!res.ok) throw new Error("ip_fallback_failed");
    const data = await res.json();
    if (!data?.success || typeof data.lat !== "number" || typeof data.lng !== "number") {
      throw new Error("ip_fallback_invalid");
    }
    return data as {
      lat: number;
      lng: number;
      accuracy?: number;
      regionLabel?: string;
      source?: string;
    };
  }, []);

  // 현재 위치 가져오기
  useEffect(() => {
    let cancelled = false;
    resolveBestLocation()
      .then((loc) => {
        if (cancelled) return;
        setUserLocation({ lat: loc.lat, lng: loc.lng });
        setLocationSource("gps");
        setLocationAccuracy(Math.max(1, Math.round(loc.accuracy)));
        void resolveReverseGeocodeName(loc.lat, loc.lng);
      })
      .catch(async () => {
        if (cancelled) return;
        try {
          const ipLoc = await resolveIpFallbackLocation();
          if (cancelled) return;
          setUserLocation({ lat: ipLoc.lat, lng: ipLoc.lng });
          setLocationSource("ip");
          setLocationAccuracy(
            typeof ipLoc.accuracy === "number" ? Math.max(1, Math.round(ipLoc.accuracy)) : null,
          );
          if (ipLoc.regionLabel) {
            setLocationName(ipLoc.regionLabel);
          } else {
            void resolveReverseGeocodeName(ipLoc.lat, ipLoc.lng);
          }
        } catch {
          if (cancelled) return;
          setUserLocation({ lat: 37.5665, lng: 126.978 });
          setLocationSource("default");
          setLocationAccuracy(null);
          setLocationName("서울시청(기본 위치)");
        }
      });

    return () => {
      cancelled = true;
      stopLocationWatch();
    };
  }, [resolveBestLocation, resolveIpFallbackLocation, resolveReverseGeocodeName, stopLocationWatch]);

  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      if (!lat2 || !lng2 || lat2 === 0 || lng2 === 0) return 9999;
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [],
  );

  const checkIsOpen = useCallback((): boolean => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    return day !== 0 && hour >= 9 && hour < 18;
  }, []);

  const handleViewportChange = useCallback(
    (viewport: { center: { lat: number; lng: number }; zoom: number; radiusMeters: number }) => {
      setMapCenter(viewport.center);
      setMapZoom(viewport.zoom);

      const zoomBasedRadius = zoomToRadius(viewport.zoom);
      const viewportRadius = Math.max(300, Math.round(viewport.radiusMeters));
      const stagedRadius = snapRadiusToStep(Math.max(zoomBasedRadius, viewportRadius));

      setMapRadius((prev) => (prev === stagedRadius ? prev : stagedRadius));
    },
    [],
  );

  const searchByAddress = async () => {
    if (!addressInput.trim()) return;
    setIsGeocodingAddress(true);
    try {
      const res = await fetch(`/api/restaurant/geocode?q=${encodeURIComponent(addressInput.trim())}`);
      const data = await res.json();
      if (data.success) {
        setUserLocation({ lat: data.lat, lng: data.lng });
        setMapCenter({ lat: data.lat, lng: data.lng });
        setLocationName(data.name);
        setLocationSource("manual");
        setLocationAccuracy(null);
        setAddressInput("");
      } else {
        toast.error(data.error || "해당 지역을 찾을 수 없어요");
      }
    } catch {
      toast.error("주소 검색에 실패했습니다");
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const skipCacheRef = useRef(false);

  const fetchPlaces = useCallback(async () => {
    const searchCenter = mapCenter ?? userLocation;
    if (!searchCenter) return;

    const distanceBase = userLocation ?? searchCenter;

    const searchRadius = snapRadiusToStep(Math.max(mapRadius || 0, zoomToRadius(mapZoom)));
    const cacheKey = `${searchCenter.lat.toFixed(4)}::${searchCenter.lng.toFixed(4)}::${searchRadius}::${placeType}`;

    if (!skipCacheRef.current) {
      const cached = placesCache[cacheKey];
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setPlaces(cached.data);
        setIsLoading(false);
        hasLoadedOnce.current = true;
        if (cached.data.length === 0) setError("주변에 검색된 병원/약국이 없습니다.");
        else setError(null);
        return;
      }
    }
    skipCacheRef.current = false;

    if (!hasLoadedOnce.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const results: Place[] = [];

      if (placeType === "all" || placeType === "hospital") {
        try {
          const hospitalRes = await fetch(
            `/api/hospitals?lat=${searchCenter.lat}&lng=${searchCenter.lng}&radius=${searchRadius}`,
          );
          if (hospitalRes.ok) {
            const hospitalData = await hospitalRes.json();
            const hospitalList =
              hospitalData.hospitals ||
              hospitalData.items ||
              hospitalData.data ||
              [];

            if (Array.isArray(hospitalList)) {
              hospitalList.forEach((h: Record<string, unknown>) => {
                const lat =
                  Number(h.YPos) ||
                  Number(h.yPos) ||
                  Number(h.latitude) ||
                  Number(h.lat) ||
                  Number(h.wgs84Lat) ||
                  0;
                const lng =
                  Number(h.XPos) ||
                  Number(h.xPos) ||
                  Number(h.longitude) ||
                  Number(h.lng) ||
                  Number(h.wgs84Lon) ||
                  0;

                if (lat === 0 || lng === 0) return;

                const dist = calculateDistance(
                  distanceBase.lat,
                  distanceBase.lng,
                  lat,
                  lng,
                );

                const name = String(
                  h.yadmNm ||
                    h.dutyName ||
                    h.hospNm ||
                    h.name ||
                    h.bizplcNm ||
                    "",
                );
                if (!name) return;

                results.push({
                  id: String(
                    h.ykiho || h.hpid || h.hospId || h.id || Math.random(),
                  ),
                  name,
                  type: "hospital" as PlaceType,
                  address: String(
                    h.addr || h.dutyAddr || h.address || h.roadAddr || "",
                  ),
                  phone: String(
                    h.telno || h.dutyTel1 || h.phone || h.tel || "",
                  ),
                  distance:
                    dist < 1
                      ? `${Math.round(dist * 1000)}m`
                      : `${dist.toFixed(1)}km`,
                  distanceMeters: Math.max(1, Math.round(dist * 1000)),
                  isOpen: checkIsOpen(),
                  openTime: "09:00",
                  closeTime: "18:00",
                  departments: h.dgsbjtCdNm
                    ? [String(h.dgsbjtCdNm)]
                    : h.clCdNm
                      ? [String(h.clCdNm)]
                      : [],
                  lat,
                  lng,
                });
              });
            }
          }
        } catch (e) {
          console.error("병원 API 에러:", e);
        }
      }

      if (placeType === "all" || placeType === "pharmacy") {
        try {
          const pharmacyRes = await fetch(
            `/api/pharmacies?lat=${searchCenter.lat}&lng=${searchCenter.lng}&radius=${searchRadius}`,
          );
          if (pharmacyRes.ok) {
            const pharmacyData = await pharmacyRes.json();
            const pharmacyList =
              pharmacyData.pharmacies ||
              pharmacyData.items ||
              pharmacyData.data ||
              [];

            if (Array.isArray(pharmacyList)) {
              pharmacyList.forEach((p: Record<string, unknown>) => {
                const lat =
                  Number(p.wgs84Lat) ||
                  Number(p.YPos) ||
                  Number(p.latitude) ||
                  Number(p.lat) ||
                  0;
                const lng =
                  Number(p.wgs84Lon) ||
                  Number(p.XPos) ||
                  Number(p.longitude) ||
                  Number(p.lng) ||
                  0;

                if (lat === 0 || lng === 0) return;

                const dist = calculateDistance(
                  distanceBase.lat,
                  distanceBase.lng,
                  lat,
                  lng,
                );

                const name = String(
                  p.dutyName || p.yadmNm || p.name || p.bizplcNm || "",
                );
                if (!name) return;

                results.push({
                  id: String(p.hpid || p.ykiho || p.id || Math.random()),
                  name,
                  type: "pharmacy" as PlaceType,
                  address: String(p.dutyAddr || p.addr || p.address || ""),
                  phone: String(p.dutyTel1 || p.telno || p.phone || ""),
                  distance:
                    dist < 1
                      ? `${Math.round(dist * 1000)}m`
                      : `${dist.toFixed(1)}km`,
                  distanceMeters: Math.max(1, Math.round(dist * 1000)),
                  isOpen: checkIsOpen(),
                  openTime: "09:00",
                  closeTime: "21:00",
                  lat,
                  lng,
                });
              });
            }
          }
        } catch (e) {
          console.error("약국 API 에러:", e);
        }
      }

      results.sort((a, b) => a.distanceMeters - b.distanceMeters);

      setPlaces(results);
      hasLoadedOnce.current = true;
      placesCache[cacheKey] = { data: results, ts: Date.now() };

      if (results.length === 0) {
        setError("주변에 검색된 병원/약국이 없습니다.");
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      setError("데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);

    }
  }, [userLocation, mapCenter, mapZoom, mapRadius, placeType, calculateDistance, checkIsOpen]);

  useEffect(() => {
    if (!userLocation) return;

    if (!hasLoadedOnce.current) {
      fetchPlaces();
      return;
    }

    if (viewportFetchTimeoutRef.current) {
      clearTimeout(viewportFetchTimeoutRef.current);
    }

    viewportFetchTimeoutRef.current = setTimeout(() => {
      fetchPlaces();
    }, 300);

    return () => {
      if (viewportFetchTimeoutRef.current) {
        clearTimeout(viewportFetchTimeoutRef.current);
      }
    };
  }, [userLocation, mapCenter, mapZoom, mapRadius, placeType, fetchPlaces]);

  // 새로고침: GPS 재요청 + 캐시 무시
  const handleRefresh = useCallback(() => {
    skipCacheRef.current = true;
    setMapCenter(null);
    resolveBestLocation({ targetAccuracy: 25, maxWaitMs: 10000 })
      .then((loc) => {
        setUserLocation({ lat: loc.lat, lng: loc.lng });
        setLocationSource("gps");
        setLocationAccuracy(Math.max(1, Math.round(loc.accuracy)));
        setLocationName("");
        void resolveReverseGeocodeName(loc.lat, loc.lng);
        if (loc.accuracy > 80) {
          toast.info("GPS 정확도가 낮아 실내/지하에서 위치 오차가 생길 수 있어요");
        }
      })
      .catch(async () => {
        try {
          const ipLoc = await resolveIpFallbackLocation();
          setUserLocation({ lat: ipLoc.lat, lng: ipLoc.lng });
          setLocationSource("ip");
          setLocationAccuracy(
            typeof ipLoc.accuracy === "number" ? Math.max(1, Math.round(ipLoc.accuracy)) : null,
          );
          if (ipLoc.regionLabel) {
            setLocationName(ipLoc.regionLabel);
          } else {
            setLocationName("");
            void resolveReverseGeocodeName(ipLoc.lat, ipLoc.lng);
          }
          toast.info("위치 권한이 제한되어 IP 기반 대략 위치로 표시했어요");
        } catch {
          // 최종 실패 시 현재 위치 그대로 재검색
          fetchPlaces();
          toast.error("위치를 갱신하지 못해 현재 기준으로 다시 검색했어요");
        }
      });
  }, [fetchPlaces, resolveBestLocation, resolveIpFallbackLocation, resolveReverseGeocodeName]);

  const handleDesktopPreciseRetry = useCallback(() => {
    skipCacheRef.current = true;
    resolveBestLocation({ targetAccuracy: 25, maxWaitMs: 12000 })
      .then((loc) => {
        setUserLocation({ lat: loc.lat, lng: loc.lng });
        setMapCenter({ lat: loc.lat, lng: loc.lng });
        setLocationSource("gps");
        setLocationAccuracy(Math.max(1, Math.round(loc.accuracy)));
        setLocationName("");
        void resolveReverseGeocodeName(loc.lat, loc.lng);
        if (loc.accuracy > 120) {
          toast.info("데스크탑 환경에서는 위치 오차가 클 수 있어 주소 입력으로 보정해 주세요");
        } else {
          toast.success("위치를 다시 가져왔어요");
        }
      })
      .catch(() => {
        toast.info("정확 위치를 가져오지 못했어요. 주소 입력으로 위치를 지정해 주세요");
      });
  }, [resolveBestLocation, resolveReverseGeocodeName]);

  const showDesktopPrecisionCta =
    isDesktopClient &&
    (locationSource === "ip" ||
      locationSource === "default" ||
      (locationSource === "gps" && (locationAccuracy ?? 9999) > 120));


  // 필터링: 영업 중 + 검색어
  const filteredPlaces = places.filter((place) => {
    if (showOpenOnly && !place.isOpen) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = place.name.toLowerCase().includes(q);
      const addrMatch = place.address.toLowerCase().includes(q);
      const deptMatch = place.departments?.some((d) =>
        d.toLowerCase().includes(q),
      );
      if (!nameMatch && !addrMatch && !deptMatch) return false;
    }
    return true;
  });

  // 페이징
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / PAGE_SIZE));
  const safeListPage = Math.min(listPage, totalPages);
  const pagedPlaces = filteredPlaces.slice((safeListPage - 1) * PAGE_SIZE, safeListPage * PAGE_SIZE);

  // 필터/검색 변경 시 페이지 리셋
  useEffect(() => {
    setListPage(1);
  }, [searchQuery, showOpenOnly, placeType, places]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <div>
        {/* Search Header */}
        <div className="border-b border-border bg-card rounded-lg">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">내 주변 병원/약국</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                />
                새로고침
              </Button>
            </div>

            {/* 기준 위치 설정 */}
            <div className="mb-3 rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                {locationName ? (
                  <span className="text-xs font-medium text-foreground truncate flex-1">{locationName}</span>
                ) : (
                  <span className="text-xs text-muted-foreground flex-1">현재 위치 기준</span>
                )}
                {locationSource === "gps" && (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    GPS{locationAccuracy ? ` ±${locationAccuracy}m` : ""}
                  </span>
                )}
                {locationSource === "ip" && (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    IP 기반(대략)
                  </span>
                )}
                {locationSource === "default" && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    기본 위치
                  </span>
                )}
                {locationSource === "manual" && (
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                    직접 지정
                  </span>
                )}
              </div>
              {showDesktopPrecisionCta && (
                <div className="mt-1.5 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                  <p className="pr-2 text-[11px] text-amber-800">
                    데스크탑에서는 위치 오차가 클 수 있어요
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 border-amber-300 bg-white px-2 text-[11px] text-amber-900 hover:bg-amber-100"
                    onClick={handleDesktopPreciseRetry}
                  >
                    정확 위치 재시도
                  </Button>
                </div>
              )}
              <div className="mt-1.5 flex gap-1">
                <Input
                  placeholder="시/구/동 (예: 강남)"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchByAddress()}
                  className="h-7 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 text-xs px-2"
                  onClick={searchByAddress}
                  disabled={isGeocodingAddress || !addressInput.trim()}
                >
                  {isGeocodingAddress ? <Loader2 className="h-3 w-3 animate-spin" /> : "이동"}
                </Button>
              </div>
            </div>

            {/* 검색창 */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="병원, 약국, 진료과목 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  지우기
                </button>
              )}
            </div>

            <SearchFilters
              placeType={placeType}
              onPlaceTypeChange={setPlaceType}
              showOpenOnly={showOpenOnly}
              onShowOpenOnlyChange={setShowOpenOnly}
            />
          </div>
        </div>

        {/* View Toggle (Mobile) */}
        <div className="sticky top-16 z-40 border-b border-border bg-background p-2 md:hidden">
          <div className="flex gap-2">
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setViewMode("map")}
            >
              <Map className="mr-2 h-4 w-4" />
              지도
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setViewMode("list")}
            >
              <List className="mr-2 h-4 w-4" />
              목록
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="flex flex-col">
            {/* Map */}
            <div
              className={`relative h-[50vh] rounded-lg overflow-hidden ${
                viewMode === "list" ? "hidden md:block" : ""
              }`}
            >
              <NaverMap
                places={filteredPlaces}
                selectedPlace={selectedPlace}
                onSelectPlace={(place: any) => setSelectedPlace(place)}
                userLocation={userLocation}
                onViewportChange={handleViewportChange}
              />
            </div>

            {/* List */}
            <div
              className={`${
                viewMode === "map" ? "hidden md:block" : ""
              }`}
            >
              {error && filteredPlaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={handleRefresh} variant="outline">
                    다시 검색
                  </Button>
                </div>
              ) : (
                <>
                  <PlaceList
                    places={pagedPlaces}
                    selectedPlace={selectedPlace}
                    onSelectPlace={setSelectedPlace}
                  />
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={safeListPage <= 1}
                        onClick={() => setListPage((p) => p - 1)}
                      >
                        이전
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {safeListPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={safeListPage >= totalPages}
                        onClick={() => setListPage((p) => p + 1)}
                      >
                        다음
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




