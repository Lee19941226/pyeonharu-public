"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";

interface Inquiry {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  category: string;
  title: string;
  content: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface InquiriesResponse {
  inquiries: Inquiry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    pending: number;
    in_progress: number;
    resolved: number;
  };
}

const CATEGORY_MAP: Record<string, { label: string; emoji: string }> = {
  bug: { label: "버그 신고", emoji: "🐛" },
  feature: { label: "기능 제안", emoji: "💡" },
  account: { label: "계정 문제", emoji: "🔐" },
  allergy: { label: "알레르기 정보 오류", emoji: "⚠️" },
  general: { label: "일반 문의", emoji: "💬" },
};

const STATUS_MAP: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "접수됨",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  in_progress: {
    label: "처리 중",
    color: "bg-blue-100 text-blue-800",
    icon: AlertCircle,
  },
  resolved: {
    label: "답변 완료",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
};

export default function SupportManagement() {
  const [data, setData] = useState<InquiriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // 확장된 문의
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 답변 작성
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // 삭제 확인
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/support?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Support fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // 답변 보내기
  const handleReply = async (inquiryId: string) => {
    if (!replyText.trim()) return toast.error("답변 내용을 입력해주세요");

    setReplying(true);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          admin_reply: replyText.trim(),
          status: "resolved",
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("답변이 등록되었습니다");
        setReplyText("");
        fetchInquiries();
      } else {
        toast.error(result.error || "답변 등록 실패");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setReplying(false);
    }
  };

  // 상태 변경
  const handleStatusChange = async (inquiryId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId, status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("상태가 변경되었습니다");
        fetchInquiries();
      }
    } catch {
      toast.error("상태 변경 실패");
    }
  };

  // 삭제
  const handleDelete = async (inquiryId: string) => {
    try {
      const res = await fetch("/api/admin/support", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("문의가 삭제되었습니다");
        setDeleteConfirm(null);
        fetchInquiries();
      }
    } catch {
      toast.error("삭제 실패");
    }
  };

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{data.stats.total}</p>
            <p className="text-xs text-muted-foreground">전체 문의</p>
          </div>
          <div className="rounded-xl border bg-yellow-50 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">
              {data.stats.pending}
            </p>
            <p className="text-xs text-yellow-600">대기 중</p>
          </div>
          <div className="rounded-xl border bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {data.stats.in_progress}
            </p>
            <p className="text-xs text-blue-600">처리 중</p>
          </div>
          <div className="rounded-xl border bg-green-50 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {data.stats.resolved}
            </p>
            <p className="text-xs text-green-600">답변 완료</p>
          </div>
        </div>
      )}

      {/* 필터 + 검색 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
          {[
            { value: "", label: "전체" },
            { value: "pending", label: "대기" },
            { value: "in_progress", label: "처리 중" },
            { value: "resolved", label: "완료" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="제목, 이름, 이메일 검색..."
              className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            검색
          </button>
        </form>
      </div>

      {/* 문의 목록 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MessageSquareText className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">문의가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.inquiries.map((inq) => {
            const cat = CATEGORY_MAP[inq.category] || {
              label: inq.category,
              emoji: "📝",
            };
            const st = STATUS_MAP[inq.status] || STATUS_MAP.pending;
            const isExpanded = expandedId === inq.id;

            return (
              <div
                key={inq.id}
                className="rounded-xl border bg-card shadow-sm overflow-hidden"
              >
                {/* 헤더 */}
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : inq.id);
                    setReplyText(inq.admin_reply || "");
                    setDeleteConfirm(null);
                  }}
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}
                      >
                        <st.icon className="h-3 w-3" />
                        {st.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {cat.emoji} {cat.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(inq.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate">{inq.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inq.name} · {inq.email}
                      {inq.user_id && (
                        <span className="ml-1 text-primary">(회원)</span>
                      )}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-4">
                    {/* 문의 내용 */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        📩 문의 내용
                      </p>
                      <div
                        className="prose prose-sm max-w-none rounded-lg bg-muted/40 p-3 text-sm"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inq.content) }}
                      />
                    </div>

                    {/* 상태 변경 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        상태:
                      </span>
                      {["pending", "in_progress", "resolved"].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(inq.id, s)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                            inq.status === s
                              ? STATUS_MAP[s].color
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {STATUS_MAP[s].label}
                        </button>
                      ))}
                    </div>

                    {/* 기존 답변 */}
                    {inq.admin_reply && (
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs font-semibold text-green-700 mb-1">
                          ✅ 관리자 답변
                          {inq.replied_at && (
                            <span className="ml-2 font-normal text-green-600">
                              {new Date(inq.replied_at).toLocaleString("ko-KR")}
                            </span>
                          )}
                        </p>
                        <div
                          className="prose prose-sm max-w-none text-sm text-green-800"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inq.admin_reply) }}
                        />
                      </div>
                    )}

                    {/* 답변 작성 */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        ✏️ {inq.admin_reply ? "답변 수정" : "답변 작성"}
                      </p>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="답변을 입력하세요..."
                        rows={4}
                        className="w-full rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReply(inq.id)}
                            disabled={replying || !replyText.trim()}
                            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            {replying ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            답변 등록
                          </button>
                          <a
                            href={`mailto:${inq.email}?subject=Re: [편하루] ${inq.title}`}
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            이메일 보내기
                          </a>
                        </div>

                        {/* 삭제 */}
                        {deleteConfirm === inq.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-destructive">
                              삭제할까요?
                            </span>
                            <button
                              onClick={() => handleDelete(inq.id)}
                              className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground"
                            >
                              확인
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg border px-3 py-1.5 text-xs"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(inq.id)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border p-2 hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium tabular-nums">
            {page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="rounded-lg border p-2 hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
