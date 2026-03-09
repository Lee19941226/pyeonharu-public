"use client";

import { useState, useEffect, createContext, useContext } from "react";

interface GeoRegion {
  region: string; // "서울특별시 구로구" 등
  source: "gps" | "ip" | "";
}

const defaultGeo: GeoRegion = { region: "", source: "" };

export const GeoRegionContext = createContext<GeoRegion>(defaultGeo);

export function useGeoRegion() {
  return useContext(GeoRegionContext);
}

/**
 * 앱 로드 시 1회 위치를 확보하여 시/구 단위 지역명으로 변환.
 * 위치 권한이 있으면 GPS 기반, 없으면 빈 값 (서버에서 IP 폴백).
 */
export function useGeoRegionResolver(): GeoRegion {
  const [geo, setGeo] = useState<GeoRegion>(defaultGeo);

  useEffect(() => {
    if (!navigator.geolocation) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        try {
          const res = await fetch(
            `/api/restaurant/reverse-geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.success && !cancelled) {
              const region = data.full || data.address || "";
              setGeo({ region, source: "gps" });
            }
          }
        } catch {
          // reverse-geocode 실패 시 무시 → IP 폴백
        }
      },
      () => {
        // 위치 권한 거부 → 빈 값 (서버에서 IP 폴백)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return geo;
}
