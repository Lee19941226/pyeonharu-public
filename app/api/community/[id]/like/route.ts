import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/utils/action-log";

// POST /api/community/[id]/like — 게시글 좋아요 토글
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

  const body = await req.json().catch(() => ({}));
  const commentId = body.commentId || null;

  if (commentId) {
    // 댓글 좋아요 토글
    const { data: existing } = await supabase
      .from("community_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("comment_id", commentId)
      .maybeSingle();

    if (existing) {
      await supabase.from("community_likes").delete().eq("id", existing.id);
      return NextResponse.json({ liked: false });
    } else {
      const { error } = await supabase.from("community_likes").insert({
        user_id: user.id,
        comment_id: commentId,
      });
      if (error) {
        console.error("[community/like]", error.message);
        return NextResponse.json(
          { error: "서버 오류가 발생했습니다." },
          { status: 500 },
        );
      }
      logAction({
        userId: user.id,
        actionType: "community_like",
        metadata: { post_id: postId, comment_id: commentId, liked: true },
      });
      return NextResponse.json({ liked: true });
    }
  } else {
    // 게시글 좋아요 토글
    const { data: existing } = await supabase
      .from("community_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      await supabase.from("community_likes").delete().eq("id", existing.id);
      return NextResponse.json({ liked: false });
    } else {
      const { error } = await supabase.from("community_likes").insert({
        user_id: user.id,
        post_id: postId,
      });
      if (error) {
        console.error("[community/like]", error.message);
        return NextResponse.json(
          { error: "서버 오류가 발생했습니다." },
          { status: 500 },
        );
      }
      logAction({
        userId: user.id,
        actionType: "community_like",
        metadata: { post_id: postId, liked: true },
      });
      return NextResponse.json({ liked: true });
    }
  }
}
