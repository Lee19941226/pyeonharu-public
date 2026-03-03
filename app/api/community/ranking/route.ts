import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/community/ranking — 학교별 활동량 랭킹
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "posts"; // posts | likes | views

  // 최근 7일간 게시글 기준
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  // 모든 최근 게시글 가져오기
  const { data: recentPosts, error } = await supabase
    .from("community_posts")
    .select("school_code, like_count, view_count, comment_count")
    .gte("created_at", weekAgoStr);

  if (error) {
    console.error("[community/ranking]", error.message);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  // 학교별 집계
  const schoolMap = new Map<
    string,
    { posts: number; likes: number; views: number; comments: number }
  >();

  for (const post of recentPosts || []) {
    const code = post.school_code;
    const cur = schoolMap.get(code) || {
      posts: 0,
      likes: 0,
      views: 0,
      comments: 0,
    };
    cur.posts += 1;
    cur.likes += post.like_count || 0;
    cur.views += post.view_count || 0;
    cur.comments += post.comment_count || 0;
    schoolMap.set(code, cur);
  }

  // 학교 코드 → 이름 매핑
  const schoolCodes = Array.from(schoolMap.keys());
  if (schoolCodes.length === 0) {
    return NextResponse.json({
      ranking: [],
      averages: { posts: 0, likes: 0, comments: 0, views: 0 },
      totalSchools: 0,
      mySchool: null,
    });
  }

  const { data: schools } = await supabase
    .from("user_schools")
    .select("school_code, school_name")
    .in("school_code", schoolCodes);

  const nameMap = new Map<string, string>();
  for (const s of schools || []) {
    if (!nameMap.has(s.school_code)) {
      nameMap.set(s.school_code, s.school_name);
    }
  }

  // 정렬
  const ranking = Array.from(schoolMap.entries())
    .map(([code, stats]) => ({
      school_code: code,
      school_name: nameMap.get(code) || code,
      ...stats,
      // 종합 점수: 게시글*10 + 댓글*3 + 좋아요*5 + 조회*0.1
      score:
        stats.posts * 10 +
        stats.comments * 3 +
        stats.likes * 5 +
        Math.floor(stats.views * 0.1),
    }))
    .sort((a, b) => {
      if (mode === "likes") return b.likes - a.likes;
      if (mode === "views") return b.views - a.views;
      return b.score - a.score; // 기본: 종합 점수
    })
    .slice(0, 10);

  // 전체 학교 평균 계산
  const schoolCount = schoolMap.size;
  const totals = { posts: 0, likes: 0, comments: 0, views: 0 };
  for (const stats of schoolMap.values()) {
    totals.posts += stats.posts;
    totals.likes += stats.likes;
    totals.comments += stats.comments;
    totals.views += stats.views;
  }
  const averages = {
    posts: schoolCount > 0 ? Math.round((totals.posts / schoolCount) * 10) / 10 : 0,
    likes: schoolCount > 0 ? Math.round((totals.likes / schoolCount) * 10) / 10 : 0,
    comments: schoolCount > 0 ? Math.round((totals.comments / schoolCount) * 10) / 10 : 0,
    views: schoolCount > 0 ? Math.round((totals.views / schoolCount) * 10) / 10 : 0,
  };

  // 특정 학교 데이터 (top 10에 없을 수 있으므로 별도 조회)
  const targetSchool = searchParams.get("schoolCode");
  let mySchool: { posts: number; likes: number; comments: number; views: number } | null = null;
  if (targetSchool) {
    const stats = schoolMap.get(targetSchool);
    mySchool = stats
      ? { posts: stats.posts, likes: stats.likes, comments: stats.comments, views: stats.views }
      : { posts: 0, likes: 0, comments: 0, views: 0 };
  }

  return NextResponse.json({ ranking, averages, totalSchools: schoolCount, mySchool });
}
