import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface SchoolRow {
  id: string
  school_code: string
  office_code: string
  school_name: string
  school_address: string | null
  is_primary: boolean
  created_at: string
  family_member_id: string | null
  family_members: {
    id: string
    name: string
    avatar_emoji: string
    relation: string
  } | null
}

interface School {
  id: string
  school_code: string
  office_code: string
  school_name: string
  school_address: string | null
  is_primary: boolean
  created_at: string
  family_member_id: string | null
}

interface MemberSchoolGroup {
  memberId: string
  memberName: string
  memberEmoji: string
  memberRelation: string
  schools: School[]
}

// GET /api/school
// 본인 학교 목록 + 가족 구성원별 학교 목록을 함께 반환
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
    }

    // user_schools + family_members 조인 — 단일 쿼리로 전체 조회
    const { data, error } = await supabase
      .from("user_schools")
      .select(`
        id,
        school_code,
        office_code,
        school_name,
        school_address,
        is_primary,
        created_at,
        family_member_id,
        family_members (
          id,
          name,
          avatar_emoji,
          relation
        )
      `)
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[School] List error:", error)
      return NextResponse.json({ error: "학교 목록 조회에 실패했습니다." }, { status: 500 })
    }

    const rows = (data || []) as SchoolRow[]

    // ── 본인 학교 (family_member_id IS NULL) ──────────────────────────
    const ownSchools: School[] = rows
      .filter(r => r.family_member_id === null)
      .map(({ family_members: _, ...school }) => school)

    // ── 가족 구성원별 학교 (family_member_id 기준 그룹) ───────────────
    const memberMap = new Map<string, MemberSchoolGroup>()

    for (const row of rows) {
      if (!row.family_member_id || !row.family_members) continue

      if (!memberMap.has(row.family_member_id)) {
        memberMap.set(row.family_member_id, {
          memberId: row.family_members.id,
          memberName: row.family_members.name,
          memberEmoji: row.family_members.avatar_emoji,
          memberRelation: row.family_members.relation,
          schools: [],
        })
      }

      const { family_members: _, ...schoolData } = row
      memberMap.get(row.family_member_id)!.schools.push(schoolData)
    }

    const memberSchools = Array.from(memberMap.values())

    return NextResponse.json({
      ownSchools,
      memberSchools,
    })
  } catch (error) {
    console.error("[School] List error:", error)
    return NextResponse.json({ error: "학교 목록 조회에 실패했습니다." }, { status: 500 })
  }
}
