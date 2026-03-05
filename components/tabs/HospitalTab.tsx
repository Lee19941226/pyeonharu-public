"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NaverMap } from "@/components/medical/naver-map";
import { SearchFilters } from "@/components/medical/search-filters";
import { PlaceList } from "@/components/medical/place-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map, List, Loader2, RefreshCw, Search } from "lucide-react";

export type PlaceType = "hospital" | "pharmacy";
export type ViewMode = "map" | "list";

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  address: string;
  phone: string;
  distance: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  departments?: string[];
  lat: number;
  lng: number;
}

function zoomToRadius(zoom: number): number {
  if (zoom >= 16) return 500;
  if (zoom === 15) return 1000;
  if (zoom === 14) return 2000;
  if (zoom === 13) return 3000;
  return 5000;
}

export default function HospitalTab() {
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
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const hasLoadedOnce = useRef(false);

  // 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setUserLocation({ lat: 37.5665, lng: 126.978 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      setUserLocation({ lat: 37.5665, lng: 126.978 });
    }
  }, []);

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

  const handleZoomChange = useCallback((zoom: number) => {
    setMapZoom(zoom);
  }, []);

  const handleCenterChange = useCallback((center: { lat: number; lng: number }) => {
    setMapCenter(center);
  }, []);

  const fetchPlaces = useCallback(async () => {
    const searchCenter = mapCenter ?? userLocation;
    if (!searchCenter) return;

    const searchRadius = zoomToRadius(mapZoom);

    if (!hasLoadedOnce.current) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
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
                  searchCenter.lat,
                  searchCenter.lng,
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
                  searchCenter.lat,
                  searchCenter.lng,
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

      results.sort((a, b) => {
        const distA = parseFloat(a.distance);
        const distB = parseFloat(b.distance);
        return distA - distB;
      });

      setPlaces(results);
      hasLoadedOnce.current = true;

      if (results.length === 0) {
        setError("주변에 검색된 병원/약국이 없습니다.");
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      setError("데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [userLocation, mapCenter, mapZoom, placeType, calculateDistance, checkIsOpen]);

  useEffect(() => {
    if (userLocation) {
      fetchPlaces();
    }
  }, [userLocation, placeType, fetchPlaces]);

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <div className="flex-1">
        {/* Search Header */}
        <div className="border-b border-border bg-card rounded-lg">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">내 주변 병원/약국</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPlaces}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                />
                새로고침
              </Button>
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              주변 병원/약국을 검색하는 중...
            </span>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="flex flex-1 flex-col">
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
                onZoomChange={handleZoomChange}
                onCenterChange={handleCenterChange}
              />
              {isRefetching && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20 pointer-events-none rounded-lg">
                  <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">재검색 중...</span>
                  </div>
                </div>
              )}
            </div>

            {/* List */}
            <div
              className={`max-h-[60vh] overflow-auto ${
                viewMode === "map" ? "hidden md:block" : ""
              }`}
            >
              {error && filteredPlaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={fetchPlaces} variant="outline">
                    다시 검색
                  </Button>
                </div>
              ) : (
                <PlaceList
                  places={filteredPlaces}
                  selectedPlace={selectedPlace}
                  onSelectPlace={setSelectedPlace}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
