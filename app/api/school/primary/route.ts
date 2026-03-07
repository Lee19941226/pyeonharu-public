import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/school/primary - 메인 학교 설정
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json();
  const { schoolCode } = body;

  if (!schoolCode) {
    return NextResponse.json({ error: "schoolCode가 필요합니다." }, { status: 400 });
  }

  const { data: school } = await supabase
    .from("user_schools")
    .select("id")
    .eq("user_id", user.id)
    .eq("school_code", schoolCode)
    .maybeSingle();

  if (!school) {
    return NextResponse.json({ error: "등록되지 않은 학교입니다." }, { status: 404 });
  }

  await supabase
    .from("user_schools")
    .update({ is_primary: false })
    .eq("user_id", user.id)
    .eq("is_primary", true);

  const { error } = await supabase
    .from("user_schools")
    .update({ is_primary: true })
    .eq("user_id", user.id)
    .eq("school_code", schoolCode);

  if (error) {
    return NextResponse.json({ error: "메인 학교 설정 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/school/primary - 메인 학교 조회
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: primary } = await supabase
    .from("user_schools")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!primary) {
    const { data: firstSchool } = await supabase
      .from("user_schools")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Read-only fallback: do not mutate DB in GET.
    if (firstSchool) {
      return NextResponse.json({ school: { ...firstSchool, is_primary: true } });
    }

    return NextResponse.json({ school: null });
  }

  return NextResponse.json({ school: primary });
}
