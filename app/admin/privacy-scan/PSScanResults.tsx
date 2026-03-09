"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Info,
} from "lucide-react";

interface ScanResult {
  id: string;
  agent_id: string;
  device_name: string;
  scan_round: number;
  total_files: number;
  detected_files: number;
  detected_count: number;
  status: string;
  scanned_at: string;
}

interface ScanFile {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  pattern_names: string[];
  detected_patterns: { pattern_name: string; count: number; masked_texts?: string[] }[];
  last_modified_at: string;
}

interface ScanDetail {
  result: ScanResult;
  files: ScanFile[];
}

export default function PSScanResults() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<ScanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const limit = 15;
  const totalPages = Math.ceil(total / limit);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/privacy-scan/scan-results?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/privacy-scan/scan-results/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    window.open(`/api/admin/privacy-scan/scan-results/export?${params}`, "_blank");
  };

  const statusBadge = (status: string) => {
    const cfg: Record<string, string> = {
      running: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
      completed: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
      failed: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Guide */}
      <div className="flex items-start gap-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">각 서버(에이전트)별 검사 결과를 확인하고 파일별 상세 검출 내역을 조회</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">에이전트가 검사를 완료하면 서버별 집계 결과가 표시됩니다. 행을 클릭하면 파일별 상세 정보를 확인할 수 있습니다.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">전체 상태</option>
            <option value="running">진행중</option>
            <option value="completed">완료</option>
            <option value="failed">실패</option>
          </select>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          엑셀 다운로드
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-sm text-gray-400">
            검사결과가 없습니다
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">서버명</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">회차</th>
                  <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden md:table-cell">전체파일</th>
                  <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">검출파일</th>
                  <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">검출수</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">상태</th>
                  <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">검사일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {results.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openDetail(r.id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">{r.device_name || "-"}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500 hidden sm:table-cell">{r.scan_round}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500 hidden md:table-cell">{r.total_files.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-200 font-medium">{r.detected_files.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-red-600 dark:text-red-400">{r.detected_count.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">{statusBadge(r.status)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs hidden sm:table-cell">
                      {new Date(r.scanned_at).toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  page === p
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                    : "border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          onClick={() => setDetail(null)}
        >
          <div
            className="mx-4 w-full max-w-3xl max-h-[80vh] overflow-auto rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                검사 상세
              </h3>
              <button onClick={() => setDetail(null)}>
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            {detailLoading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400">서버명</span>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{detail.result.device_name || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">전체파일</span>
                    <p className="font-semibold">{detail.result.total_files.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">검출파일</span>
                    <p className="font-semibold text-red-600">{detail.result.detected_files.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">검출수</span>
                    <p className="font-semibold text-red-600">{detail.result.detected_count.toLocaleString()}</p>
                  </div>
                </div>
                {detail.files.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500">파일명</th>
                          <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">경로</th>
                          <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500">크기</th>
                          <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-gray-500">검출 패턴</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {detail.files.map((f) => (
                          <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200 text-xs">{f.file_name}</td>
                            <td className="px-3 py-2 text-gray-400 text-xs hidden sm:table-cell max-w-[200px] truncate">{f.file_path}</td>
                            <td className="px-3 py-2 text-right text-gray-500 text-xs">{formatFileSize(f.file_size)}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {f.pattern_names.map((p, j) => (
                                  <span key={j} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-gray-400">
                    파일 상세 정보가 없습니다
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
