"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ScanLine,
  Calendar,
  BarChart3,
} from "lucide-react";

interface InsightData {
  stats: {
    total: number;
    safeCount: number;
    dangerCount: number;
    safeRate: number;
    thisMonth: number;
    lastMonth: number;
    monthChange: number;
  };
  topAllergens: { name: string; count: number }[];
  dailyTrend: { date: string; safe: number; danger: number; total: number }[];
  weekdayPattern: { day: string; count: number }[];
  topProducts: {
    name: string;
    count: number;
    isSafe: boolean;
    manufacturer: string;
    barcode: string;
  }[];
  dangerHistory: {
    productName: string;
    allergens: string[];
    checkedAt: string;
    barcode: string;
  }[];
}

const ALLERGEN_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#06b6d4"];

export default function InsightsPage() {
  const router = useRouter();
  const [data, setData] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    fetch("/api/food/insights")
      .then((r) => r.json())
      .then((d) => {
        if (d.error === "로그인 필요") {
          router.push("/login");
          return;
        }
        if (d.empty) {
          setIsEmpty(true);
          return;
        }
        if (d.success) setData(d);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 pb-20 md:pb-0">
          <div className="container mx-auto max-w-2xl px-4 py-6 space-y-5">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="mt-2 h-4 w-64" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-36" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
          <ScanLine className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-gray-700">아직 스캔 기록이 없어요</p>
          <p className="text-sm text-muted-foreground text-center">
            식품을 스캔하면 나만의 알레르기 인사이트를 볼 수 있어요
          </p>
          <Button onClick={() => router.push("/food")}>식품 검색하기</Button>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!data) return null;
  const {
    stats,
    topAllergens,
    dailyTrend,
    weekdayPattern,
    topProducts,
    dangerHistory,
  } = data;
  const maxWeekday = Math.max(...weekdayPattern.map((d) => d.count), 1);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto max-w-2xl px-4 py-6 space-y-5">
          {/* 타이틀 */}
          <div>
            <h1 className="text-2xl font-bold">내 알레르기 인사이트</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              총 {stats.total}번 확인한 스캔 기록을 분석했어요
            </p>
          </div>

          {/* ── 요약 카드 4개 ── */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">안전율</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.safeRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.safeCount}개 안전 / {stats.total}개
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">
                    위험 감지
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {stats.dangerCount}회
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  알레르기 검출
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">이번 달</span>
                </div>
                <p className="text-2xl font-bold">{stats.thisMonth}회</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {stats.monthChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <p
                    className={`text-xs ${stats.monthChange >= 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    전달 대비 {stats.monthChange > 0 ? "+" : ""}
                    {stats.monthChange}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ScanLine className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    누적 스캔
                  </span>
                </div>
                <p className="text-2xl font-bold">{stats.total}회</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  전체 기간
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── 최근 30일 스캔 추이 ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                📈 최근 30일 스캔 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={dailyTrend}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v, name) => [
                      v,
                      name === "safe" ? "안전" : "위험",
                    ]}
                    labelStyle={{ fontSize: 11 }}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="safe"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#bbf7d0"
                    name="safe"
                  />
                  <Area
                    type="monotone"
                    dataKey="danger"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#fecaca"
                    name="danger"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ── 나의 알레르기 TOP 5 ── */}
          {topAllergens.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  🚨 자주 검출된 알레르기 TOP {topAllergens.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {topAllergens.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3">
                    <span className="w-4 text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{a.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {a.count}회
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(a.count / topAllergens[0].count) * 100}%`,
                            backgroundColor: ALLERGEN_COLORS[i],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── 요일별 스캔 패턴 ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                📅 요일별 스캔 패턴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-1.5 h-20 px-1">
                {weekdayPattern.map((d) => (
                  <div
                    key={d.day}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t-sm bg-primary/70 transition-all"
                      style={{
                        height: `${(d.count / maxWeekday) * 64}px`,
                        minHeight: d.count > 0 ? "4px" : "0",
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {d.day}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── 가장 많이 확인한 제품 TOP 5 ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                🔍 자주 확인한 제품 TOP 5
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topProducts.map((p, i) => (
                <div
                  key={i}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/food/result/${p.barcode}`)}
                >
                  <span className="w-5 text-center text-sm font-bold text-primary/60">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {p.manufacturer && (
                      <p className="text-xs text-muted-foreground">
                        {p.manufacturer}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={p.isSafe ? "outline" : "destructive"}
                      className="text-xs"
                    >
                      {p.isSafe ? "✓ 안전" : "⚠ 위험"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {p.count}회
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── 최근 위험 감지 ── */}
          {dangerHistory.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-700">
                  ⚠️ 최근 위험 감지 제품
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dangerHistory.map((d, i) => (
                  <div
                    key={i}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-3 hover:bg-red-100 transition-colors"
                    onClick={() => router.push(`/food/result/${d.barcode}`)}
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-red-900">
                        {d.productName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.allergens.map((a, j) => (
                          <span
                            key={j}
                            className="rounded-full bg-red-200 px-2 py-0.5 text-xs text-red-800"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-red-400">
                      {new Date(d.checkedAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 주간 리포트 링크 */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/reports")}
          >
            📊 주간 상세 리포트 보기
          </Button>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
