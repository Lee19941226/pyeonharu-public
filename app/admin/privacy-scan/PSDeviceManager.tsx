"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

interface Agent {
  id: string;
  device_name: string;
  hostname: string | null;
  ip_address: string | null;
  mac_address: string | null;
  os_type: string | null;
  os_version: string | null;
  agent_version: string | null;
  policy_name: string | null;
  is_active: boolean;
  last_heartbeat_at: string | null;
  registered_at: string;
}

export default function PSDeviceManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const limit = 15;
  const totalPages = Math.ceil(total / limit);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/privacy-scan/agents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/privacy-scan/agents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast("장치가 삭제되었습니다.", "success"); fetchData(); }
    } catch { showToast("삭제 중 오류가 발생했습니다.", "error"); } finally { setDeleteConfirm(null); }
  };

  const isOnline = (heartbeat: string | null) => {
    if (!heartbeat) return false;
    return Date.now() - new Date(heartbeat).getTime() < 5 * 60 * 1000;
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
          {toast.message}
        </div>
      )}

      {/* Guide */}
      <div className="flex items-start gap-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">대상 서버에 설치된 에이전트(Agent)의 등록 현황 및 연결 상태를 관리</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">대상 서버에 에이전트를 설치하면 자동으로 등록됩니다. 마지막 하트비트 기준으로 온라인/오프라인 상태가 표시됩니다.</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="장치명 또는 호스트명 검색"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <button type="submit" className="rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold px-4 py-2.5 hover:bg-gray-200 dark:hover:bg-gray-700">
          검색
        </button>
      </form>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 text-sm text-gray-400">등록된 장치가 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">장치명</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">호스트명</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden md:table-cell">IP</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden lg:table-cell">OS</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden lg:table-cell">버전</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden md:table-cell">정책</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">상태</th>
                  <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">마지막 통신</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">{a.device_name}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden sm:table-cell">{a.hostname || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-[11px] hidden md:table-cell">{a.ip_address || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden lg:table-cell">{a.os_type || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden lg:table-cell">{a.agent_version || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden md:table-cell">{a.policy_name || "-"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isOnline(a.last_heartbeat_at)
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline(a.last_heartbeat_at) ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {isOnline(a.last_heartbeat_at) ? "온라인" : "오프라인"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs hidden sm:table-cell">
                      {a.last_heartbeat_at ? new Date(a.last_heartbeat_at).toLocaleString("ko-KR") : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const s = Math.max(1, Math.min(page - 2, totalPages - 4)); const p = s + i; if (p > totalPages) return null; return (<button key={p} onClick={() => setPage(p)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${page === p ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900" : "border border-gray-200 dark:border-gray-700 text-gray-500"}`}>{p}</button>); })}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">이 장치를 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold py-2.5 px-4">취소</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 px-4">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
