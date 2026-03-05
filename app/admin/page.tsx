"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Activity,
  BarChart3,
  MessageSquare,
  School,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Eye,
  Search,
  ScanLine,
  UtensilsCrossed,
  Percent,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Headphones,
  Key,
  Radio,
  UserCheck,
  UserX,
  Wifi,
  WifiOff,
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
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import UserManagement from "./user-management";
import SupportManagement from "./support-management";
import ActionLogs from "./action-logs";
import PortfolioTokens from "./portfolio-tokens";
import AdminReportButton from "./admin-report-button";
import { useAdminSSE, type OnlineUser } from "@/hooks/useAdminSSE";

// ─── Admin Tab ───
type AdminTab =
  | "dashboard"
  | "users"
  | "support"
  | "actionLogs"
  | "portfolioTokens";

// ─── Types ───
interface Stats {
  period: number;
  overview: {
    totalUsers: number;
    dau: number;
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

// ─── Stat Card ───
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-opacity-10 ${color.replace("text-", "bg-")}/10`}
        >
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium ${trend.value >= 0 ? "text-green-600" : "text-red-500"}`}
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
      <p className="text-2xl font-bold tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && (
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ─── Chart Card ───
function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-sm ${className}`}>
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      {children}
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
    <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <Radio className="h-5 w-5 text-green-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              현재 접속자 (실시간)
              {connected ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-normal text-green-600 bg-green-100 dark:bg-green-950/40 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                  <Wifi className="h-2.5 w-2.5" />
                  SSE 연결됨
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-normal text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                  <WifiOff className="h-2.5 w-2.5" />
                  연결 끊김
                </span>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              SSE 기반 · 5초 간격 갱신 · AWS 이관 호환
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border hover:bg-muted"
        >
          {showDetail ? "접기" : "상세 보기"}
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              전체 접속
            </span>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 tabular-nums">
            {totalOnline}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
              회원
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
            {authenticatedCount}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/30 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <UserX className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              비회원
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-300 tabular-nums">
            {anonymousCount}
          </p>
        </div>
      </div>

      {/* 상세 목록 */}
      {showDetail && users.length > 0 && (
        <div className="mt-4 border rounded-lg overflow-hidden">
          <div className="max-h-60 overflow-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">상태</th>
                  <th className="text-left px-3 py-2 font-medium">사용자</th>
                  <th className="text-left px-3 py-2 font-medium">유형</th>
                  <th className="text-left px-3 py-2 font-medium">IP</th>
                  <th className="text-left px-3 py-2 font-medium">접속 시간</th>
                  <th className="text-left px-3 py-2 font-medium">
                    마지막 활동
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user, idx) => (
                  <tr
                    key={`${user.userId}-${idx}`}
                    className="hover:bg-muted/30"
                  >
                    <td className="px-3 py-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {user.nickname ||
                        (user.isAuthenticated
                          ? user.userId.slice(0, 8) + "..."
                          : "비회원")}
                    </td>
                    <td className="px-3 py-2">
                      {user.isAuthenticated ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-medium">
                          <UserCheck className="h-2.5 w-2.5" />
                          회원
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-medium">
                          <UserX className="h-2.5 w-2.5" />
                          비회원
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">
                      {user.ipAddress || "unknown"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(user.connectedAt).toLocaleTimeString("ko-KR")}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
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
        <div className="mt-4 text-center py-6 text-sm text-muted-foreground border rounded-lg">
          현재 접속 중인 사용자가 없습니다
        </div>
      )}
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
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

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
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4">
          {/* Title + Controls */}
          <div className="flex h-12 items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-base sm:text-lg font-bold shrink-0">
                📊 편하루 관리자
              </h1>
              {activeTab === "dashboard" && (
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    sseConnected
                      ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {sseConnected ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    )}
                  </span>
                  {sseConnected ? `${totalOnline}명 접속 중` : "연결 끊김"}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeTab === "dashboard" && (
                <>
                  <AdminReportButton stats={stats} period={period} />
                  <div className="hidden sm:flex items-center gap-1 rounded-lg border bg-card p-0.5">
                    {[7, 14, 30, 90].map((d) => (
                      <button
                        key={d}
                        onClick={() => setPeriod(d)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          period === d
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {d}일
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="rounded-lg border bg-card p-2 hover:bg-muted transition-colors"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Tab navigation (scrollable on mobile) */}
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2">
            <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5 w-fit">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                대시보드
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "users"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                사용자 관리
              </button>
              <button
                onClick={() => setActiveTab("support")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "support"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1">
                  <Headphones className="h-3 w-3" />
                  고객센터
                </span>
              </button>
              <button
                onClick={() => setActiveTab("actionLogs")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "actionLogs"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  활동 로그
                </span>
              </button>
              <button
                onClick={() => setActiveTab("portfolioTokens")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "portfolioTokens"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  포트폴리오
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {activeTab === "users" ? (
          <UserManagement />
        ) : activeTab === "support" ? (
          <SupportManagement />
        ) : activeTab === "actionLogs" ? (
          <ActionLogs />
        ) : activeTab === "portfolioTokens" ? (
          <PortfolioTokens />
        ) : loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <>
            {/* ═══ 모바일 기간 선택 ═══ */}
            <div className="flex sm:hidden items-center justify-between">
              <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setPeriod(d)}
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
            </div>

            {/* ═══ 🟢 현재 접속자 (SSE 실시간) ═══ */}
            <OnlineUsersCard
              totalOnline={totalOnline}
              authenticatedCount={authenticatedCount}
              anonymousCount={anonymousCount}
              users={onlineUsers}
              connected={sseConnected}
            />

            {/* ═══ 핵심 지표 카드 ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard
                icon={Users}
                label="전체 가입자"
                value={stats.overview.totalUsers}
                color="text-blue-600"
              />
              <StatCard
                icon={Activity}
                label="DAU (오늘)"
                value={stats.overview.dau}
                color="text-green-600"
              />
              <StatCard
                icon={Activity}
                label="WAU (7일)"
                value={stats.overview.wau}
                color="text-emerald-600"
              />
              <StatCard
                icon={Activity}
                label="MAU (30일)"
                value={stats.overview.mau}
                color="text-teal-600"
              />
              <StatCard
                icon={Percent}
                label="리텐션율"
                value={`${stats.overview.retentionRate}%`}
                sub="7일 전 사용자 재방문"
                color="text-violet-600"
              />
              <StatCard
                icon={Zap}
                label="스티키니스"
                value={`${stats.overview.stickiness}%`}
                sub="DAU/MAU 비율"
                color="text-amber-600"
              />
            </div>

            {/* ═══ 기능 사용 요약 ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={ScanLine}
                label={`바코드 스캔 (${period}일)`}
                value={stats.features.scans}
                color="text-orange-600"
              />
              <StatCard
                icon={Eye}
                label={`안전 확인 (${period}일)`}
                value={stats.features.checks}
                color="text-pink-600"
              />
              <StatCard
                icon={Search}
                label={`음식 검색 (${period}일)`}
                value={stats.features.searches}
                color="text-cyan-600"
              />
              <StatCard
                icon={UtensilsCrossed}
                label={`식단 기록 (${period}일)`}
                value={stats.features.dietEntries}
                color="text-lime-600"
              />
            </div>

            {/* ═══ 커뮤니티 + 학교 요약 ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={MessageSquare}
                label="전체 게시글"
                value={stats.community.totalPosts}
                sub={`최근 ${period}일: ${stats.community.recentPosts}개`}
                color="text-indigo-600"
              />
              <StatCard
                icon={MessageSquare}
                label="전체 댓글"
                value={stats.community.totalComments}
                sub={`최근 ${period}일: ${stats.community.recentComments}개`}
                color="text-purple-600"
              />
              <StatCard
                icon={School}
                label="학교 등록 수"
                value={stats.schools.total}
                color="text-sky-600"
              />
              <StatCard
                icon={UserPlus}
                label={`신규 가입 (${period}일)`}
                value={stats.signups.recent}
                color="text-rose-600"
              />
            </div>

            {/* ═══ 차트 영역 ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* DAU 추이 (Area Chart) */}
              <ChartCard title="📈 일별 활성 사용자 (DAU) 추이">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.dauTrend}>
                    <defs>
                      <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#22c55e"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22c55e"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => `날짜: ${v}`} />
                    <Area
                      type="monotone"
                      dataKey="dau"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#dauGrad)"
                      name="DAU"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 신규 가입자 추이 (Bar Chart) */}
              <ChartCard title="👤 신규 가입자 추이">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.signups.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => `날짜: ${v}`} />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="가입자 수"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 기능별 사용량 (Composed Chart) */}
              <ChartCard
                title="🔧 기능별 일일 사용량 (복합 차트)"
                className="lg:col-span-2"
              >
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={stats.features.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => `날짜: ${v}`} />
                    <Legend />
                    <Bar
                      dataKey="scans"
                      fill="#f59e0b"
                      radius={[2, 2, 0, 0]}
                      name="바코드 스캔"
                      stackId="a"
                    />
                    <Bar
                      dataKey="checks"
                      fill="#ec4899"
                      radius={[2, 2, 0, 0]}
                      name="안전 확인"
                      stackId="a"
                    />
                    <Line
                      type="monotone"
                      dataKey="searches"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      name="음식 검색"
                    />
                    <Line
                      type="monotone"
                      dataKey="diet"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      name="식단 기록"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 커뮤니티 활동 */}
              <ChartCard title="💬 커뮤니티 활동 추이">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stats.community.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => `날짜: ${v}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="posts"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="게시글"
                    />
                    <Line
                      type="monotone"
                      dataKey="comments"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="댓글"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 기능 사용 비율 (파이 차트) */}
              <ChartCard title="🎯 기능 사용 비율">
                {featurePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={featurePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
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
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                    데이터 없음
                  </div>
                )}
              </ChartCard>

              {/* 학교 등록 랭킹 */}
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
                        stroke="#e5e7eb"
                        horizontal={false}
                      />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        width={120}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#0ea5e9"
                        radius={[0, 4, 4, 0]}
                        name="등록 수"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                    등록된 학교가 없습니다
                  </div>
                )}
              </ChartCard>
            </div>

            {/* 마지막 업데이트 */}
            <p className="text-center text-xs text-muted-foreground pb-4">
              마지막 업데이트: {new Date().toLocaleString("ko-KR")} · 기간: 최근{" "}
              {period}일
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">
              데이터를 불러올 수 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
