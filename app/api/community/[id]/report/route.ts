import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_REASONS = [
  "스팸/광고",
  "욕설/비방",
  "허위정보",
  "개인정보 노출",
  "기타",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;
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
  const { reason, commentId } = body;

  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: "올바른 신고 사유를 선택해주세요." },
      { status: 400 },
    );
  }

  // 본인 게시글/댓글 신고 방지
  if (commentId) {
    // commentId가 해당 postId 소속인지 검증
    const { data: comment } = await supabase
      .from("community_comments")
      .select("user_id")
      .eq("id", commentId)
      .eq("post_id", postId)
      .maybeSingle();

    if (!comment) {
      return NextResponse.json(
        { error: "존재하지 않는 댓글입니다." },
        { status: 403 },
      );
    }

    if (comment.user_id === user.id) {
      return NextResponse.json(
        { error: "본인 댓글은 신고할 수 없습니다." },
        { status: 400 },
      );
    }
  } else {
    const { data: post } = await supabase
      .from("community_posts")
      .select("user_id")
      .eq("id", postId)
      .single();
    if (post?.user_id === user.id) {
      return NextResponse.json(
        { error: "본인 게시글은 신고할 수 없습니다." },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase.from("community_reports").insert({
    post_id: commentId ? null : postId,
    comment_id: commentId || null,
    reporter_id: user.id,
    reason,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 신고한 게시물입니다." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "신고 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
