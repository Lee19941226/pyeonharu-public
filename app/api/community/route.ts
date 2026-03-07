import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/utils/action-log";
import { stripHtml, maskProfanity } from "@/lib/utils/profanity-filter";

// 프로필 + 학교명 + 재학/졸업 상태 조회 헬퍼
async function enrichPosts(supabase: any, data: any[], userId?: string) {
  if (!data || data.length === 0) return [];

  // 작성자 닉네임
  const userIds = [...new Set(data.map((p) => p.user_id))];
  const profileMap: Record<
    string,
    { nickname: string; avatar_url: string | null }
  > = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", userIds);
    for (const p of profiles || []) {
      profileMap[p.id] = {
        nickname: p.nickname || "익명",
        avatar_url: p.avatar_url,
      };
    }
  }

  // 학교 이름 + 작성자별 재학/졸업 상태
  const schoolCodes = [...new Set(data.map((p) => p.school_code))];
  const schoolNameMap: Record<string, string> = {};
  // key: `${user_id}:${school_code}`
  const enrollmentMap: Record<string, { enrollment_status: string | null; graduation_year: number | null }> = {};
  if (schoolCodes.length > 0) {
    const { data: schools } = await supabase
      .from("user_schools")
      .select("user_id, school_code, school_name, enrollment_status, graduation_year")
      .in("school_code", schoolCodes)
      .in("user_id", userIds);
    for (const s of schools || []) {
      if (!schoolNameMap[s.school_code])
        schoolNameMap[s.school_code] = s.school_name;
      enrollmentMap[`${s.user_id}:${s.school_code}`] = {
        enrollment_status: s.enrollment_status,
        graduation_year: s.graduation_year,
      };
    }
  }

  // 좋아요 여부
  let likedPostIds: Set<string> = new Set();
  if (userId && data.length > 0) {
    const postIds = data.map((p) => p.id);
    const { data: likes } = await supabase
      .from("community_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds);
    likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
  }

  return data.map((post) => {
    const enrollment = enrollmentMap[`${post.user_id}:${post.school_code}`];
    return {
      ...post,
      schoolName: schoolNameMap[post.school_code] || post.school_code,
      author: profileMap[post.user_id]?.nickname || "익명",
      avatarUrl: profileMap[post.user_id]?.avatar_url || null,
      isLiked: likedPostIds.has(post.id),
      isOwner: userId === post.user_id,
      enrollmentStatus: enrollment?.enrollment_status || null,
      graduationYear: enrollment?.graduation_year || null,
    };
  });
}

