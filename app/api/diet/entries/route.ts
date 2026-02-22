import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/diet/entries?date=2026-02-17
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const dateStr =
    searchParams.get("date") || new Date().toISOString().split("T")[0];

  // KST 기준 00:00 ~ 23:59:59
  const startOfDay = `${dateStr}T00:00:00+09:00`;
  const endOfDay = `${dateStr}T23:59:59+09:00`;

  const { data: entries, error } = await supabase
    .from("diet_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("recorded_at", startOfDay)
    .lte("recorded_at", endOfDay)
    .order("recorded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  // 프로필에서 BMR 가져오기
  const { data: profile } = await supabase
    .from("profiles")
    .select("bmr")
    .eq("id", user.id)
    .single();

  const totalCal = (entries || []).reduce(
    (sum, e) => sum + (e.estimated_cal || 0),
    0,
  );
  const bmr = profile?.bmr || 0;

  return NextResponse.json({
    success: true,
    entries: entries || [],
    totalCal,
    bmr,
    isOver: bmr > 0 && totalCal > bmr,
    overAmount: bmr > 0 ? Math.max(0, totalCal - bmr) : 0,
  });
}

// POST /api/diet/entries — 직접 입력
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { food_name, estimated_cal } = body;

  if (!food_name?.trim()) {
    return NextResponse.json(
      { error: "음식 이름을 입력해주세요." },
      { status: 400 },
    );
  }

  if (!estimated_cal || estimated_cal <= 0) {
    return NextResponse.json(
      { error: "칼로리를 입력해주세요." },
      { status: 400 },
    );
  }

  const { data: entry, error } = await supabase
    .from("diet_entries")
    .insert({
      user_id: user.id,
      food_name: food_name.trim(),
      estimated_cal: Math.round(estimated_cal),
      source: "manual",
      emoji: "📝",
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "저장에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, entry });
}

// PATCH /api/diet/entries — 칼로리 수정
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { id, estimated_cal } = body;

  if (!id) {
    return NextResponse.json({ error: "ID가 필요합니다." }, { status: 400 });
  }

  if (!estimated_cal || estimated_cal <= 0) {
    return NextResponse.json(
      { error: "올바른 칼로리를 입력해주세요." },
      { status: 400 },
    );
  }

  const { data: entry, error } = await supabase
    .from("diet_entries")
    .update({ estimated_cal: Math.round(estimated_cal) })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "수정에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, entry });
}

// DELETE /api/diet/entries?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID가 필요합니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("diet_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
