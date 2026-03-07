import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function normalizePortfolioToken(value: string) {
  return value
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitKey = `portfolio:verify:ip:${ip}`;
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
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    void supabase
      .from("restaurant_rate_limits")
      .insert({ identifier: rateLimitKey, searched_at: now.toISOString() });

    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "토큰을 입력해 주세요." },
        { status: 400 },
      );
    }

    const normalized = normalizePortfolioToken(token);

    if (!normalized) {
      return NextResponse.json(
        { error: "토큰을 입력해 주세요." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("portfolio_access_tokens")
      .select("*")
      .ilike("token", normalized)
      .maybeSingle();

    if (error) {
      console.error("Portfolio token verify error:", error.message);
      return NextResponse.json(
        { error: "서버 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 },
      );
    }

    const validFrom = new Date(data.valid_from);
    const validUntil = new Date(data.valid_until);

    if (data.is_revoked || now < validFrom || now > validUntil) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 },
      );
    }

    void supabase
      .from("portfolio_access_tokens")
      .update({
        use_count: (data.use_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
