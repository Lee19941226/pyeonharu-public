"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    naver: any;
  }
}

// 기존 symptom 페이지에서 사용하는 마커 타입
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  isAiRecommended?: boolean;
}

interface NaverMapProps {
  // 기존 symptom 페이지용 props
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  fitBounds?: boolean;
  onMarkerClick?: (id: string) => void;

  // search 페이지용 props (하위 호환)
  places?: Array<{
    id: string;
    name: string;
    type: "hospital" | "pharmacy";
    lat: number;
    lng: number;
  }>;
  selectedPlace?: { id: string; lat: number; lng: number } | null;
  onSelectPlace?: (place: unknown) => void;

  // 공통 props
  userLocation?: { lat: number; lng: number } | null;
  height?: string;
}

export function NaverMap({
  markers = [],
  center,
  zoom = 14,
  fitBounds = false,
  onMarkerClick,
  places = [],
  selectedPlace,
  onSelectPlace,
  userLocation = null,
  height = "100%",
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 네이버 지도 스크립트 로드
  useEffect(() => {
    const NAVER_CLIENT_ID =
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "4q5sd2kb26";

    if (window.naver && window.naver.maps) {
      setIsMapLoaded(true);
      setIsLoading(false);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}`;
    script.async = true;
    script.onload = () => {
      setIsMapLoaded(true);
      setIsLoading(false);
    };
    script.onerror = () => {
      console.error("네이버 지도 로드 실패");
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  // 중심 좌표 계산
  const centerLat = center?.lat ?? userLocation?.lat ?? 37.5665;
  const centerLng = center?.lng ?? userLocation?.lng ?? 126.978;

  // 지도 초기화
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.naver) return;

    const mapCenter = new window.naver.maps.LatLng(centerLat, centerLng);

    const mapOptions: any = {
      center: mapCenter,
      zoom: zoom,
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
  }, [isMapLoaded, centerLat, centerLng, zoom]);

  // 사용자 위치 마커
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !window.naver ||
      !isMapLoaded ||
      !userLocation
    )
      return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    userMarkerRef.current = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(
        userLocation.lat,
        userLocation.lng,
      ),
      map: mapInstanceRef.current,
      icon: {
        content: `
          <div style="
            width: 20px;
            height: 20px;
            background: #f97316;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        anchor: new window.naver.maps.Point(10, 10),
      },
    });
  }, [userLocation, isMapLoaded]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver || !isMapLoaded) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const markerData =
      markers.length > 0
        ? markers
        : places.map((p) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            label: p.name,
            isAiRecommended: false,
            type: p.type,
          }));

    if (markerData.length === 0) return;

    const bounds = new window.naver.maps.LatLngBounds(
      new window.naver.maps.LatLng(90, 180),
      new window.naver.maps.LatLng(-90, -180),
    );

    markerData.forEach((item, index) => {
      if (!item.lat || !item.lng) return;

      const position = new window.naver.maps.LatLng(item.lat, item.lng);
      bounds.extend(position);

      const isRecommended = "isAiRecommended" in item && item.isAiRecommended;
      const isPharmacy = "type" in item && item.type === "pharmacy";
      const bgColor = isRecommended
        ? "#22c55e"
        : isPharmacy
          ? "#3b82f6"
          : "#22c55e";

      const marker = new window.naver.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        icon: {
          content: `
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
            ">
              <div style="
                width: 32px;
                height: 32px;
                background: ${bgColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 2px solid white;
                cursor: pointer;
                color: white;
                font-size: 12px;
                font-weight: bold;
              ">
                ${isRecommended ? "★" : index + 1}
              </div>
              <div style="
                margin-top: 4px;
                padding: 2px 6px;
                background: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                white-space: nowrap;
                max-width: 100px;
                overflow: hidden;
                text-overflow: ellipsis;
              ">
                ${item.label || ""}
              </div>
            </div>
          `,
          anchor: new window.naver.maps.Point(16, 50),
        },
      });

      window.naver.maps.Event.addListener(marker, "click", () => {
        if (onMarkerClick) {
          onMarkerClick(item.id);
        }
        if (onSelectPlace && places.length > 0) {
          const place = places.find((p) => p.id === item.id);
          if (place) onSelectPlace(place);
        }
        mapInstanceRef.current?.panTo(position);
      });

      markersRef.current.push(marker);
    });

    if (fitBounds && markerData.length > 0) {
      if (userLocation) {
        bounds.extend(
          new window.naver.maps.LatLng(userLocation.lat, userLocation.lng),
        );
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
        }
      }, 100);
    }
  }, [
    markers,
    places,
    onMarkerClick,
    onSelectPlace,
    isMapLoaded,
    fitBounds,
    userLocation,
  ]);

  // 선택된 장소 변경 시 지도 이동
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPlace || !window.naver) return;
    if (!selectedPlace.lat || !selectedPlace.lng) return;

    mapInstanceRef.current.panTo(
      new window.naver.maps.LatLng(selectedPlace.lat, selectedPlace.lng),
    );
  }, [selectedPlace]);

  // 현재 위치로 이동
  const handleMoveToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current && window.naver) {
          mapInstanceRef.current.panTo(
            new window.naver.maps.LatLng(latitude, longitude),
          );
        }
      },
      (error) => {
        console.error("위치 정보를 가져올 수 없습니다:", error);
      },
    );
  }, []);

  if (isLoading) {
    return (
      <div
        className="relative w-full bg-muted flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!isMapLoaded) {
    return (
      <div
        className="relative w-full bg-muted flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center p-4">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">
            지도를 불러올 수 없습니다
          </h3>
          <p className="text-sm text-muted-foreground">
            네이버 지도 API 연결에 실패했습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{ height }}
    >
      <div ref={mapRef} className="h-full w-full" />

      {/* 현재 위치 버튼 */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg z-10"
        onClick={handleMoveToCurrentLocation}
      >
        <Navigation className="h-4 w-4" />
        <span className="sr-only">내 위치로 이동</span>
      </Button>
    </div>
  );
}
