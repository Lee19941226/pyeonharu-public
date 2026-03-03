"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Clock,
  Globe,
  Filter,
  ScanLine,
  UtensilsCrossed,
  MessageSquare,
  Heart,
  Trash2,
  UserCog,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ───
interface ActionLog {
  id: string;
  user_id: string | null;
  action_type: string;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown>;
  created_at: string;
  nickname: string;
}

interface ActionLogsResponse {
  logs: ActionLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  actionCounts: Record<string, number>;
}

// ─── 액션 타입 정의 ───
const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Search }
> = {
  food_search: {
    label: "음식 검색",
    color: "bg-cyan-100 text-cyan-700",
    icon: Search,
  },
  food_scan: {
    label: "바코드 스캔",
    color: "bg-orange-100 text-orange-700",
    icon: ScanLine,
  },
  food_check: {
    label: "안전 확인",
    color: "bg-pink-100 text-pink-700",
    icon: Search,
  },
  community_post_create: {
    label: "게시글 작성",
    color: "bg-indigo-100 text-indigo-700",
    icon: MessageSquare,
  },
  community_comment_create: {
    label: "댓글 작성",
    color: "bg-purple-100 text-purple-700",
    icon: MessageSquare,
  },
  community_comment_delete: {
    label: "댓글 삭제",
    color: "bg-gray-100 text-gray-600",
    icon: Trash2,
  },
  community_like: {
    label: "좋아요",
    color: "bg-red-100 text-red-700",
    icon: Heart,
  },
  diet_entry_create: {
    label: "식단 기록",
    color: "bg-lime-100 text-lime-700",
    icon: UtensilsCrossed,
  },
  diet_entry_delete: {
    label: "식단 삭제",
    color: "bg-gray-100 text-gray-600",
    icon: Trash2,
  },
  profile_update: {
    label: "프로필 수정",
    color: "bg-blue-100 text-blue-700",
    icon: UserCog,
  },
  account_delete: {
    label: "회원 탈퇴",
    color: "bg-gray-200 text-gray-800",
    icon: Trash2,
  },
};

function getActionConfig(type: string) {
  return (
    ACTION_CONFIG[type] || {
      label: type,
      color: "bg-gray-100 text-gray-700",
      icon: Filter,
    }
  );
}

export default function ActionLogs() {
  const [data, setData] = useState<ActionLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [ipInput, setIpInput] = useState("");
  const [ip, setIp] = useState("");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(30);
  const [actionType, setActionType] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        period: String(period),
        ...(search && { search }),
        ...(actionType && { actionType }),
        ...(ip && { ip }),
      });
      const res = await fetch(`/api/admin/action-logs?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Action logs fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [page, period, search, actionType, ip]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setIp(ipInput);
    setPage(1);
  };

  const totalActions = data
    ? Object.values(data.actionCounts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* 기간 선택 + 필터 */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setPeriod(d);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}일
              </button>
            ))}
          </div>

          {/* 액션 타입 필터 */}
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">전체 액션</option>
            {Object.entries(ACTION_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 검색 바 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="닉네임 또는 UUID로 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 w-full rounded-lg border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative flex-1 max-w-xs">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="IP 주소로 검색..."
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              className="h-10 w-full rounded-lg border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            필터
          </button>
        </form>
      </div>

      {/* 통계 카드 */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{totalActions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">총 액션</p>
          </div>

          {Object.entries(data.actionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => {
              const config = getActionConfig(type);
              const Icon = config.icon;
              return (
                <div key={type} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              );
            })}
        </div>
      )}

      {/* 통계 바 */}
      {data && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            전체 <strong className="text-foreground">{data.total}</strong>건
          </span>
          <span>·</span>
          <span>
            페이지 {data.page} / {data.totalPages}
          </span>
        </div>
      )}

      {/* 액션 로그 테이블 */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Filter className="h-10 w-10 mb-3" />
          <p>활동 기록이 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">시간</th>
                <th className="px-4 py-3 text-left font-medium">사용자</th>
                <th className="px-4 py-3 text-center font-medium">액션</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">
                  IP
                </th>
                <th className="px-4 py-3 text-center font-medium">상세</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => {
                const config = getActionConfig(log.action_type);
                const isExpanded = expandedRow === log.id;
                return (
                  <tr key={log.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {log.user_id ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <User className="h-3 w-3" />
                            {log.nickname}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            <Globe className="h-3 w-3" />
                            비로그인
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell font-mono">
                      {log.ip_address}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : log.id)
                        }
                        className="rounded-md p-1 hover:bg-muted transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 확장된 메타데이터 */}
          {expandedRow && data?.logs && (
            (() => {
              const log = data.logs.find((l) => l.id === expandedRow);
              if (!log) return null;
              return (
                <div className="border-t bg-muted/20 px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        User ID
                      </p>
                      <p className="font-mono text-xs">
                        {log.user_id || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        User-Agent
                      </p>
                      <p className="font-mono text-xs truncate" title={log.user_agent}>
                        {log.user_agent}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        메타데이터
                      </p>
                      <pre className="rounded-lg bg-muted p-3 text-xs font-mono overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* 페이지네이션 */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border p-2 hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
            const start = Math.max(
              1,
              Math.min(page - 2, data.totalPages - 4),
            );
            const p = start + i;
            if (p > data.totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  p === page
                    ? "bg-primary text-primary-foreground"
                    : "border hover:bg-muted"
                }`}
              >
                {p}
              </button>
            );
          })}
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
