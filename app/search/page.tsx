"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NaverMap } from "@/components/medical/naver-map";
import { SearchFilters } from "@/components/medical/search-filters";
import { PlaceList } from "@/components/medical/place-list";
import { Button } from "@/components/ui/button";
import { Map, List, Loader2, RefreshCw } from "lucide-react";

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

export default function SearchPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [placeType, setPlaceType] = useState<PlaceType | "all">("all");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          // 기본 위치 (서울 시청)
          setUserLocation({ lat: 37.5665, lng: 126.978 });
        },
      );
    } else {
      setUserLocation({ lat: 37.5665, lng: 126.978 });
    }
  }, []);

  // 거리 계산 함수 (Haversine formula)
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      if (!lat2 || !lng2 || lat2 === 0 || lng2 === 0) return 9999;
      const R = 6371; // 지구 반지름 (km)
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

  // 영업 중 여부 확인
  const checkIsOpen = useCallback((): boolean => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0: 일요일
    // 평일 9시~18시를 영업시간으로 가정 (일요일 제외)
    return day !== 0 && hour >= 9 && hour < 18;
  }, []);

  // 병원/약국 데이터 가져오기
  const fetchPlaces = useCallback(async () => {
    if (!userLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      const results: Place[] = [];

      // 병원 데이터 가져오기
      if (placeType === "all" || placeType === "hospital") {
        try {
          const hospitalRes = await fetch(
            `/api/hospitals?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=3000`,
          );
          if (hospitalRes.ok) {
            const hospitalData = await hospitalRes.json();
            console.log("병원 API 응답:", hospitalData);

            // API 응답 구조에 맞게 파싱
            const hospitalList =
              hospitalData.hospitals ||
              hospitalData.items ||
              hospitalData.data ||
              [];

            if (Array.isArray(hospitalList)) {
              hospitalList.forEach((h: Record<string, unknown>) => {
                // 좌표 추출 (다양한 필드명 대응)
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

                // 좌표가 없으면 스킵
                if (lat === 0 || lng === 0) return;

                const dist = calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  lat,
                  lng,
                );

                // 이름 추출
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

      // 약국 데이터 가져오기
      if (placeType === "all" || placeType === "pharmacy") {
        try {
          const pharmacyRes = await fetch(
            `/api/pharmacies?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=3000`,
          );
          if (pharmacyRes.ok) {
            const pharmacyData = await pharmacyRes.json();
            console.log("약국 API 응답:", pharmacyData);

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
                  userLocation.lat,
                  userLocation.lng,
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

      // 거리순 정렬
      results.sort((a, b) => {
        const distA = parseFloat(a.distance);
        const distB = parseFloat(b.distance);
        return distA - distB;
      });

      setPlaces(results);

      if (results.length === 0) {
        setError("주변에 검색된 병원/약국이 없습니다.");
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      setError("데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, placeType, calculateDistance, checkIsOpen]);

  // 위치 또는 필터 변경 시 데이터 다시 가져오기
  useEffect(() => {
    if (userLocation) {
      fetchPlaces();
    }
  }, [userLocation, placeType, fetchPlaces]);

  // 필터링된 장소
  const filteredPlaces = places.filter((place) => {
    if (showOpenOnly && !place.isOpen) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        {/* Search Header */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
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
          <div className="flex flex-1 flex-col md:flex-row">
            {/* Map */}
            <div
              className={`h-[50vh] md:h-[calc(100vh-180px)] md:flex-1 ${
                viewMode === "list" ? "hidden md:block" : ""
              }`}
            >
              <NaverMap
                places={filteredPlaces}
                selectedPlace={selectedPlace}
                onSelectPlace={(place: any) => setSelectedPlace(place)}
                userLocation={userLocation}
              />
            </div>

            {/* List */}
            <div
              className={`md:w-96 md:overflow-auto md:border-l md:border-border ${
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
      </main>

      <MobileNav />
    </div>
  );
}
