"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Building2, Cross } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Place } from "@/app/search/page";

declare global {
  interface Window {
    naver: any;
  }
}

interface NaverMapProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  userLocation: { lat: number; lng: number } | null;
}

export function NaverMap({
  places,
  selectedPlace,
  onSelectPlace,
  userLocation,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // 네이버 지도 스크립트 로드
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

    if (!clientId) {
      setMapError("네이버 지도 API 키가 설정되지 않았습니다.");
      return;
    }

    // 이미 로드된 경우
    if (window.naver && window.naver.maps) {
      setIsMapLoaded(true);
      return;
    }

    // 스크립트 로드
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = () => {
      setIsMapLoaded(true);
    };
    script.onerror = () => {
      setMapError("네이버 지도를 로드하는데 실패했습니다.");
    };
    document.head.appendChild(script);

    return () => {
      // 클린업 시 스크립트 제거하지 않음 (재사용을 위해)
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.naver) return;

    const defaultCenter = userLocation
      ? new window.naver.maps.LatLng(userLocation.lat, userLocation.lng)
      : new window.naver.maps.LatLng(37.5665, 126.978); // 서울 시청

    const mapOptions = {
      center: defaultCenter,
      zoom: 14,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.TOP_RIGHT,
      },
    };

    mapInstanceRef.current = new window.naver.maps.Map(
      mapRef.current,
      mapOptions,
    );
  }, [isMapLoaded, userLocation]);

  // 사용자 위치 마커
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !window.naver) return;

    // 기존 사용자 마커 제거
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // 사용자 위치 마커 생성
    userMarkerRef.current = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(
        userLocation.lat,
        userLocation.lng,
      ),
      map: mapInstanceRef.current,
      icon: {
        content: `
          <div style="
            width: 24px;
            height: 24px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        anchor: new window.naver.maps.Point(12, 12),
      },
    });
  }, [userLocation, isMapLoaded]);

  // 장소 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver) return;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // 새 마커 생성
    places.forEach((place) => {
      const isSelected = selectedPlace?.id === place.id;
      const isHospital = place.type === "hospital";
      const bgColor = isHospital ? "#3b82f6" : "#22c55e";
      const selectedBorder = isSelected ? "3px solid #000" : "2px solid white";

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(place.lat, place.lng),
        map: mapInstanceRef.current,
        icon: {
          content: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${isSelected ? "40px" : "32px"};
              height: ${isSelected ? "40px" : "32px"};
              background: ${bgColor};
              border: ${selectedBorder};
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
              transition: all 0.2s;
            ">
              <svg width="${isSelected ? "20" : "16"}" height="${isSelected ? "20" : "16"}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${
                  isHospital
                    ? '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'
                    : '<path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>'
                }
              </svg>
            </div>
          `,
          anchor: new window.naver.maps.Point(
            isSelected ? 20 : 16,
            isSelected ? 20 : 16,
          ),
        },
      });

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, "click", () => {
        onSelectPlace(place);
      });

      markersRef.current.push(marker);
    });
  }, [places, selectedPlace, isMapLoaded, onSelectPlace]);

  // 선택된 장소로 지도 이동
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPlace || !window.naver) return;

    const position = new window.naver.maps.LatLng(
      selectedPlace.lat,
      selectedPlace.lng,
    );
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(16);
  }, [selectedPlace]);

  // 현재 위치로 이동
  const moveToCurrentLocation = () => {
    if (!mapInstanceRef.current || !userLocation || !window.naver) return;

    const position = new window.naver.maps.LatLng(
      userLocation.lat,
      userLocation.lng,
    );
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);
  };

  // 에러 상태
  if (mapError) {
    return (
      <div className="relative h-full w-full bg-muted">
        <div className="flex h-full flex-col items-center justify-center p-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <MapPin className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            지도를 불러올 수 없습니다
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* 지도 컨테이너 */}
      <div ref={mapRef} className="h-full w-full" />

      {/* 로딩 상태 */}
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              지도를 불러오는 중...
            </p>
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="absolute left-4 top-4 flex gap-2 rounded-lg bg-background/95 p-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-1 text-xs">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
            <Building2 className="h-3 w-3 text-white" />
          </div>
          <span>병원</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
            <Cross className="h-3 w-3 text-white" />
          </div>
          <span>약국</span>
        </div>
      </div>

      {/* 현재 위치 버튼 */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        onClick={moveToCurrentLocation}
        disabled={!userLocation}
      >
        <Navigation className="h-5 w-5" />
        <span className="sr-only">내 위치로 이동</span>
      </Button>

      {/* 선택된 장소 정보 카드 */}
      {selectedPlace && (
        <div className="absolute bottom-20 left-4 right-4 rounded-lg bg-background p-4 shadow-lg md:left-auto md:right-4 md:w-80">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                selectedPlace.type === "hospital"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-green-100 text-green-600"
              }`}
            >
              {selectedPlace.type === "hospital" ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <Cross className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{selectedPlace.name}</h4>
              <p className="text-sm text-muted-foreground">
                {selectedPlace.address}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedPlace.phone}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    selectedPlace.isOpen
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {selectedPlace.isOpen ? "영업중" : "영업종료"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedPlace.openTime} - {selectedPlace.closeTime}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onSelectPlace(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
