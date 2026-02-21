"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Clock,
  Database,
  TrendingUp,
  FileText,
  Globe,
  Cpu,
} from "lucide-react";

interface SearchLog {
  id: string;
  user_id: string | null;
  search_query: string;
  result_count: number;
  data_sources: {
    db: number;
    openapi: number;
    openfood: number;
    ai: number;
  };
  searched_at: string;
  ip_address: string;
  user_agent: string;
}

interface SearchLogsResponse {
  logs: SearchLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    totalSearches: number;
    loggedInSearches: number;
    anonymousSearches: number;
    withResults: number;
    avgResults: string;
    sourceStats: {
      db: number;
      openapi: number;
      openfood: number;
      ai: number;
    };
  };
  topQueries: { query: string; count: number }[];
}

export default function SearchLogs() {
  const [data, setData] = useState<SearchLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(30);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        period: String(period),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/search-logs?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Search logs fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [page, period, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* 기간 선택 + 검색 */}
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

        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="검색어로 필터링..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">
              {data.stats.totalSearches.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">총 검색</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold">
              {data.stats.loggedInSearches.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">로그인</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <Globe className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold">
              {data.stats.anonymousSearches.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">비로그인</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold">
              {(
                (data.stats.withResults / data.stats.totalSearches) *
                100
              ).toFixed(1)}
              %
            </p>
            <p className="text-xs text-muted-foreground">결과 있음</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">{data.stats.avgResults}</p>
            <p className="text-xs text-muted-foreground">평균 결과</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-5 w-5 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold">
              {data.stats.sourceStats.db.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">DB 히트</p>
          </div>
        </div>
      )}

      {/* 인기 검색어 */}
      {data && data.topQueries.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            인기 검색어 TOP 10
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {data.topQueries.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
              >
                <span className="text-sm font-bold text-primary">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.query}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.count}회
                  </p>
                </div>
              </div>
            ))}
          </div>
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

      {/* 검색 로그 테이블 */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mb-3" />
          <p>검색 기록이 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">검색어</th>
                <th className="px-4 py-3 text-center font-medium">결과</th>
                <th className="px-4 py-3 text-center font-medium">
                  데이터 소스
                </th>
                <th className="px-4 py-3 text-center font-medium">사용자</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">
                  IP
                </th>
                <th className="px-4 py-3 text-left font-medium">시간</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.search_query}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.result_count > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {log.result_count}개
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      {log.data_sources.db > 0 && (
                        <span className="text-cyan-600" title="DB">
                          DB:{log.data_sources.db}
                        </span>
                      )}
                      {log.data_sources.openapi > 0 && (
                        <span className="text-blue-600" title="식약처">
                          API:{log.data_sources.openapi}
                        </span>
                      )}
                      {log.data_sources.openfood > 0 && (
                        <span className="text-amber-600" title="수입">
                          수입:{log.data_sources.openfood}
                        </span>
                      )}
                      {log.data_sources.ai > 0 && (
                        <span className="text-purple-600" title="AI">
                          AI:{log.data_sources.ai}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {log.user_id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <User className="h-3 w-3" />
                        로그인
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        <Globe className="h-3 w-3" />
                        비로그인
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    {log.ip_address}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.searched_at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
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
