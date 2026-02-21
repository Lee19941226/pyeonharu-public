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
import AdminReportButton from "./admin-report-button";

// ─── Admin Tab ───
type AdminTab = "dashboard" | "users";

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

  // 관리자 확인
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      // profiles.role 기반 관리자 확인
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
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">📊 편하루 관리자</h1>
            <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                대시보드
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "users"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                사용자 관리
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "dashboard" && (
              <>
                <AdminReportButton stats={stats} period={period} />
                {/* 기간 선택 */}
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
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {activeTab === "users" ? (
          <UserManagement />
        ) : loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <>
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

              {/* 기능별 사용량 (Composed Chart - 라인 + 바 혼합) */}
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

              {/* 커뮤니티 활동 (이중선 그래프) */}
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
