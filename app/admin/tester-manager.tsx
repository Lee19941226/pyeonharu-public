"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, UserCheck, UserX } from "lucide-react";

interface TesterUser {
  id: string;
  nickname: string;
  email?: string;
  role: string;
}

export default function TesterManager() {
  const [testers, setTesters] = useState<TesterUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TesterUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 테스터 목록 로드
  const fetchTesters = async () => {
    try {
      const res = await fetch("/api/admin/users?role=tester&limit=100");
      if (res.ok) {
        const data = await res.json();
        setTesters(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTesters();
  }, []);

  // 사용자 검색 (debounce)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/rate-limit?q=${encodeURIComponent(searchQuery.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          // 이미 테스터인 사용자 제외
          const filtered = (data.users || []).filter(
            (u: TesterUser) => !testers.some((t) => t.id === u.id),
          );
          setSearchResults(filtered);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, testers]);

  const handleSetRole = async (userId: string, role: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, newRole: role }),
      });
      const data = await res.json();
      if (data.success) {
        if (role === "tester") {
          showToast("테스터로 지정되었습니다.", "success");
          fetchTesters();
          setSearchQuery("");
          setSearchResults([]);
        } else {
          showToast("테스터에서 해제되었습니다.", "success");
          setTesters(testers.filter((t) => t.id !== userId));
        }
      } else {
        showToast(data.error || "역할 변경 실패", "error");
      }
    } catch {
      showToast("역할 변경 중 오류 발생", "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/30 text-lg">
            🧪
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
              테스트 계정 관리
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              테스터 역할 사용자 관리 (rate limit 무제한 등 특별 권한)
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/30">
          <span className="text-sm font-bold text-violet-700 dark:text-violet-400 tabular-nums">
            {testers.length}
          </span>
          <span className="text-[10px] text-violet-600 dark:text-violet-500 ml-1">
            명
          </span>
        </div>
      </div>

      {toast && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* 검색하여 테스터 지정 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="닉네임 또는 UUID로 검색하여 테스터 지정"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
        {searching && (
          <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-gray-400" />
        )}
      </div>

      {/* 검색 결과 */}
      {searchResults.length > 0 && (
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-36 overflow-auto">
          {searchResults.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSetRole(user.id, "tester")}
              disabled={actionLoading === user.id}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between disabled:opacity-50"
            >
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {user.nickname}
              </span>
              <span className="text-violet-600 dark:text-violet-400 text-[10px] font-semibold flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                테스터 지정
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 현재 테스터 목록 */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          현재 테스터 목록
        </p>
        {testers.length === 0 ? (
          <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            등록된 테스터가 없습니다
          </div>
        ) : (
          <div className="space-y-1.5">
            {testers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
              >
                <div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {user.nickname || user.id.slice(0, 8) + "..."}
                  </span>
                  {user.email && (
                    <span className="text-[10px] text-gray-400 ml-2">
                      {user.email}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleSetRole(user.id, "user")}
                  disabled={actionLoading === user.id}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 text-[10px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  {actionLoading === user.id ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserX className="h-3 w-3" />
                  )}
                  해제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
