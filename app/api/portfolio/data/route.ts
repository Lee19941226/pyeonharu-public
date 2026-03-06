import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

// portfolio-data.json은 빌드 스크립트(generate-portfolio-data.mjs)가 생성하는 파일이므로
// 파일이 없는 환경(CI, 첫 클론 등)에서도 타입 오류 없이 안전하게 로드한다.
const PORTFOLIO_FALLBACK = { categories: [], totalFiles: 0, totalLines: 0, generatedAt: "" };

let portfolioData: typeof PORTFOLIO_FALLBACK | Record<string, unknown> = PORTFOLIO_FALLBACK;
try {
  const raw = readFileSync(join(process.cwd(), "data/portfolio-data.json"), "utf-8");
  portfolioData = JSON.parse(raw);
} catch {
  console.warn("[Portfolio] data/portfolio-data.json not found — fallback 사용. 'npm run build'를 실행하면 파일이 생성됩니다.");
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    // IP 기반 rate limit: 10회/분
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitKey = `portfolio:data:ip:${ip}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 1000);

    const supabase = getSupabase();
    const { count: recentCount } = await supabase
      .from("restaurant_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", rateLimitKey)
      .gte("searched_at", windowStart.toISOString());

    if ((recentCount || 0) >= 10) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    supabase
      .from("restaurant_rate_limits")
      .insert({ identifier: rateLimitKey, searched_at: now.toISOString() })
      .then(({ error }) => {
        if (error) console.error("rate limit 기록 실패:", error);
      });

    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "토큰이 필요합니다." },
        { status: 400 },
      );
    }

    const normalized = token.trim().toLowerCase();

    const { data, error } = await supabase
      .from("portfolio_access_tokens")
      .select("id, token, is_revoked, valid_from, valid_until, use_count")
      .eq("token", normalized)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 },
      );
    }

    if (data.is_revoked) {
      return NextResponse.json(
        { error: "취소된 토큰입니다." },
        { status: 401 },
      );
    }

    if (now < new Date(data.valid_from)) {
      return NextResponse.json(
        { error: "아직 유효하지 않은 토큰입니다." },
        { status: 401 },
      );
    }
    if (now > new Date(data.valid_until)) {
      return NextResponse.json(
        { error: "만료된 토큰입니다." },
        { status: 401 },
      );
    }

    return NextResponse.json(portfolioData);
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
