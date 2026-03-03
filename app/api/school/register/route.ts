import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST: 학교 등록
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const body = await req.json()
    const { schoolCode, officeCode, schoolName, schoolAddress } = body

    if (!schoolCode || !officeCode || !schoolName) {
      return NextResponse.json({ error: "학교 정보가 부족합니다." }, { status: 400 })
    }

    // 이미 등록된 학교인지 확인
    const { data: existing } = await supabase
      .from("user_schools")
      .select("id")
      .eq("user_id", user.id)
      .eq("school_code", schoolCode)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "이미 등록된 학교입니다." }, { status: 409 })
    }

    // 등록 개수 제한 (최대 5개)
    const { count } = await supabase
      .from("user_schools")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: "학교는 최대 5개까지 등록할 수 있습니다." }, { status: 400 })
    }

    const { data, error } = await supabase.from("user_schools").insert({
      user_id: user.id,
      school_code: schoolCode,
      office_code: officeCode,
      school_name: schoolName,
      school_address: schoolAddress || "",
      is_primary: (count || 0) === 0,
    }).select().single()

    if (error) {
      console.error("[School Register] Error:", error)
      return NextResponse.json({ error: "학교 등록에 실패했습니다." }, { status: 500 })
    }

    return NextResponse.json({ success: true, school: data })
  } catch (error) {
    console.error("[School Register] Error:", error)
    return NextResponse.json({ error: "학교 등록에 실패했습니다." }, { status: 500 })
  }
}

// DELETE: 학교 해제
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const schoolCode = searchParams.get("schoolCode")

    if (!schoolCode) {
      return NextResponse.json({ error: "schoolCode가 필요합니다." }, { status: 400 })
    }

    const { error } = await supabase
      .from("user_schools")
      .delete()
      .eq("user_id", user.id)
      .eq("school_code", schoolCode)

    if (error) {
      console.error("[School Unregister] Error:", error)
      return NextResponse.json({ error: "학교 해제에 실패했습니다." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[School Unregister] Error:", error)
    return NextResponse.json({ error: "학교 해제에 실패했습니다." }, { status: 500 })
  }
}

// GET: 내 학교 목록
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("user_schools")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "학교 목록 조회 실패" }, { status: 500 })
    }

    return NextResponse.json({ schools: data || [] })
  } catch (error) {
    return NextResponse.json({ error: "학교 목록 조회 실패" }, { status: 500 })
  }
}
