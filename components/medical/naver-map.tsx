"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    naver: any;
  }
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  isAiRecommended?: boolean;
}

interface NaverMapProps {
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  fitBounds?: boolean;
  onMarkerClick?: (id: string) => void;
  places?: Array<{
    id: string;
    name: string;
    type: "hospital" | "pharmacy";
    lat: number;
    lng: number;
  }>;
  selectedPlace?: { id: string; lat: number; lng: number } | null;
  onSelectPlace?: (place: unknown) => void;
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
  const markerDataRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const NAVER_CLIENT_ID =
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "";

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

  const centerLat = center?.lat ?? userLocation?.lat ?? 37.5665;
  const centerLng = center?.lng ?? userLocation?.lng ?? 126.978;

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

  // ─── 마커 아이콘 생성 헬퍼 ───
  const createMarkerIcon = useCallback(
    (
      item: any,
      index: number,
      isSelected: boolean,
    ) => {
      const isRecommended = "isAiRecommended" in item && item.isAiRecommended;
      const isPharmacy = "type" in item && item.type === "pharmacy";

      // 선택 상태에 따라 색상/크기 변경
      const size = isSelected ? 44 : 32;
      const fontSize = isSelected ? 15 : 12;
      const labelFontSize = isSelected ? 13 : 11;
      const labelFontWeight = isSelected ? 700 : 500;

      let bgColor: string;
      if (isSelected) {
        bgColor = "#ef4444"; // 선택 시 빨간색
      } else if (isRecommended) {
        bgColor = "#22c55e";
      } else if (isPharmacy) {
        bgColor = "#3b82f6";
      } else {
        bgColor = "#22c55e";
      }

      const borderColor = isSelected ? "#fbbf24" : "white";
      const borderWidth = isSelected ? 3 : 2;
      const shadow = isSelected
        ? "0 4px 14px rgba(239,68,68,0.5)"
        : "0 2px 8px rgba(0,0,0,0.3)";
      const zIndex = isSelected ? 100 : 1;
      const animation = isSelected
        ? "animation: markerBounce 0.5s ease-out;"
        : "";

      return {
        content: `
          <style>
            @keyframes markerBounce {
              0% { transform: scale(0.8) translateY(8px); }
              50% { transform: scale(1.1) translateY(-4px); }
              100% { transform: scale(1) translateY(0); }
            }
          </style>
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: ${zIndex};
            ${animation}
          ">
            <div style="
              width: ${size}px;
              height: ${size}px;
              background: ${bgColor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: ${shadow};
              border: ${borderWidth}px solid ${borderColor};
              cursor: pointer;
              color: white;
              font-size: ${fontSize}px;
              font-weight: bold;
              transition: all 0.2s ease;
            ">
              ${isRecommended ? "★" : index + 1}
            </div>
            <div style="
              margin-top: 4px;
              padding: ${isSelected ? "3px 8px" : "2px 6px"};
              background: ${isSelected ? bgColor : "white"};
              color: ${isSelected ? "white" : "black"};
              border-radius: 4px;
              font-size: ${labelFontSize}px;
              font-weight: ${labelFontWeight};
              box-shadow: 0 1px 4px rgba(0,0,0,0.2);
              white-space: nowrap;
              max-width: ${isSelected ? "140px" : "100px"};
              overflow: hidden;
              text-overflow: ellipsis;
            ">
              ${item.label || ""}
            </div>
          </div>
        `,
        anchor: new window.naver.maps.Point(size / 2, size + 20),
      };
    },
    [],
  );

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

    markerDataRef.current = markerData;

    if (markerData.length === 0) return;

    const bounds = new window.naver.maps.LatLngBounds(
      new window.naver.maps.LatLng(90, 180),
      new window.naver.maps.LatLng(-90, -180),
    );

    markerData.forEach((item, index) => {
      if (!item.lat || !item.lng) return;

      const position = new window.naver.maps.LatLng(item.lat, item.lng);
      bounds.extend(position);

      const isSelected = selectedPlace?.id === item.id;

      const marker = new window.naver.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        icon: createMarkerIcon(item, index, isSelected),
        zIndex: isSelected ? 100 : 1,
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

    let fitBoundsTimer: ReturnType<typeof setTimeout> | null = null;

    if (fitBounds && markerData.length > 0) {
      if (userLocation) {
        bounds.extend(
          new window.naver.maps.LatLng(userLocation.lat, userLocation.lng),
        );
      }

      fitBoundsTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
        }
      }, 100);
    }

    return () => {
      if (fitBoundsTimer) clearTimeout(fitBoundsTimer);
    };
  }, [
    markers,
    places,
    selectedPlace,
    onMarkerClick,
    onSelectPlace,
    isMapLoaded,
    fitBounds,
    userLocation,
    createMarkerIcon,
  ]);

  // 선택된 장소 변경 시 지도 이동
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPlace || !window.naver) return;
    if (!selectedPlace.lat || !selectedPlace.lng) return;

    mapInstanceRef.current.panTo(
      new window.naver.maps.LatLng(selectedPlace.lat, selectedPlace.lng),
    );

    // 줌 레벨도 가까이
    const currentZoom = mapInstanceRef.current.getZoom();
    if (currentZoom < 15) {
      mapInstanceRef.current.setZoom(16, true);
    }
  }, [selectedPlace]);

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
