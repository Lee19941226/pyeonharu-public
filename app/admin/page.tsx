"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Headphones,
  Key,
  UserCheck,
  UserX,
  Wifi,
  WifiOff,
  Shield,
  ShieldCheck,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import UserManagement from "./user-management";
import SupportManagement from "./support-management";
import ActionLogs from "./action-logs";
import PortfolioTokens from "./portfolio-tokens";
import AdminReportButton from "./admin-report-button";
import MaintenanceManager from "./maintenance-manager";
import WhitelistManager from "./whitelist-manager";
import CacheManager from "./cache-manager";
import TesterManager from "./tester-manager";
import AppVersionManager from "./app-version-manager";
import MedicineImageManager from "./medicine-image-manager";
import FoodImageManager from "./food-image-manager";
import DataHealthDashboard from "./data-health-dashboard";
import { useAdminSSE, type OnlineUser } from "@/hooks/useAdminSSE";
import PrivacyScanContainer from "./privacy-scan/PrivacyScanContainer";

// ─── Admin Tab ───
type AdminTab =
  | "marketing"
  | "operations"
  | "tools"
  | "users"
  | "support"
  | "actionLogs"
  | "portfolioTokens"
  | "privacyScan";

// ─── Types ───
interface Stats {
  period: number;
  overview: {
    totalUsers: number;
    dau: number;
    dauMembers: number;
    dauAnon: number;
    wau: number;
    mau: number;
    retentionRate: number;
    stickiness: number;
  };
  signups: {
    total: number;
    recent: number;
    trend: { date: string; count: number }[];
  };
  features: {
    scans: number;
    checks: number;
    searches: number;
    dietEntries: number;
    trend: {
      date: string;
      scans: number;
      checks: number;
      searches: number;
      diet: number;
    }[];
  };
  community: {
    totalPosts: number;
    recentPosts: number;
    totalComments: number;
    recentComments: number;
    trend: { date: string; posts: number; comments: number }[];
  };
  schools: {
    total: number;
    topSchools: { name: string; count: number }[];
  };
  dauTrend: { date: string; dau: number }[];
}

