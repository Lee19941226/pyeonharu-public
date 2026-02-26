import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - 즐겨찾기 목록 조회
export async function GET() {
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

  const { data, error } = await supabase
    .from("food_favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[food/favorites]", error.message);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    favorites: data || [],
  });
}

// POST - 즐겨찾기 추가
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
  const { foodCode, foodName, manufacturer, isSafe } = body;

  if (!foodCode || !foodName) {
    return NextResponse.json(
      { error: "필수 정보가 누락되었습니다." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("food_favorites").insert({
    user_id: user.id,
    food_code: foodCode,
    food_name: foodName,
    manufacturer: manufacturer || "정보없음",
    is_safe: isSafe ?? true,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 즐겨찾기에 추가되어 있습니다." },
        { status: 409 },
      );
    }
    console.error("[food/favorites]", error.message);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

// DELETE - 즐겨찾기 삭제
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
  const foodCode = searchParams.get("code");

  if (!foodCode) {
    return NextResponse.json(
      { error: "food code가 필요합니다." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("food_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("food_code", foodCode);

  if (error) {
    console.error("[food/favorites]", error.message);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
