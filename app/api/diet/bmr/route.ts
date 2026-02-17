import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PUT /api/diet/bmr — 기초대사량 설정
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const body = await req.json()
  const { bmr, height, weight, age, gender, mode } = body

  // mode: "direct" = 직접 입력, "calculate" = AI 자동 계산
  if (mode === "direct") {
    if (!bmr || bmr <= 0 || bmr > 10000) {
      return NextResponse.json({ error: "유효한 기초대사량을 입력해주세요. (1~10000)" }, { status: 400 })
    }

    const { error } = await supabase
      .from("profiles")
      .update({ bmr: Math.round(bmr), updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (error) {
      return NextResponse.json({ error: "저장 실패" }, { status: 500 })
    }

    return NextResponse.json({ success: true, bmr: Math.round(bmr) })
  }

  if (mode === "calculate") {
    if (!height || !weight || !age || !gender) {
      return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 })
    }

    // 해리스-베네딕트 공식
    let calculatedBmr: number
    if (gender === "male") {
      calculatedBmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    } else {
      calculatedBmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    }

    calculatedBmr = Math.round(calculatedBmr)

    const { error } = await supabase
      .from("profiles")
      .update({
        bmr: calculatedBmr,
        height,
        weight,
        age,
        gender,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (error) {
      return NextResponse.json({ error: "저장 실패" }, { status: 500 })
    }

    return NextResponse.json({ success: true, bmr: calculatedBmr })
  }

  return NextResponse.json({ error: "mode는 'direct' 또는 'calculate'이어야 합니다." }, { status: 400 })
}

// GET /api/diet/bmr — 현재 BMR 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("bmr, height, weight, age, gender")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    bmr: profile?.bmr || 0,
    height: profile?.height || null,
    weight: profile?.weight || null,
    age: profile?.age || null,
    gender: profile?.gender || null,
    isSet: !!profile?.bmr,
  })
}
