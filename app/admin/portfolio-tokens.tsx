"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Loader2,
  Copy,
  Check,
  Ban,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

interface Token {
  id: string;
  token: string;
  label: string;
  valid_from: string;
  valid_until: string;
  is_revoked: boolean;
  created_at: string;
  last_used_at: string | null;
  use_count: number;
}

type TokenStatus = "active" | "scheduled" | "expired" | "revoked";

function getTokenStatus(t: Token): TokenStatus {
  if (t.is_revoked) return "revoked";
  const now = new Date();
  if (now < new Date(t.valid_from)) return "scheduled";
  if (now > new Date(t.valid_until)) return "expired";
  return "active";
}

const STATUS_CONFIG: Record<
  TokenStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  active: {
    label: "활성",
    color: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400",
    icon: CheckCircle,
  },
  scheduled: {
    label: "예약",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
    icon: CalendarClock,
  },
  expired: {
    label: "만료",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: Clock,
  },
  revoked: {
    label: "취소",
    color: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400",
    icon: XCircle,
  },
};

export default function PortfolioTokens() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [customToken, setCustomToken] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [creating, setCreating] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portfolio-tokens");
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch (e) {
      console.error("Token fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const stats = {
    total: tokens.length,
    active: tokens.filter((t) => getTokenStatus(t) === "active").length,
    expired: tokens.filter((t) => getTokenStatus(t) === "expired").length,
    revoked: tokens.filter((t) => getTokenStatus(t) === "revoked").length,
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !validFrom || !validUntil) {
      toast.error("레이블, 시작일, 종료일을 입력해 주세요.");
      return;
    }

    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(untilDate.getTime())
    ) {
      toast.error("유효한 날짜/시간을 입력해 주세요.");
      return;
    }

    if (fromDate >= untilDate) {
      toast.error("종료일은 시작일보다 늦어야 합니다.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/portfolio-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          token: customToken.trim() || undefined,
          validFrom: fromDate.toISOString(),
          validUntil: untilDate.toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`토큰이 생성되었습니다: ${data.token.token}`);
        setLabel("");
        setCustomToken("");
        setValidFrom("");
        setValidUntil("");
        setShowForm(false);
        fetchTokens();
      } else {
        toast.error(data.error || "토큰 생성 실패");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string, currentlyRevoked: boolean) {
    try {
      const res = await fetch("/api/admin/portfolio-tokens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_revoked: !currentlyRevoked }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          currentlyRevoked
            ? "토큰을 복원했습니다."
            : "토큰을 취소했습니다.",
        );
        fetchTokens();
      } else {
        toast.error(data.error || "처리 실패");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/admin/portfolio-tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("토큰을 삭제했습니다.");
        setDeleteConfirm(null);
        fetchTokens();
      } else {
        toast.error(data.error || "삭제 실패");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  }

  function handleCopy(token: string, id: string) {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    toast.success("토큰을 복사했습니다.");
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">전체 토큰</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-4 text-center dark:bg-green-950/20">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {stats.active}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">활성</p>
        </div>
        <div className="rounded-xl border bg-gray-50 p-4 text-center dark:bg-gray-800/30">
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {stats.expired}
          </p>
          <p className="text-xs text-gray-500">만료</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-4 text-center dark:bg-red-950/20">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
            {stats.revoked}
          </p>
          <p className="text-xs text-red-600 dark:text-red-500">취소</p>
        </div>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          토큰 생성
        </button>
      ) : (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border bg-card p-5"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Key className="h-4 w-4" />
            새 포트폴리오 토큰 생성
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                레이블 (용도) *
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="예: 2026 상반기 면접용"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                커스텀 토큰 (선택)
              </label>
              <input
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                placeholder="미입력 시 자동 생성 (예: pyeon-a3k9)"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                시작일 *
              </label>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                종료일 *
              </label>
              <input
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              생성
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Key className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">생성된 토큰이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => {
            const status = getTokenStatus(t);
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;

            return (
              <div key={t.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold">
                        {t.token}
                      </code>
                      <button
                        onClick={() => handleCopy(t.token, t.id)}
                        className="rounded-md p-1 transition-colors hover:bg-muted"
                        title="토큰 복사"
                      >
                        {copiedId === t.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        기간: {formatDate(t.valid_from)} ~ {formatDate(t.valid_until)}
                      </span>
                      <span>사용: {t.use_count}회</span>
                      {t.last_used_at && (
                        <span>
                          마지막 사용: {new Date(t.last_used_at).toLocaleString("ko-KR")}
                        </span>
                      )}
                      <span>
                        생성: {new Date(t.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() => handleRevoke(t.id, t.is_revoked)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        t.is_revoked
                          ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          : "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                      }`}
                      title={t.is_revoked ? "복원" : "취소"}
                    >
                      {t.is_revoked ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          복원
                        </>
                      ) : (
                        <>
                          <Ban className="h-3.5 w-3.5" />
                          취소
                        </>
                      )}
                    </button>

                    {deleteConfirm === t.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-destructive">삭제?</span>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="rounded-md bg-destructive px-2 py-1 text-[10px] font-medium text-destructive-foreground"
                        >
                          확인
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-md border px-2 py-1 text-[10px]"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(t.id)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
