import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** semver 비교: a < b → -1, a === b → 0, a > b → 1 */
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

// IP 기반 분당 rate limit (in-memory)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// 오래된 항목 정리 (5분마다)
let lastCleanup = Date.now();
function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [key, val] of rateLimitMap) {
    if (now >= val.resetAt) rateLimitMap.delete(key);
  }
}

export async function GET(req: NextRequest) {
  // Rate limit
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  cleanupRateLimitMap();
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  // 파라미터 검증
  const version = req.nextUrl.searchParams.get("version");
  const platform = req.nextUrl.searchParams.get("platform");

  if (!version || !SEMVER_RE.test(version)) {
    return NextResponse.json(
      { error: "유효한 version 파라미터가 필요합니다. (예: 1.0.0)" },
      { status: 400 },
    );
  }

  if (!platform || !["android", "ios"].includes(platform)) {
    return NextResponse.json(
      { error: "platform 파라미터가 필요합니다. (android 또는 ios)" },
      { status: 400 },
    );
  }

  // site_settings 조회
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "app_version_config")
    .single();

  if (error || !data?.value) {
    return NextResponse.json({ status: "ok", latestVersion: null });
  }

  const config = data.value as {
    enabled: boolean;
    latestVersion: string;
    forceUpdateBelow: string;
    recommendUpdateBelow: string;
    forceUpdateMessage: string;
    recommendUpdateMessage: string;
    storeUrl: { android: string; ios: string };
  };

  if (!config.enabled) {
    return NextResponse.json({ status: "ok", latestVersion: null });
  }

  const storeUrl = config.storeUrl?.[platform as "android" | "ios"] || "";

  // 강제 업데이트 체크
  if (
    config.forceUpdateBelow &&
    SEMVER_RE.test(config.forceUpdateBelow) &&
    compareSemver(version, config.forceUpdateBelow) <= 0
  ) {
    return NextResponse.json({
      status: "force_update",
      message:
        config.forceUpdateMessage ||
        "필수 업데이트가 있습니다. 최신 버전으로 업데이트해주세요.",
      storeUrl,
      latestVersion: config.latestVersion,
    });
  }

  // 권장 업데이트 체크
  if (
    config.recommendUpdateBelow &&
    SEMVER_RE.test(config.recommendUpdateBelow) &&
    compareSemver(version, config.recommendUpdateBelow) <= 0
  ) {
    return NextResponse.json({
      status: "recommend_update",
      message:
        config.recommendUpdateMessage ||
        "새로운 기능이 추가되었습니다. 업데이트를 권장합니다.",
      storeUrl,
      latestVersion: config.latestVersion,
    });
  }

  return NextResponse.json({
    status: "ok",
    latestVersion: config.latestVersion,
  });
}