// ─── Stat Card (디자인 개선) ───
function StatCard({
  emoji,
  label,
  value,
  sub,
  bgColor = "bg-blue-50 dark:bg-blue-950/30",
  trend,
  tooltip,
}: {
  emoji: string;
  label: string;
  value: string | number;
  sub?: string;
  bgColor?: string;
  trend?: { value: number; label: string };
  tooltip?: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow relative group">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor} text-lg`}
        >
          {emoji}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.value >= 0
                ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40"
                : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40"
            }`}
          >
            {trend.value >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-gray-50">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1.5">
        {label}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          {sub}
        </p>
      )}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] leading-relaxed w-56 text-center shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      )}
    </div>
  );
}

// ─── Chart Card (디자인 개선) ───
function ChartCard({
  title,
  subtitle,
  extra,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}

function avgOf(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function trendDelta(latest: number, previous: number) {
  if (previous === 0) return 0;
  return ((latest - previous) / previous) * 100;
}

function QuickBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-card px-3 py-2">
      <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
        {value}
      </p>
    </div>
  );
}

// ─── 현재 접속자 카드 (SSE 기반) ───
function OnlineUsersCard({
  totalOnline,
  authenticatedCount,
  anonymousCount,
  users,
  connected,
}: {
  totalOnline: number;
  authenticatedCount: number;
  anonymousCount: number;
  users: OnlineUser[];
  connected: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-lg">
            📡
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              실시간 접속자
              {connected ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  <Wifi className="h-2.5 w-2.5" />
                  연결됨
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-full">
                  <WifiOff className="h-2.5 w-2.5" />
                  끊김
                </span>
              )}
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              SSE 기반 · 5초 간격 갱신
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {showDetail ? "접기" : "상세"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              전체
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {totalOnline}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
              회원
            </span>
          </div>
          <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 tabular-nums">
            {authenticatedCount}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/30 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <UserX className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
              비회원
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-600 dark:text-gray-300 tabular-nums">
            {anonymousCount}
          </p>
        </div>
      </div>

      {showDetail && users.length > 0 && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="max-h-60 overflow-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">
                    상태
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">
                    사용자
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">
                    유형
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">
                    IP
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">
                    접속
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 dark:text-gray-400">
                    활동
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((user, idx) => (
                  <tr
                    key={`${user.userId}-${idx}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-3 py-2.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">
                      {user.nickname ||
                        (user.isAuthenticated
                          ? user.userId.slice(0, 8) + "..."
                          : "비회원")}
                    </td>
                    <td className="px-3 py-2.5">
                      {user.isAuthenticated ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-semibold">
                          회원
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-semibold">
                          비회원
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-[11px]">
                      {user.ipAddress || "unknown"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400">
                      {new Date(user.connectedAt).toLocaleTimeString("ko-KR")}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400">
                      {formatTimeAgo(user.lastHeartbeat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDetail && users.length === 0 && (
        <div className="mt-4 text-center py-6 text-sm text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl">
          현재 접속 중인 사용자가 없습니다
        </div>
      )}
    </div>
  );
}

// ─── Rate Limit 관리 섹션 ───
function RateLimitManager() {
  const [resetAllLoading, setResetAllLoading] = useState(false);
  const [resetUserLoading, setResetUserLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; nickname: string; email: string }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    nickname: string;
    email: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [searching, setSearching] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
          setSearchResults(data.users || []);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResetAll = async () => {
    setResetAllLoading(true);
    try {
      const res = await fetch("/api/admin/rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("전체 rate limit 초기화 완료", "success");
      } else {
        showToast("일부 테이블 초기화 실패", "error");
      }
    } catch {
      showToast("초기화 중 오류 발생", "error");
    } finally {
      setResetAllLoading(false);
      setConfirmAll(false);
    }
  };

  const handleResetUser = async () => {
    if (!selectedUser) return;
    setResetUserLoading(true);
    try {
      const res = await fetch("/api/admin/rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", userId: selectedUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `${selectedUser.nickname} 님의 rate limit 초기화 완료`,
          "success",
        );
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
      } else {
        showToast("초기화 실패", "error");
      }
    } catch {
      showToast("초기화 중 오류 발생", "error");
    } finally {
      setResetUserLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 text-lg">
          🔄
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            Rate Limit 관리
          </h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            API 사용량 제한 초기화 (5개 테이블)
          </p>
        </div>
      </div>

      {/* Toast */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 전체 초기화 */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            전체 초기화
          </h4>
          <p className="text-[11px] text-gray-400 mb-3">
            오늘자 rate limit 데이터를 모든 테이블에서 삭제합니다.
          </p>
          {!confirmAll ? (
            <button
              onClick={() => setConfirmAll(true)}
              className="w-full rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold py-2.5 transition-colors"
            >
              전체 초기화
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleResetAll}
                disabled={resetAllLoading}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {resetAllLoading ? (
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

        {/* 특정 사용자 초기화 */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            사용자별 초기화
          </h4>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedUser(null);
              }}
              placeholder="닉네임 또는 UUID 입력"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            {searching && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-gray-400" />
            )}
          </div>

          {/* 검색 결과 드롭다운 */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="mb-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-36 overflow-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchQuery(user.nickname);
                    setSearchResults([]);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {user.nickname}
                  </span>
                  <span className="text-gray-400 text-[10px]">
                    {user.email}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 선택된 사용자 */}
          {selectedUser && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {selectedUser.nickname}
                </span>
                <span className="text-[10px] text-blue-500 dark:text-blue-500 ml-2">
                  {selectedUser.email}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSearchQuery("");
                }}
                className="text-blue-400 hover:text-blue-600 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <button
            onClick={handleResetUser}
            disabled={!selectedUser || resetUserLoading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white disabled:text-gray-400 text-xs font-semibold py-2.5 transition-colors flex items-center justify-center gap-1.5"
          >
            {resetUserLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            선택한 사용자 초기화
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 시간 경과 포맷 ───
function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 10) return "방금";
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

// ─── 날짜 포맷 ───
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Colors ───
const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

// ─── Page ───
export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("marketing");

  // ✅ SSE 실시간 접속자 구독
  const {
    totalOnline,
    authenticatedCount,
    anonymousCount,
    users: onlineUsers,
    connected: sseConnected,
  } = useAdminSSE();

  // 관리자 확인
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          const role = data?.role || "user";
          if (role === "admin" || role === "super_admin") {
            setIsAdmin(true);
          } else {
            router.push("/");
          }
        });
    });
  }, [router]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Stats fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isAdmin) fetchStats();
  }, [isAdmin, fetchStats]);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // 기능 사용 비율 (파이 차트)
  const featurePieData = stats
    ? [
        { name: "바코드 스캔", value: stats.features.scans },
        { name: "안전 확인", value: stats.features.checks },
        { name: "음식 검색", value: stats.features.searches },
        { name: "식단 기록", value: stats.features.dietEntries },
      ].filter((d) => d.value > 0)
    : [];

  const dauValues = stats?.dauTrend.map((d) => d.dau) ?? [];
  const dauAvg = Math.round(avgOf(dauValues));
  const dauLatest = dauValues[dauValues.length - 1] ?? 0;
  const dauPrev = dauValues[dauValues.length - 2] ?? 0;
  const dauDelta = trendDelta(dauLatest, dauPrev);

  const signupValues = stats?.signups.trend.map((d) => d.count) ?? [];
  const signupAvg = Math.round(avgOf(signupValues));
  const signupLatest = signupValues[signupValues.length - 1] ?? 0;
  const signupPrev = signupValues[signupValues.length - 2] ?? 0;
  const signupDelta = trendDelta(signupLatest, signupPrev);

  const featureDailyTotals =
    stats?.features.trend.map((d) => d.scans + d.checks + d.searches + d.diet) ??
    [];
  const featureDailyAvg = Math.round(avgOf(featureDailyTotals));

  const operationTotal =
    (stats?.features.scans || 0) +
    (stats?.features.checks || 0) +
    (stats?.features.searches || 0) +
    (stats?.features.dietEntries || 0);
  const topFeature = [...featurePieData].sort((a, b) => b.value - a.value)[0];
  const topFeatureShare =
    operationTotal > 0 && topFeature
      ? ((topFeature.value / operationTotal) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4">
          {/* Title + Controls */}
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-50 shrink-0">
                편하루 관리자
              </h1>
              {activeTab === "operations" && (
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    sseConnected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {sseConnected ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    )}
                  </span>
                  {sseConnected ? `${totalOnline}명 접속` : "연결 끊김"}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(activeTab === "marketing" || activeTab === "operations") && (
                <>
                  <AdminReportButton stats={stats} period={period} />
                  <div className="hidden sm:flex items-center gap-0.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-0.5">
                    {[7, 14, 30, 90].map((d) => (
                      <button
                        key={d}
                        onClick={() => setPeriod(d)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          period === d
                            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                      >
                        {d}일
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <RefreshCw
                      className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Tab navigation */}
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2">
            <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-0.5 w-fit">
              {(
                [
                  { key: "marketing", label: "마케팅", icon: null },
                  { key: "operations", label: "운영", icon: null },
                  { key: "tools", label: "도구", icon: null },
                  { key: "users", label: "사용자 관리", icon: null },
                  {
                    key: "support",
                    label: "고객센터",
                    icon: Headphones,
                  },
                  {
                    key: "actionLogs",
                    label: "활동 로그",
                    icon: Activity,
                  },
                  {
                    key: "portfolioTokens",
                    label: "포트폴리오",
                    icon: Key,
                  },
                  {
                    key: "privacyScan",
                    label: "PrivacyScan",
                    icon: Shield,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === tab.key
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {tab.icon && <tab.icon className="h-3 w-3" />}
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-5">
        {activeTab === "users" ? (
          <UserManagement />
        ) : activeTab === "support" ? (
          <SupportManagement />
        ) : activeTab === "actionLogs" ? (
          <ActionLogs />
        ) : activeTab === "portfolioTokens" ? (
          <PortfolioTokens />
        ) : activeTab === "privacyScan" ? (
          <PrivacyScanContainer />
        ) : activeTab === "tools" ? (
          <div className="space-y-5">
            <DataHealthDashboard />
            <RateLimitManager />
            <MaintenanceManager />
            <WhitelistManager />
            <CacheManager />
            <TesterManager />
            <AppVersionManager />
            <MedicineImageManager />
            <FoodImageManager />
          </div>
        ) : loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : stats ? (
          <>
            {/* ═══ 모바일 기간 선택 ═══ */}
            <div className="flex sm:hidden items-center justify-between">
              <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-0.5">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setPeriod(d)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      period === d
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {d}일
                  </button>
                ))}
              </div>
            </div>

            {/* ═══ 마케팅 탭 ═══ */}
            {activeTab === "marketing" && (
              <div className="space-y-5">
                {/* 핵심 지표 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <StatCard
                    emoji="👥"
                    label="전체 가입자"
                    value={stats.overview.totalUsers}
                    bgColor="bg-blue-50 dark:bg-blue-950/30"
                    tooltip="서비스에 가입한 전체 사용자 수입니다."
                  />
                  <StatCard
                    emoji="📊"
                    label="DAU (오늘)"
                    value={stats.overview.dau}
                    sub={`회원 ${stats.overview.dauMembers.toLocaleString()} · 비회원 ${stats.overview.dauAnon.toLocaleString()}`}
                    bgColor="bg-emerald-50 dark:bg-emerald-950/30"
                    tooltip="Daily Active Users. 오늘 하루 동안 서비스를 이용한 순 사용자 수입니다. 높을수록 일일 활성도가 좋습니다."
                  />
                  <StatCard
                    emoji="📆"
                    label="WAU (7일)"
                    value={stats.overview.wau}
                    bgColor="bg-teal-50 dark:bg-teal-950/30"
                    tooltip="Weekly Active Users. 최근 7일간 서비스를 이용한 순 사용자 수입니다."
                  />
                  <StatCard
                    emoji="📅"
                    label="MAU (30일)"
                    value={stats.overview.mau}
                    bgColor="bg-cyan-50 dark:bg-cyan-950/30"
                    tooltip="Monthly Active Users. 최근 30일간 서비스를 이용한 순 사용자 수입니다. 서비스의 전체 규모를 나타냅니다."
                  />
                  <StatCard
                    emoji="🔁"
                    label="리텐션율"
                    value={`${stats.overview.retentionRate}%`}
                    sub="7일 전 사용자 재방문"
                    bgColor="bg-violet-50 dark:bg-violet-950/30"
                    tooltip="7일 전에 방문했던 사용자 중 오늘 다시 방문한 비율입니다. 높을수록 사용자가 서비스에 다시 돌아오는 것을 의미합니다."
                  />
                  <StatCard
                    emoji="⚡"
                    label="스티키니스"
                    value={`${stats.overview.stickiness}%`}
                    sub="DAU/MAU 비율"
                    bgColor="bg-amber-50 dark:bg-amber-950/30"
                    tooltip="DAU를 MAU로 나눈 비율입니다. 높을수록 월간 사용자들이 매일 꾸준히 접속하는 것을 의미합니다. 업계 평균은 10~20%입니다."
                  />
                </div>

                {/* 커뮤니티 + 학교 + 가입 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    emoji="💬"
                    label="전체 게시글"
                    value={stats.community.totalPosts}
                    sub={`최근 ${period}일: ${stats.community.recentPosts.toLocaleString()}개`}
                    bgColor="bg-indigo-50 dark:bg-indigo-950/30"
                    tooltip="커뮤니티에 작성된 전체 게시글 수입니다."
                  />
                  <StatCard
                    emoji="🗨️"
                    label="전체 댓글"
                    value={stats.community.totalComments}
                    sub={`최근 ${period}일: ${stats.community.recentComments.toLocaleString()}개`}
                    bgColor="bg-purple-50 dark:bg-purple-950/30"
                    tooltip="커뮤니티 게시글에 달린 전체 댓글 수입니다. 게시글 대비 댓글 비율이 높으면 참여도가 좋습니다."
                  />
                  <StatCard
                    emoji="🏫"
                    label="학교 등록 수"
                    value={stats.schools.total}
                    bgColor="bg-sky-50 dark:bg-sky-950/30"
                    tooltip="급식 알림을 위해 학교를 등록한 사용자 수입니다."
                  />
                  <StatCard
                    emoji="🆕"
                    label={`신규 가입 (${period}일)`}
                    value={stats.signups.recent}
                    bgColor="bg-rose-50 dark:bg-rose-950/30"
                    tooltip={`최근 ${period}일 동안 새로 가입한 사용자 수입니다.`}
                  />
                </div>

                {/* 차트 영역 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <QuickBadge label="DAU 최근값" value={`${dauLatest.toLocaleString()}명`} />
                  <QuickBadge label="DAU 전일 대비" value={`${dauDelta >= 0 ? "+" : ""}${dauDelta.toFixed(1)}%`} />
                  <QuickBadge label="가입 최근값" value={`${signupLatest.toLocaleString()}명`} />
                  <QuickBadge label="가입 전일 대비" value={`${signupDelta >= 0 ? "+" : ""}${signupDelta.toFixed(1)}%`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard
                    title="📈 일별 활성 사용자 (DAU) 추이"
                    subtitle="최근 기간 평균선과 함께 변동을 비교합니다."
                    extra={<QuickBadge label="평균" value={`${dauAvg.toLocaleString()}명`} />}
                  >
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={stats.dauTrend}>
                        <defs>
                          <linearGradient
                            id="dauGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f3f4f6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          labelFormatter={(v) => `${v}`}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            fontSize: 12,
                          }}
                        />
                        <ReferenceLine
                          y={dauAvg}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          strokeOpacity={0.7}
                          label={{ value: `평균 ${dauAvg}`, position: "insideTopRight", fill: "#10b981", fontSize: 11 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="dau"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fill="url(#dauGrad)"
                          name="DAU"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="👤 신규 가입자 추이"
                    subtitle="일별 가입자 흐름과 평균 수준을 함께 표시합니다."
                    extra={<QuickBadge label="평균" value={`${signupAvg.toLocaleString()}명`} />}
                  >
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.signups.trend}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f3f4f6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          labelFormatter={(v) => `${v}`}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                          name="가입자 수"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="💬 커뮤니티 활동 추이">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={stats.community.trend}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f3f4f6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          labelFormatter={(v) => `${v}`}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            fontSize: 12,
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="posts"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ r: 2.5 }}
                          name="게시글"
                        />
                        <Line
                          type="monotone"
                          dataKey="comments"
                          stroke="#f97316"
                          strokeWidth={2.5}
                          dot={{ r: 2.5 }}
                          strokeDasharray="6 3"
                          name="댓글"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="🏫 학교 등록 TOP 10" className="lg:col-span-2">
                    {stats.schools.topSchools.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={stats.schools.topSchools}
                          layout="vertical"
                          margin={{ left: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f3f4f6"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#6b7280" }}
                            width={120}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              fontSize: 12,
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#0ea5e9"
                            radius={[0, 6, 6, 0]}
                            name="등록 수"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
                        등록된 학교가 없습니다
                      </div>
                    )}
                  </ChartCard>
                </div>
              </div>
            )}

            {/* ═══ 운영 탭 ═══ */}
            {activeTab === "operations" && (
              <div className="space-y-5">
                {/* 실시간 접속자 */}
                <OnlineUsersCard
                  totalOnline={totalOnline}
                  authenticatedCount={authenticatedCount}
                  anonymousCount={anonymousCount}
                  users={onlineUsers}
                  connected={sseConnected}
                />

                {/* 기능 사용 요약 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    emoji="📷"
                    label={`바코드 스캔 (${period}일)`}
                    value={stats.features.scans}
                    bgColor="bg-orange-50 dark:bg-orange-950/30"
                    tooltip="식품 바코드를 카메라로 스캔하여 성분 정보를 확인한 횟수입니다."
                  />
                  <StatCard
                    emoji="🛡️"
                    label={`안전 확인 (${period}일)`}
                    value={stats.features.checks}
                    bgColor="bg-pink-50 dark:bg-pink-950/30"
                    tooltip="사용자의 알레르기 프로필 기반으로 식품 안전 여부를 확인한 횟수입니다."
                  />
                  <StatCard
                    emoji="🔍"
                    label={`음식 검색 (${period}일)`}
                    value={stats.features.searches}
                    bgColor="bg-sky-50 dark:bg-sky-950/30"
                    tooltip="식품명으로 검색하여 영양 정보나 알레르기 정보를 조회한 횟수입니다."
                  />
                  <StatCard
                    emoji="🍽️"
                    label={`식단 기록 (${period}일)`}
                    value={stats.features.dietEntries}
                    bgColor="bg-lime-50 dark:bg-lime-950/30"
                    tooltip="사용자가 자신의 식단을 기록한 횟수입니다."
                  />
                </div>

                {/* 차트 영역 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <QuickBadge label="일 평균 사용량" value={`${featureDailyAvg.toLocaleString()}회`} />
                  <QuickBadge label="최다 사용 기능" value={topFeature ? topFeature.name : "-"} />
                  <QuickBadge label="최다 기능 비중" value={`${topFeatureShare}%`} />
                  <QuickBadge label="기간 총 사용" value={`${operationTotal.toLocaleString()}회`} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard
                    title="🔧 기능별 일일 사용량"
                    subtitle="막대(스캔/안전확인) + 선(검색/식단) 흐름을 동시에 확인합니다."
                    extra={<QuickBadge label="일 평균" value={`${featureDailyAvg.toLocaleString()}회`} />}
                    className="lg:col-span-2"
                  >
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={stats.features.trend}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f3f4f6"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          labelFormatter={(v) => `${v}`}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            fontSize: 12,
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="scans"
                          fill="#f59e0b"
                          radius={[3, 3, 0, 0]}
                          name="바코드 스캔"
                          stackId="a"
                        />
                        <Bar
                          dataKey="checks"
                          fill="#ec4899"
                          radius={[3, 3, 0, 0]}
                          name="안전 확인"
                          stackId="a"
                        />
                        <Line
                          type="monotone"
                          dataKey="searches"
                          stroke="#06b6d4"
                          strokeWidth={2.5}
                          dot={false}
                          name="음식 검색"
                        />
                        <Line
                          type="monotone"
                          dataKey="diet"
                          stroke="#22c55e"
                          strokeWidth={2.5}
                          dot={false}
                          name="식단 기록"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title="🎯 기능 사용 비율"
                    subtitle="기간 내 기능별 점유율입니다."
                  >
                    {featurePieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={featurePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={105}
                            paddingAngle={4}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {featurePieData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
                        데이터 없음
                      </div>
                    )}
                  </ChartCard>
                </div>
              </div>
            )}

            {/* 마지막 업데이트 */}
            <p className="text-center text-[11px] text-gray-400 pb-4">
              마지막 업데이트: {new Date().toLocaleString("ko-KR")} · 기간: 최근{" "}
              {period}일
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400">데이터를 불러올 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
