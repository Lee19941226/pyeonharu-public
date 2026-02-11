import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/community/[id]/comments — 댓글/대댓글 작성
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const body = await req.json()
  const { content, parentId } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: "댓글 내용을 입력해주세요." }, { status: 400 })
  }

  // 대댓글인 경우 부모 댓글이 같은 게시글에 속하는지 확인
  if (parentId) {
    const { data: parent } = await supabase
      .from("community_comments")
      .select("id, parent_id")
      .eq("id", parentId)
      .eq("post_id", postId)
      .single()

    if (!parent) {
      return NextResponse.json({ error: "부모 댓글을 찾을 수 없습니다." }, { status: 404 })
    }

    // 2단까지만 허용 (대댓글의 대댓글 불가)
    if (parent.parent_id) {
      return NextResponse.json({ error: "대댓글에는 답글을 달 수 없습니다." }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from("community_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      parent_id: parentId || null,
      content: content.trim(),
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 작성자 닉네임 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    success: true,
    comment: {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      parentId: data.parent_id,
      content: data.content,
      likeCount: 0,
      author: profile?.nickname || "익명",
      avatarUrl: profile?.avatar_url || null,
      isLiked: false,
      isOwner: true,
      createdAt: data.created_at,
      replies: [],
    },
  })
}

// DELETE /api/community/[id]/comments?commentId=xxx — 댓글 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get("commentId")

  if (!commentId) {
    return NextResponse.json({ error: "commentId가 필요합니다." }, { status: 400 })
  }

  const { error } = await supabase
    .from("community_comments")
    .delete()
    .eq("id", commentId)
    .eq("post_id", postId)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: "삭제 권한이 없거나 댓글을 찾을 수 없습니다." }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
