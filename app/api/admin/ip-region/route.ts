import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/utils/admin-auth";

// 서버 인스턴스 수준 캐시 (재배포 전까지 유지)
const regionCache = new Map<string, string>();

async function lookupRegionByIp(ip: string): Promise<string> {
  const endpoint = `https://ipwho.is/${encodeURIComponent(ip)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return "-";
    const data = await res.json();
    if (!data?.success) return "-";

    const region = [data.city, data.region, data.country]
      .filter(Boolean)
      .join(", ");

    return region || "-";
  } catch {
    return "-";
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const { ips } = await req.json();
    if (!Array.isArray(ips) || ips.length === 0) {
      return NextResponse.json({});
    }

    const result: Record<string, string> = {};
    const uncachedIps: string[] = [];

    for (const ip of ips) {
      if (regionCache.has(ip)) {
        result[ip] = regionCache.get(ip)!;
      } else if (
        ip === "unknown" ||
        ip === "127.0.0.1" ||
        ip.startsWith("192.168.") ||
        ip.startsWith("10.")
      ) {
        result[ip] = "로컬";
        regionCache.set(ip, "로컬");
      } else {
        uncachedIps.push(ip);
      }
    }

    // HTTPS 기반 개별 조회 (최대 50개)
    if (uncachedIps.length > 0) {
      try {
        const targets = uncachedIps.slice(0, 50);
        const resolved = await Promise.all(
          targets.map(async (ip) => ({ ip, region: await lookupRegionByIp(ip) })),
        );

        for (const item of resolved) {
          regionCache.set(item.ip, item.region);
          result[item.ip] = item.region;
        }

        // 조회 상한 초과분은 미확인 처리
        for (const ip of uncachedIps.slice(50)) {
          regionCache.set(ip, "-");
          result[ip] = "-";
        }
      } catch (e) {
        console.error("[ip-region] Region lookup failed:", e);
        for (const ip of uncachedIps) {
          if (!result[ip]) result[ip] = "-";
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ip-region] Error:", error);
    return NextResponse.json({ error: "IP 리전 조회 실패" }, { status: 500 });
  }
}