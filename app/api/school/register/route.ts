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
    const { schoolCode, officeCode, schoolName, schoolAddress, familyMemberId } = body

    if (!schoolCode || !officeCode || !schoolName) {
      return NextResponse.json({ error: "학교 정보가 부족합니다." }, { status: 400 })
    }

    // family_member_id 소유권 검증
    if (familyMemberId) {
      const { data: member } = await supabase
        .from("family_members")
        .select("id")
        .eq("id", familyMemberId)
        .eq("owner_id", user.id)
        .maybeSingle()

      if (!member) {
        return NextResponse.json({ error: "유효하지 않은 가족 구성원입니다." }, { status: 403 })
      }
    }

    // 이미 등록된 학교인지 확인 (같은 그룹 내 중복 방지)
    let dupQuery = supabase
      .from("user_schools")
      .select("id")
      .eq("user_id", user.id)
      .eq("school_code", schoolCode)

    dupQuery = familyMemberId
      ? dupQuery.eq("family_member_id", familyMemberId)
      : dupQuery.is("family_member_id", null)

    const { data: existing } = await dupQuery.maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "이미 등록된 학교입니다." }, { status: 409 })
    }

    // 등록 개수 제한: 본인/구성원 그룹별 최대 5개
    let countQuery = supabase
      .from("user_schools")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)

    countQuery = familyMemberId
      ? countQuery.eq("family_member_id", familyMemberId)
      : countQuery.is("family_member_id", null)

    const { count } = await countQuery

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: "학교는 최대 5개까지 등록할 수 있습니다." }, { status: 400 })
    }

    // 첫 번째 학교면 is_primary = true (그룹별로 독립 관리)
    const { data, error } = await supabase
      .from("user_schools")
      .insert({
        user_id: user.id,
        school_code: schoolCode,
        office_code: officeCode,
        school_name: schoolName,
        school_address: schoolAddress || "",
        family_member_id: familyMemberId || null,
        is_primary: (count || 0) === 0,
      })
      .select()
      .single()

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
    const familyMemberId = searchParams.get("familyMemberId")

    if (!schoolCode) {
      return NextResponse.json({ error: "schoolCode가 필요합니다." }, { status: 400 })
    }

    let deleteQuery = supabase
      .from("user_schools")
      .delete()
      .eq("user_id", user.id)
      .eq("school_code", schoolCode)

    deleteQuery = familyMemberId
      ? deleteQuery.eq("family_member_id", familyMemberId)
      : deleteQuery.is("family_member_id", null)

    const { error } = await deleteQuery

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

// PATCH: 학교 재학/졸업 상태 업데이트
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const body = await req.json()
    const { schoolCode, enrollmentStatus, graduationYear, enrollmentYear } = body

    if (!schoolCode) {
      return NextResponse.json({ error: "schoolCode가 필요합니다." }, { status: 400 })
    }

    // enrollmentStatus 유효성 검증
    if (enrollmentStatus !== null && enrollmentStatus !== undefined &&
        enrollmentStatus !== "enrolled" && enrollmentStatus !== "graduated") {
      return NextResponse.json({ error: "유효하지 않은 상태값입니다." }, { status: 400 })
    }

    // graduationYear 유효성 검증
    const currentYear = new Date().getFullYear()
    if (graduationYear !== null && graduationYear !== undefined) {
      const gy = Number(graduationYear)
      if (!Number.isInteger(gy) || gy < 1950 || gy > currentYear) {
        return NextResponse.json({ error: `졸업년도는 1950~${currentYear} 범위여야 합니다.` }, { status: 400 })
      }
    }

    // enrollmentYear 유효성 검증
    if (enrollmentYear !== null && enrollmentYear !== undefined) {
      const ey = Number(enrollmentYear)
      if (!Number.isInteger(ey) || ey < 1950 || ey > currentYear) {
        return NextResponse.json({ error: `입학년도는 1950~${currentYear} 범위여야 합니다.` }, { status: 400 })
      }
    }

    const updateData: Record<string, any> = {
      enrollment_status: enrollmentStatus ?? null,
      graduation_year: enrollmentStatus === "graduated" && graduationYear ? Number(graduationYear) : null,
      enrollment_year: enrollmentYear ? Number(enrollmentYear) : null,
    }

    const { data, error } = await supabase
      .from("user_schools")
      .update(updateData)
      .eq("user_id", user.id)
      .eq("school_code", schoolCode)
      .is("family_member_id", null)
      .select()
      .single()

    if (error) {
      console.error("[School Status Update] Error:", error)
      return NextResponse.json({ error: "상태 업데이트에 실패했습니다." }, { status: 500 })
    }

    return NextResponse.json({ success: true, school: data })
  } catch (error) {
    console.error("[School Status Update] Error:", error)
    return NextResponse.json({ error: "상태 업데이트에 실패했습니다." }, { status: 500 })
  }
}

// GET: 내 학교 목록
// ?familyMemberId=own       → 본인 학교만 (family_member_id IS NULL)
// ?familyMemberId=<uuid>    → 해당 구성원 학교만
// (파라미터 없음)            → 전체 (본인 + 모든 구성원)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const familyMemberId = searchParams.get("familyMemberId")

    let query = supabase
      .from("user_schools")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (familyMemberId === "own") {
      query = query.is("family_member_id", null)
    } else if (familyMemberId) {
      query = query.eq("family_member_id", familyMemberId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: "학교 목록 조회 실패" }, { status: 500 })
    }

    return NextResponse.json({ schools: data || [] })
  } catch (error) {
    return NextResponse.json({ error: "학교 목록 조회 실패" }, { status: 500 })
  }
}
