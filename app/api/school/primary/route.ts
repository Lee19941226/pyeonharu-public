import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/school/primary — 메인 학교 설정
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const body = await req.json()
  const { schoolCode } = body

  if (!schoolCode) {
    return NextResponse.json({ error: "schoolCode가 필요합니다." }, { status: 400 })
  }

  // 해당 학교가 내 등록 학교인지 확인
  const { data: school } = await supabase
    .from("user_schools")
    .select("id")
    .eq("user_id", user.id)
    .eq("school_code", schoolCode)
    .maybeSingle()

  if (!school) {
    return NextResponse.json({ error: "등록된 학교가 아닙니다." }, { status: 404 })
  }

  // 기존 메인 학교 해제
  await supabase
    .from("user_schools")
    .update({ is_primary: false })
    .eq("user_id", user.id)
    .eq("is_primary", true)

  // 새 메인 학교 설정
  const { error } = await supabase
    .from("user_schools")
    .update({ is_primary: true })
    .eq("user_id", user.id)
    .eq("school_code", schoolCode)

  if (error) {
    return NextResponse.json({ error: "메인 학교 설정 실패" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET /api/school/primary — 메인 학교 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { data: primary } = await supabase
    .from("user_schools")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle()

  // 메인 없으면 첫 번째 학교를 메인으로 자동 설정
  if (!primary) {
    const { data: firstSchool } = await supabase
      .from("user_schools")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstSchool) {
      await supabase
        .from("user_schools")
        .update({ is_primary: true })
        .eq("id", firstSchool.id)

      return NextResponse.json({ school: { ...firstSchool, is_primary: true } })
    }

    return NextResponse.json({ school: null })
  }

  return NextResponse.json({ school: primary })
}
