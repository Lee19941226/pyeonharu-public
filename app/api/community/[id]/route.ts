import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

// GET /api/community/[id] — 게시글 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // 게시글 조회
  const { data: post, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) {
    console.error("게시글 조회 실패:", error);
    return NextResponse.json(
      { error: "게시글을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // 조회수 중복 방어 (쿠키 기반 24시간)
  const viewedCookie = req.cookies.get(`viewed_${id}`)?.value;
  let newViewCount = post.view_count || 0;

  if (!viewedCookie) {
    newViewCount += 1;
    const { error: viewCountError } = await supabase
      .from("community_posts")
      .update({ view_count: newViewCount })
      .eq("id", id);
    if (viewCountError) {
      console.error("[Community] 조회수 업데이트 실패:", viewCountError.message);
    }
  }

  // 작성자 닉네임 조회
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", post.user_id)
    .single();

  // 학교 이름 조회
  const { data: schoolInfo } = await supabase
    .from("user_schools")
    .select("school_name")
    .eq("school_code", post.school_code)
    .limit(1)
    .maybeSingle();

  // 댓글 조회
  const { data: comments } = await supabase
    .from("community_comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  // 댓글 작성자 닉네임 일괄 조회
  const commentUserIds = [...new Set((comments || []).map((c) => c.user_id))];
  const profileMap: Record<
    string,
    { nickname: string; avatar_url: string | null }
  > = {};

  if (commentUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", commentUserIds);

    for (const p of profiles || []) {
      profileMap[p.id] = {
        nickname: p.nickname || "익명",
        avatar_url: p.avatar_url,
      };
    }
  }

  // 로그인 사용자 좋아요 여부
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isPostLiked = false;
  let likedCommentIds: Set<string> = new Set();

  if (user) {
    const { data: postLike } = await supabase
      .from("community_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", id)
      .maybeSingle();

    isPostLiked = !!postLike;

    if (comments && comments.length > 0) {
      const commentIds = comments.map((c) => c.id);
      const { data: commentLikes } = await supabase
        .from("community_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", commentIds);

      likedCommentIds = new Set((commentLikes || []).map((l) => l.comment_id));
    }
  }

  // 댓글을 트리 구조로 변환
  const allComments = (comments || []).map((c) => ({
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    parentId: c.parent_id,
    content: c.content,
    likeCount: c.like_count,
    author: profileMap[c.user_id]?.nickname || "익명",
    avatarUrl: profileMap[c.user_id]?.avatar_url || null,
    isLiked: likedCommentIds.has(c.id),
    isOwner: user?.id === c.user_id,
    createdAt: c.created_at,
    replies: [] as any[],
  }));

  // 1단 댓글과 대댓글 분리
  const topComments = allComments.filter((c) => !c.parentId);
  const replies = allComments.filter((c) => c.parentId);

  // 대댓글을 부모에 연결
  for (const reply of replies) {
    const parent = topComments.find((c) => c.id === reply.parentId);
    if (parent) {
      parent.replies.push(reply);
    }
  }

  const response = NextResponse.json({
    post: {
      ...post,
      schoolName: schoolInfo?.school_name || post.school_code,
      author: authorProfile?.nickname || "익명",
      avatarUrl: authorProfile?.avatar_url || null,
      isLiked: isPostLiked,
      isOwner: user?.id === post.user_id,
      view_count: newViewCount,
    },
    comments: topComments,
  });

  // 24시간 동안 중복 조회 방지 쿠키
  if (!viewedCookie) {
    response.cookies.set(`viewed_${id}`, "1", {
      maxAge: 60 * 60 * 24, // 24시간
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
}

// PUT /api/community/[id] — 게시글 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const body = await req.json();
  const { title, content, imageUrls } = body;
  if (!title?.trim() || !content?.trim()) {
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

  const { data, error } = await supabase
    .from("community_posts")
    .update({
      title: stripHtml(title),
      content: stripHtml(content),
      image_urls: imageUrls,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id) // 본인만
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "수정 권한이 없거나 게시글을 찾을 수 없습니다." },
      { status: 403 },
    );
  }

  return NextResponse.json({ success: true, post: data });
}

// DELETE /api/community/[id] — 게시글 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "삭제 권한이 없거나 게시글을 찾을 수 없습니다." },
      { status: 403 },
    );
  }

  return NextResponse.json({ success: true });
}
