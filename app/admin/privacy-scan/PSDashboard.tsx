"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Server,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899"];

interface DashboardData {
  totalAgents: number;
  totalDetected: number;
  riskServers: number;
  lastScanDate: string | null;
  patternDistribution: { name: string; value: number }[];
  topRiskServers: { name: string; count: number }[];
  topRiskFiles: {
    file_name: string;
    file_path: string;
    pattern_names: string[];
    detected_count: number;
  }[];
}

export default function PSDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/privacy-scan/dashboard");
      if (res.ok) setData(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const guideCard = (
    <div className="flex items-start gap-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
      <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">전체 개인정보 검출 현황을 한눈에 파악하는 종합 모니터링 화면</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">에이전트를 등록하고 검사를 실행하면 검출 현황이 여기에 표시됩니다.</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-5">
        {guideCard}
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        {guideCard}
        <div className="text-center py-20 text-sm text-gray-400">
          데이터를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {guideCard}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Server}
          label="총 에이전트"
          value={data.totalAgents}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="총 검출수"
          value={data.totalDetected.toLocaleString()}
          bgColor="bg-red-50 dark:bg-red-950/30"
          iconColor="text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={ShieldAlert}
          label="위험 서버수"
          value={data.riskServers}
          bgColor="bg-amber-50 dark:bg-amber-950/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={Calendar}
          label="최근 검사일"
          value={
            data.lastScanDate
              ? new Date(data.lastScanDate).toLocaleDateString("ko-KR")
              : "-"
          }
          bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">
            패턴 유형별 검출 분포
          </h3>
          {data.patternDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.patternDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.patternDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
              검출 데이터가 없습니다
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">
            위험 서버 TOP 5
          </h3>
          {data.topRiskServers.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topRiskServers} layout="vertical">
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
              검출 데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* Top risk files */}
      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">
          고위험 파일 TOP 5
        </h3>
        {data.topRiskFiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                    파일명
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden md:table-cell">
                    경로
                  </th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                    검출 패턴
                  </th>
                  <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                    검출수
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.topRiskFiles.map((file, i) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">
                      {file.file_name}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs hidden md:table-cell max-w-[200px] truncate">
                      {file.file_path}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {file.pattern_names.map((p, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-red-600 dark:text-red-400">
                      {file.detected_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-400">
            검출된 파일이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  bgColor,
  iconColor,
}: {
  icon: typeof Server;
  label: string;
  value: string | number;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-gray-50">
        {value}
      </p>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1.5">
        {label}
      </p>
    </div>
  );
}