// GET /api/community — 게시글 목록 조회
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("mode") || ""; // "popular" = 인기글(전체 학교)
  const schoolCode = searchParams.get("schoolCode") || "";
  const schoolCodesParam = searchParams.get("schoolCodes") || ""; // 쉼표 구분 복수 학교
  const pageRaw = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
  const limitRaw = parseInt(searchParams.get("limit") || "10", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 10;
  const sort = searchParams.get("sort") || "latest";
  const search = searchParams.get("search") || "";
  const debugRequested = searchParams.get("_debug") === "1";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 인기글 모드: 전체 학교 대상 좋아요 TOP5 + 조회수 TOP5 ──
  if (mode === "popular") {
    const { data: byLikes } = await supabase
      .from("community_posts")
      .select("*")
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: byViews } = await supabase
      .from("community_posts")
      .select("*")
      .order("view_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    // 중복 제거
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const post of [...(byLikes || []), ...(byViews || [])]) {
      if (!seen.has(post.id)) {
        seen.add(post.id);
        merged.push(post);
      }
    }

    const posts = await enrichPosts(supabase, merged, user?.id);
    const enrichedMap = new Map(posts.map((p: any) => [p.id, p]));

    return NextResponse.json({
      topLikes: (byLikes || []).map((p: any) => enrichedMap.get(p.id)).filter(Boolean),
      topViews: (byViews || []).map((p: any) => enrichedMap.get(p.id)).filter(Boolean),
      posts,
    });
  }

  // ── 일반 목록 ──
  const offset = (page - 1) * limit;

  let query = supabase.from("community_posts").select("*", { count: "exact" });

  // 복수 학교 필터
  if (schoolCodesParam) {
    const codes = schoolCodesParam.split(",").filter(Boolean);
    if (codes.length > 20) {
      return NextResponse.json(
        { error: "학교 코드는 최대 20개까지 허용됩니다." },
        { status: 400 },
      );
    }
    if (codes.length > 0) query = query.in("school_code", codes);
  } else if (schoolCode) {
    query = query.eq("school_code", schoolCode);
  }

  if (search) {
    // PostgREST .or() 파서에서 특수문자가 구분자로 해석되는 것을 방지
    const safeSearch = search.replace(/[,.()"'\\]/g, "");
    if (safeSearch)
      query = query.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%`);
  }

  if (sort === "popular") {
    query = query
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;

  if (error) {
    const debugInfo = {
      message: error.message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
      params: {
        mode,
        schoolCode,
        hasSchoolCodes: !!schoolCodesParam,
        page,
        limit,
        offset,
        sort,
        hasSearch: !!search,
      },
      userId: user?.id || null,
    };
    console.error("community_posts 조회 에러:", debugInfo);
    return NextResponse.json(
      debugRequested
        ? { error: "서버 오류가 발생했습니다.", debug: debugInfo }
        : { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const posts = await enrichPosts(supabase, data || [], user?.id);

  // 현재 사용자의 해당 학교 재학/졸업 상태 (관계 태그 계산용)
  let myEnrollment: { enrollment_status: string | null; graduation_year: number | null } | null = null;
  if (user && schoolCode) {
    const { data: mySchool } = await supabase
      .from("user_schools")
      .select("enrollment_status, graduation_year")
      .eq("user_id", user.id)
      .eq("school_code", schoolCode)
      .is("family_member_id", null)
      .maybeSingle();
    if (mySchool) {
      myEnrollment = {
        enrollment_status: mySchool.enrollment_status,
        graduation_year: mySchool.graduation_year,
      };
    }
  }

  return NextResponse.json({
    posts,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    myEnrollment,
  });
}

// POST /api/community — 게시글 작성
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
  // ─── Rate Limit: 하루 20개, 1시간 5개 ───
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const identifier = `community:post:${user.id}`;

  // 하루 제한 체크
  const { count: dailyCount, error: dailyErr } = await supabase
    .from("community_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .gte("created_at", todayStart.toISOString());

  if (dailyErr) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  if ((dailyCount || 0) >= 20) {
    return NextResponse.json(
      { error: "오늘 게시글 작성 한도(20개)를 초과했습니다." },
      { status: 429 },
    );
  }

  // 1시간 제한 체크
  const { count: hourlyCount } = await supabase
    .from("community_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .gte("created_at", hourAgo.toISOString());

  if ((hourlyCount || 0) >= 5) {
    return NextResponse.json(
      {
        error:
          "1시간에 5개까지만 작성할 수 있습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 429 },
    );
  }

  // 기록 저장 (실패 시 요청 차단)
  const { error: rateLimitInsertErr } = await supabase
    .from("community_rate_limits")
    .insert({ identifier, created_at: now.toISOString() });

  if (rateLimitInsertErr) {
    console.error("커뮤니티 rate limit 기록 실패:", rateLimitInsertErr);
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
  const body = await req.json();
  const { schoolCode, title, content, imageUrls } = body;

  if (!schoolCode || !title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: "필수 항목을 모두 입력해주세요." },
      { status: 400 },
    );
  }
  if (title.trim().length > 100) {
    return NextResponse.json(
      { error: "제목은 100자 이내로 입력해주세요." },
      { status: 400 },
    );
  }
  if (content.trim().length > 5000) {
    return NextResponse.json(
      { error: "내용은 5000자 이내로 입력해주세요." },
      { status: 400 },
    );
  }

  const { data: schoolCheck } = await supabase
    .from("user_schools")
    .select("id")
    .eq("user_id", user.id)
    .eq("school_code", schoolCode)
    .maybeSingle();

  if (!schoolCheck) {
    return NextResponse.json(
      { error: "등록된 학교에서만 글을 작성할 수 있습니다." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      school_code: schoolCode,
      title: maskProfanity(stripHtml(title)),
      content: maskProfanity(stripHtml(content)),
      image_urls: imageUrls || [],
    })
    .select()
    .single();

  if (error) {
    console.error("[community]", error.message);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  logAction({
    userId: user.id,
    actionType: "community_post_create",
    metadata: { post_id: data.id, title: maskProfanity(stripHtml(title)) },
  });

  return NextResponse.json({ success: true, post: data });
}
