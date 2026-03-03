import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import portfolioData from "@/data/portfolio-data.json";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "토큰이 필요합니다." },
        { status: 400 },
      );
    }

    const normalized = token.trim().toLowerCase();
    const supabase = getSupabase();

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

    const now = new Date();
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
