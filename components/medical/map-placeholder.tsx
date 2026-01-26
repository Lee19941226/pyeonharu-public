"use client";

import { MapPin, Building2, Cross, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Place } from "@/app/search/page";
import { useEffect, useRef } from "react";

interface MapPlaceholderProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  userLocation: { lat: number; lng: number } | null;
}

export function MapPlaceholder({
  places,
  selectedPlace,
  onSelectPlace,
  userLocation,
}: MapPlaceholderProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const naverMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // 네이버 지도 API 로딩 대기
    const initMap = () => {
      if (!mapRef.current || !window.naver || !window.naver.maps) return;

      // 지도 초기화
      const mapOptions = {
        center: new window.naver.maps.LatLng(
          userLocation?.lat || 37.5665,
          userLocation?.lng || 126.978,
        ),
        zoom: 15,
      };

      naverMapRef.current = new window.naver.maps.Map(
        mapRef.current,
        mapOptions,
      );

      // 마커 생성
      markersRef.current = places.map((place) => {
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(place.lat, place.lng),
          map: naverMapRef.current,
          title: place.name,
        });

        // 마커 클릭 이벤트
        window.naver.maps.Event.addListener(marker, "click", () => {
          onSelectPlace(place);
        });

        return marker;
      });
    };

    // 네이버 지도 API가 로드될 때까지 대기
    if (window.naver && window.naver.maps) {
      initMap();
    } else {
      const checkInterval = setInterval(() => {
        if (window.naver && window.naver.maps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);

      return () => {
        clearInterval(checkInterval);
        markersRef.current.forEach((marker) => marker.setMap(null));
      };
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
    };
  }, [places, userLocation, onSelectPlace]);

  // 선택된 장소로 지도 이동
  useEffect(() => {
    if (selectedPlace && naverMapRef.current) {
      naverMapRef.current.setCenter(
        new window.naver.maps.LatLng(selectedPlace.lat, selectedPlace.lng),
      );
      naverMapRef.current.setZoom(17);
    }
  }, [selectedPlace]);

  const handleMyLocation = () => {
    if (
      navigator.geolocation &&
      naverMapRef.current &&
      window.naver &&
      window.naver.maps
    ) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        naverMapRef.current.setCenter(
          new window.naver.maps.LatLng(latitude, longitude),
        );
        naverMapRef.current.setZoom(16);
      });
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* 지도 컨테이너 */}
      <div ref={mapRef} className="h-full w-full" />

      {/* 내 위치 버튼 */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        onClick={handleMyLocation}
      >
        <Navigation className="h-5 w-5" />
        <span className="sr-only">내 위치로 이동</span>
      </Button>
    </div>
  );
}
