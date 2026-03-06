"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Trash2, Search, ShieldCheck } from "lucide-react";

export default function CacheManager() {
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [foodCode, setFoodCode] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCount = async () => {
    try {
      const res = await fetch("/api/admin/cache/clear");
      if (res.ok) {
        const data = await res.json();
        setTotalCount(data.totalCount);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  const handleClear = async (
    type: "all" | "old" | "code",
    opts?: { days?: number; foodCode?: string },
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/cache/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...opts }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        fetchCount();
        if (type === "code") setFoodCode("");
      } else {
        showToast(data.error || "삭제 실패", "error");
      }
    } catch {
      showToast("삭제 중 오류 발생", "error");
    } finally {
      setActionLoading(false);
      setConfirmAll(false);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/30 text-lg">
            🗂️
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
              캐시 관리
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              food_search_cache 테이블 관리
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/30">
          <span className="text-sm font-bold text-cyan-700 dark:text-cyan-400 tabular-nums">
            {(totalCount ?? 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-cyan-600 dark:text-cyan-500 ml-1">
            건
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

      <div className="space-y-4">
        {/* 기간별 삭제 */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            오래된 캐시 삭제
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => handleClear("old", { days })}
                disabled={actionLoading}
                className="rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold py-2.5 transition-colors disabled:opacity-50"
              >
                {days}일 이전
              </button>
            ))}
          </div>
        </div>

        {/* 식품코드별 삭제 */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            식품코드 캐시 삭제
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={foodCode}
              onChange={(e) => setFoodCode(e.target.value)}
              placeholder="식품코드 입력"
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <button
              onClick={() => handleClear("code", { foodCode })}
              disabled={!foodCode.trim() || actionLoading}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white disabled:text-gray-400 text-xs font-semibold px-4 py-2 transition-colors"
            >
              삭제
            </button>
          </div>
        </div>

        {/* 전체 초기화 */}
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 p-4">
          <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            전체 캐시 초기화
          </h4>
          <p className="text-[11px] text-gray-400 mb-3">
            모든 캐시 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          {!confirmAll ? (
            <button
              onClick={() => setConfirmAll(true)}
              disabled={actionLoading}
              className="w-full rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold py-2.5 transition-colors disabled:opacity-50"
            >
              전체 초기화
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleClear("all")}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                확인
              </button>
              <button
                onClick={() => setConfirmAll(false)}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
