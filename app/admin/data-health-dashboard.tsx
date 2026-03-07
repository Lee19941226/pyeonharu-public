"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, Database, Server } from "lucide-react";

type TableHealth = {
  name: string;
  rowCount: number | null;
  ok: boolean;
  hasData: boolean;
  message?: string;
};

type EndpointHealth = {
  path: string;
  expectedStatus: number;
  status: number | null;
  ok: boolean;
  latencyMs: number;
  kind: "public" | "auth-required";
};

type HealthPayload = {
  checkedAt: string;
  durationMs: number;
  projectUrl: string | null;
  database: {
    ok: boolean;
    tables: TableHealth[];
    okCount: number;
    errorCount: number;
  };
  endpoints: {
    ok: boolean;
    items: EndpointHealth[];
    okCount: number;
    errorCount: number;
  };
  summary: {
    totalOk: number;
    totalError: number;
  };
};

export default function DataHealthDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data-health", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`status ${res.status}`);
      }
      const payload = (await res.json()) as HealthPayload;
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-lg">
            <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">데이터 상태 대시보드</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Supabase 테이블 상태 + 핵심 API 연결 상태
            </p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-xs text-red-700 dark:text-red-300">
          데이터 상태를 불러오지 못했습니다: {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatusCard label="전체 통과" value={data.summary.totalOk} ok />
            <StatusCard label="오류" value={data.summary.totalError} ok={data.summary.totalError === 0} />
            <StatusCard label="DB 점검" value={`${data.database.okCount}/${data.database.okCount + data.database.errorCount}`} ok={data.database.ok} />
            <StatusCard label="API 점검" value={`${data.endpoints.okCount}/${data.endpoints.okCount + data.endpoints.errorCount}`} ok={data.endpoints.ok} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            <span>점검 시각: {new Date(data.checkedAt).toLocaleString("ko-KR")}</span>
            <span>소요: {data.durationMs}ms</span>
            {data.projectUrl && <span>프로젝트: {data.projectUrl}</span>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold text-gray-600 dark:text-gray-300">
                테이블 상태
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50/70 dark:bg-gray-800/20 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">테이블</th>
                      <th className="text-right px-3 py-2">행 수</th>
                      <th className="text-center px-3 py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.database.tables.map((t) => (
                      <tr key={t.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">{t.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{t.rowCount ?? "-"}</td>
                        <td className="px-3 py-2 text-center">
                          {t.ok ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400" title={t.message}>
                              <AlertTriangle className="h-3.5 w-3.5" /> 오류
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Server className="h-3.5 w-3.5" /> API 상태
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50/70 dark:bg-gray-800/20 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">경로</th>
                      <th className="text-center px-3 py-2">결과</th>
                      <th className="text-right px-3 py-2">지연</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.endpoints.items.map((e) => (
                      <tr key={e.path} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                          <div className="font-mono text-[11px]">{e.path}</div>
                          <div className="text-[10px] text-gray-400">expect {e.expectedStatus} | {e.kind}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {e.ok ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {e.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-3.5 w-3.5" /> {e.status ?? "ERR"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{e.latencyMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="py-8 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string | number; ok: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-gray-500">{label}</span>
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        )}
      </div>
      <div className="text-lg font-extrabold text-gray-900 dark:text-gray-50 tabular-nums">{value}</div>
    </div>
  );
}
