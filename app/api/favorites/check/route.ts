import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - 즐겨찾기 여부 확인
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ favorited: false });
  }

  const { searchParams } = new URL(req.url);
  const foodCode = searchParams.get("code");

  if (!foodCode) {
    return NextResponse.json({ favorited: false });
  }

  const { data } = await supabase
    .from("food_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("food_code", foodCode)
    .maybeSingle();

  return NextResponse.json({ favorited: !!data });
}
