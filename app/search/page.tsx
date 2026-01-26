"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NaverMap } from "@/components/medical/naver-map";
import { SearchFilters } from "@/components/medical/search-filters";
import { PlaceList } from "@/components/medical/place-list";
import { Button } from "@/components/ui/button";
import { Map, List } from "lucide-react";

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

// 샘플 데이터
const samplePlaces: Place[] = [
  {
    id: "1",
    name: "서울대학교병원",
    type: "hospital",
    address: "서울특별시 종로구 대학로 101",
    phone: "02-2072-2114",
    distance: "1.2km",
    isOpen: true,
    openTime: "08:30",
    closeTime: "17:30",
    departments: ["내과", "외과", "정형외과", "신경과"],
    lat: 37.5796,
    lng: 127.0003,
  },
  {
    id: "2",
    name: "연세세브란스병원",
    type: "hospital",
    address: "서울특별시 서대문구 연세로 50-1",
    phone: "02-2228-1114",
    distance: "2.5km",
    isOpen: true,
    openTime: "08:00",
    closeTime: "18:00",
    departments: ["내과", "소아과", "피부과"],
    lat: 37.5622,
    lng: 126.9408,
  },
  {
    id: "3",
    name: "온누리약국",
    type: "pharmacy",
    address: "서울특별시 종로구 대학로 85",
    phone: "02-745-1234",
    distance: "0.8km",
    isOpen: true,
    openTime: "09:00",
    closeTime: "21:00",
    lat: 37.5811,
    lng: 127.0012,
  },
  {
    id: "4",
    name: "건강약국",
    type: "pharmacy",
    address: "서울특별시 종로구 혜화로 12",
    phone: "02-765-5678",
    distance: "1.0km",
    isOpen: false,
    openTime: "09:00",
    closeTime: "18:00",
    lat: 37.5825,
    lng: 126.9988,
  },
  {
    id: "5",
    name: "삼성서울병원",
    type: "hospital",
    address: "서울특별시 강남구 일원로 81",
    phone: "02-3410-2114",
    distance: "5.3km",
    isOpen: true,
    openTime: "08:00",
    closeTime: "17:00",
    departments: ["내과", "외과", "안과", "이비인후과"],
    lat: 37.4881,
    lng: 127.0855,
  },
];

export default function SearchPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [placeType, setPlaceType] = useState<PlaceType | "all">("all");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    // 현재 위치 가져오기
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
    }
  }, []);

  const filteredPlaces = samplePlaces.filter((place) => {
    if (placeType !== "all" && place.type !== placeType) return false;
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
            <h1 className="mb-4 text-xl font-bold">내 주변 병원/약국</h1>
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

        {/* Content */}
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
              onSelectPlace={setSelectedPlace}
              userLocation={userLocation}
            />
          </div>

          {/* List */}
          <div
            className={`md:w-96 md:overflow-auto md:border-l md:border-border ${
              viewMode === "map" ? "hidden md:block" : ""
            }`}
          >
            <PlaceList
              places={filteredPlaces}
              selectedPlace={selectedPlace}
              onSelectPlace={setSelectedPlace}
            />
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
