"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { HomeTabNav } from "@/components/layout/home-tab-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Eye,
  Trash2,
  Edit,
  Send,
  CornerDownRight,
  Loader2,
  MoreHorizontal,
  Image as ImageIcon,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { Flag } from "lucide-react";
interface Post {
  id: string;
  school_code: string;
  schoolName: string;
  title: string;
  content: string;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  view_count: number;
  author: string;
  avatarUrl: string | null;
  isLiked: boolean;
  isOwner: boolean;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  likeCount: number;
  author: string;
  isLiked: boolean;
  isOwner: boolean;
  createdAt: string;
  parentId: string | null;
  replies: Comment[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [commentInput, setCommentInput] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment";
    commentId?: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    loadPost();
  }, [id]);

  const loadPost = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/community/${id}`);
      if (!res.ok) {
        router.push("/community");
        return;
      }
      const data = await res.json();
      setPost(data.post);
      setComments(data.comments || []);
    } catch {
      router.push("/community");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikePost = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    if (likeLoading || !post) return;
    setLikeLoading(true);

    try {
      const res = await fetch(`/api/community/${id}/like`, { method: "POST" });
      const data = await res.json();
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLiked: data.liked,
              like_count: prev.like_count + (data.liked ? 1 : -1),
            }
          : null,
      );
    } catch {
      toast.error("좋아요 처리 실패");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }

    try {
      const res = await fetch(`/api/community/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();

      const updateComments = (list: Comment[]): Comment[] =>
        list.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              isLiked: data.liked,
              likeCount: c.likeCount + (data.liked ? 1 : -1),
            };
          }
          if (c.replies.length > 0) {
            return { ...c, replies: updateComments(c.replies) };
          }
          return c;
        });

      setComments(updateComments(comments));
    } catch {
      toast.error("좋아요 처리 실패");
    }
  };

  const handleReport = async () => {
    if (!reportTarget || !reportReason) return;
    setIsReporting(true);
    try {
      const res = await fetch(`/api/community/${id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          commentId: reportTarget.commentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "신고 실패");
      } else {
        toast.success("신고가 접수되었습니다.");
        setShowReportModal(false);
        setReportReason("");
      }
    } catch {
      toast.error("신고 처리 중 오류가 발생했습니다.");
    } finally {
      setIsReporting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    if (!commentInput.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/community/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentInput,
          parentId: replyTo?.id || null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (replyTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyTo.id
                ? { ...c, replies: [...c.replies, data.comment] }
                : c,
            ),
          );
        } else {
          setComments((prev) => [...prev, data.comment]);
        }

        setCommentInput("");
        setReplyTo(null);
        setPost((prev) =>
          prev ? { ...prev, comment_count: prev.comment_count + 1 } : null,
        );
        toast.success("댓글이 작성되었습니다");
      }
    } catch {
      toast.error("댓글 작성 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(
        `/api/community/${id}/comments?commentId=${commentId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        const newComments = comments
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies.filter((r) => r.id !== commentId),
          }));
        setComments(newComments);
        setPost((prev) =>
          prev
            ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) }
            : null,
        );
        toast.success("댓글이 삭제되었습니다");
      }
    } catch {
      toast.error("삭제 실패");
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."))
      return;

    try {
      const res = await fetch(`/api/community/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("게시글이 삭제되었습니다");
        router.push("/community");
      }
    } catch {
      toast.error("삭제 실패");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <HomeTabNav />
        <main className="flex-1 pb-20">
          <div className="container mx-auto px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <HomeTabNav />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-4">
            {/* 뒤로가기 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/community")}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> 목록으로
            </Button>

            {/* 게시글 */}
            <Card>
              <CardContent className="p-5">
                {/* 메타 */}
                <div className="mb-3">
                  <Badge variant="outline" className="text-xs">
                    <GraduationCap className="mr-1 h-3 w-3" />
                    {post.schoolName || post.school_code}
                  </Badge>
                </div>

                {/* 제목 */}
                <h1 className="mb-2 text-lg font-bold">{post.title}</h1>

                {/* 작성자 + 날짜 */}
                <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {post.author}
                    </span>
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" />
                      {post.view_count}
                    </span>
                  </div>
                </div>

                {/* 내용 — HTML 렌더링 */}
                <div
                  className="mb-4 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(post.content),
                  }}
                />

                {/* 좋아요 + 액션 */}
                <div className="flex items-center justify-between border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLikePost}
                    disabled={likeLoading}
                    className={`gap-1.5 ${post.isLiked ? "text-red-500" : ""}`}
                  >
                    <Heart
                      className={`h-4 w-4 ${post.isLiked ? "fill-red-500" : ""}`}
                    />
                    좋아요 {post.like_count}
                  </Button>
                  {user && !post.isOwner && (
                    <button
                      onClick={() => {
                        setReportTarget({ type: "post" });
                        setShowReportModal(true);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      신고
                    </button>
                  )}
                  {post.isOwner && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/community/write?edit=${id}`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeletePost}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 댓글 섹션 */}
            <div>
              <h2 className="mb-3 text-sm font-semibold">
                댓글 {post.comment_count}개
              </h2>

              {/* 댓글 목록 */}
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id}>
                    <CommentItem
                      comment={comment}
                      onLike={() => handleLikeComment(comment.id)}
                      onReply={() => {
                        setReplyTo({ id: comment.id, author: comment.author });
                        setCommentInput("");
                      }}
                      onDelete={() => handleDeleteComment(comment.id)}
                    />

                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="ml-8 mt-1">
                        <CommentItem
                          comment={reply}
                          isReply
                          onLike={() => handleLikeComment(reply.id)}
                          onDelete={() => handleDeleteComment(reply.id)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* 댓글 입력 */}
              {user ? (
                <div className="mt-4 space-y-2">
                  {replyTo && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CornerDownRight className="h-3 w-3" />
                      <span>{replyTo.author}님에게 답글</span>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="text-destructive hover:underline"
                      >
                        취소
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={
                        replyTo
                          ? `${replyTo.author}님에게 답글 작성...`
                          : "댓글을 작성하세요..."
                      }
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="min-h-[60px] resize-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={handleSubmitComment}
                      disabled={submitting || !commentInput.trim()}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Card className="mt-4 border-dashed">
                  <CardContent className="flex items-center justify-between p-3">
                    <p className="text-xs text-muted-foreground">
                      댓글을 작성하려면 로그인하세요
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/login")}
                    >
                      로그인
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-bold text-gray-900">
              신고 사유 선택
            </h2>
            <div className="space-y-2">
              {[
                "스팸/광고",
                "욕설/비방",
                "허위정보",
                "개인정보 노출",
                "기타",
              ].map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reportReason === r}
                    onChange={() => setReportReason(r)}
                    className="accent-red-500"
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                }}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason || isReporting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-red-600"
              >
                {isReporting ? "신고 중..." : "신고하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  isReply,
  onLike,
  onReply,
  onDelete,
}: {
  comment: Comment;
  isReply?: boolean;
  onLike: () => void;
  onReply?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${isReply ? "bg-muted/30" : ""}`}>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {isReply && (
            <CornerDownRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="font-medium">{comment.author}</span>
          <span className="text-muted-foreground">
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        {comment.isOwner && (
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      <p className="mb-2 text-sm whitespace-pre-wrap">{comment.content}</p>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <button
          onClick={onLike}
          className={`flex items-center gap-0.5 hover:text-red-500 ${comment.isLiked ? "text-red-500" : ""}`}
        >
          <Heart
            className={`h-3 w-3 ${comment.isLiked ? "fill-red-500" : ""}`}
          />
          {comment.likeCount > 0 && comment.likeCount}
        </button>
        {!isReply && onReply && (
          <button
            onClick={onReply}
            className="flex items-center gap-0.5 hover:text-foreground"
          >
            <MessageCircle className="h-3 w-3" /> 답글
          </button>
        )}
      </div>
    </div>
  );
}
