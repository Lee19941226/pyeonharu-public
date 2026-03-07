import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/community/user-profile/[userId]?schoolCode=xxx
// 커뮤니티용 공개 프로필 조회 (인증 필수)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params
  const supabase = await createClient()

  // 인증 체크
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const schoolCode = searchParams.get("schoolCode")

  if (!schoolCode) {
    return NextResponse.json({ error: "schoolCode가 필요합니다." }, { status: 400 })
  }

  // UUID 형식 검증
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    return NextResponse.json({ error: "유효하지 않은 요청입니다." }, { status: 400 })
  }

  // 프로필 조회 (민감 정보 제외 - nickname, avatar_url, created_at, show_allergy_public만)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("nickname, avatar_url, created_at, show_allergy_public")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
  }

  // 해당 학교의 재학/졸업 상태 조회
  const { data: schoolInfo } = await supabase
    .from("user_schools")
    .select("enrollment_status, graduation_year, enrollment_year")
    .eq("user_id", userId)
    .eq("school_code", schoolCode)
    .is("family_member_id", null)
    .maybeSingle()

  // 게시글 수 (해당 학교 기준)
  const { count: postCount } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("school_code", schoolCode)

  // 알레르기 정보 (show_allergy_public=true인 경우만)
  let allergies: string[] = []
  if (profile.show_allergy_public) {
    const { data: allergyData } = await supabase
      .from("user_allergies")
      .select("allergen_name")
      .eq("user_id", userId)
    allergies = (allergyData || []).map(a => a.allergen_name)
  }

  // 현재 사용자의 해당 학교 재학/졸업 상태 (관계 태그 계산용)
  let myEnrollment: { enrollment_status: string | null; graduation_year: number | null } | null = null
  if (user.id !== userId) {
    const { data: mySchool } = await supabase
      .from("user_schools")
      .select("enrollment_status, graduation_year")
      .eq("user_id", user.id)
      .eq("school_code", schoolCode)
      .is("family_member_id", null)
      .maybeSingle()
    if (mySchool) {
      myEnrollment = {
        enrollment_status: mySchool.enrollment_status,
        graduation_year: mySchool.graduation_year,
      }
    }
  }

  return NextResponse.json({
    nickname: profile.nickname || "익명",
    avatarUrl: profile.avatar_url,
    joinedAt: profile.created_at,
    enrollmentStatus: schoolInfo?.enrollment_status || null,
    graduationYear: schoolInfo?.graduation_year || null,
    enrollmentYear: schoolInfo?.enrollment_year || null,
    postCount: postCount || 0,
    allergies,
    myEnrollment,
    isMe: user.id === userId,
  })
}
