import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/utils/admin-auth";

// 서버 인스턴스 수준 캐시 (재배포 전까지 유지)
const regionCache = new Map<string, string>();

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
      } else if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
        result[ip] = "로컬";
        regionCache.set(ip, "로컬");
      } else {
        uncachedIps.push(ip);
      }
    }

    // ip-api.com 배치 조회 (최대 100개, 무료)
    if (uncachedIps.length > 0) {
      try {
        const batch = uncachedIps.slice(0, 100);
        const res = await fetch(
          "http://ip-api.com/batch?fields=query,country,regionName,city,status",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batch),
          },
        );

        if (res.ok) {
          const data = await res.json();
          for (const item of data) {
            if (item.status === "success") {
              const region = [item.city, item.regionName, item.country]
                .filter(Boolean)
                .join(", ");
              regionCache.set(item.query, region);
              result[item.query] = region;
            } else {
              regionCache.set(item.query, "-");
              result[item.query] = "-";
            }
          }
        }
      } catch (e) {
        console.error("[ip-region] Batch lookup failed:", e);
        // 실패 시 조회 불가 표시
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
