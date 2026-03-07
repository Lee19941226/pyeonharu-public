import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/utils/admin-auth";
import { randomBytes } from "crypto";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function generateToken(): string {
  // DB schema is VARCHAR(32), so keep generated token within 32 chars.
  return randomBytes(16).toString("hex");
}

const TOKEN_FORMAT = /^[a-zA-Z0-9-]{4,32}$/;

// GET: 전체 토큰 목록
export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("portfolio_access_tokens")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tokens: data || [] });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// POST: 토큰 생성
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getSupabase();
    const { label, token: customToken, validFrom, validUntil } = await req.json();

    if (!label || !validFrom || !validUntil) {
      return NextResponse.json(
        { error: "라벨, 시작일, 종료일은 필수입니다." },
        { status: 400 },
      );
    }

    const token = customToken
      ? customToken.trim().toLowerCase()
      : generateToken();

    if (!TOKEN_FORMAT.test(token)) {
      return NextResponse.json(
        { error: "토큰은 영문, 숫자, 하이픈으로 4~32자여야 합니다." },
        { status: 400 },
      );
    }

    // 중복 체크
    const { data: existing } = await supabase
      .from("portfolio_access_tokens")
      .select("id")
      .eq("token", token)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 토큰입니다." },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("portfolio_access_tokens")
      .insert({
        token,
        label,
        valid_from: validFrom,
        valid_until: validUntil,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, token: data });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// PATCH: 토큰 취소/복원
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getSupabase();
    const { id, is_revoked } = await req.json();

    if (!id || typeof is_revoked !== "boolean") {
      return NextResponse.json(
        { error: "ID와 취소 상태가 필요합니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("portfolio_access_tokens")
      .update({ is_revoked })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, token: data });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// DELETE: 토큰 하드 삭제
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const supabase = getSupabase();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "토큰 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("portfolio_access_tokens")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
