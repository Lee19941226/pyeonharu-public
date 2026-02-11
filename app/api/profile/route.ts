import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PUT /api/profile — 프로필 닉네임 업데이트 (auth + profiles 동기화)
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const body = await req.json()
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 })
  }

  const trimmedName = name.trim()

  // 1. auth.users user_metadata 업데이트
  const { error: authError } = await supabase.auth.updateUser({
    data: { name: trimmedName },
  })

  if (authError) {
    console.error("auth updateUser 에러:", authError)
    return NextResponse.json({ error: "프로필 업데이트 실패" }, { status: 500 })
  }

  // 2. profiles.nickname 동기화
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      nickname: trimmedName,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })

  if (profileError) {
    console.error("profiles 업데이트 에러:", profileError)
    // auth는 성공했으니 에러를 무시하고 성공 반환
  }

  return NextResponse.json({ success: true, name: trimmedName })
}

// GET /api/profile — 프로필 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    name: profile?.nickname || user.user_metadata?.name || "사용자",
    email: user.email || "",
    avatarUrl: profile?.avatar_url || null,
  })
}
