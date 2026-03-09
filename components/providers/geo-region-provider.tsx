"use client";

import { GeoRegionContext, useGeoRegionResolver } from "@/hooks/useGeoRegion";

export function GeoRegionProvider({ children }: { children: React.ReactNode }) {
  const geo = useGeoRegionResolver();
  return (
    <GeoRegionContext.Provider value={geo}>{children}</GeoRegionContext.Provider>
  );
}
