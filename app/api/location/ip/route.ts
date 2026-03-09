import { NextRequest, NextResponse } from "next/server";

interface IpLocationResult {
  lat: number;
  lng: number;
  regionLabel?: string;
  accuracy?: number;
  source: "vercel_header" | "ip_lookup";
}

const DEFAULT_FALLBACK = {
  lat: 37.5665,
  lng: 126.978,
  regionLabel: "서울시청(기본 위치)",
};

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    xff ? xff.split(",")[0]?.trim() : null,
    req.headers.get("x-client-ip"),
    req.headers.get("true-client-ip"),
  ];

  for (const ip of candidates) {
    if (ip && ip.length > 0) return ip;
  }
  return null;
}

function isPublicIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  if (!normalized || normalized === "::1" || normalized === "localhost") return false;

  if (normalized.includes(":")) {
    // IPv6: 로컬/ULA만 차단
    if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80")) {
      return false;
    }
    return true;
  }

  const parts = normalized.split(".").map((v) => Number(v));
  if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 169 && b === 254) return false;

  return true;
}

async function lookupIpLocation(ip: string): Promise<IpLocationResult | null> {
  const endpoints = [
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
    `https://ipwho.is/${encodeURIComponent(ip)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = await res.json();

      if (endpoint.includes("ipapi.co")) {
        const lat = Number(data?.latitude);
        const lng = Number(data?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const labelParts = [data?.region, data?.city].filter(Boolean);
          return {
            lat,
            lng,
            regionLabel: labelParts.join(" ") || data?.country_name || "IP 기반 위치",
            accuracy: 5000,
            source: "ip_lookup",
          };
        }
      } else {
        const lat = Number(data?.latitude);
        const lng = Number(data?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const labelParts = [data?.region, data?.city].filter(Boolean);
          return {
            lat,
            lng,
            regionLabel: labelParts.join(" ") || data?.country || "IP 기반 위치",
            accuracy: 5000,
            source: "ip_lookup",
          };
        }
      }
    } catch {
      // 다음 제공자 시도
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const vercelLat = parseNumber(req.headers.get("x-vercel-ip-latitude"));
  const vercelLng = parseNumber(req.headers.get("x-vercel-ip-longitude"));
  const vercelCity = req.headers.get("x-vercel-ip-city");
  const vercelRegion = req.headers.get("x-vercel-ip-country-region");

  if (vercelLat !== null && vercelLng !== null) {
    const regionLabel = [vercelRegion, vercelCity].filter(Boolean).join(" ") || "IP 기반 위치";
    return NextResponse.json({
      success: true,
      lat: vercelLat,
      lng: vercelLng,
      source: "vercel_header",
      accuracy: 3000,
      regionLabel,
    });
  }

  const ip = extractClientIp(req);
  if (!ip || !isPublicIp(ip)) {
    return NextResponse.json({
      success: false,
      error: "ip_unavailable",
      fallback: DEFAULT_FALLBACK,
    });
  }

  const ipLocation = await lookupIpLocation(ip);
  if (!ipLocation) {
    return NextResponse.json({
      success: false,
      error: "ip_lookup_failed",
      fallback: DEFAULT_FALLBACK,
    });
  }

  return NextResponse.json({ success: true, ...ipLocation });
}

