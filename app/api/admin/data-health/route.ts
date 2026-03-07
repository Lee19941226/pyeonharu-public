import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

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

const TABLES_TO_CHECK = [
  "profiles",
  "community_posts",
  "community_comments",
  "food_search_cache",
  "food_scan_logs",
  "diet_entries",
  "user_schools",
  "school_meals_cache",
];

const ENDPOINTS_TO_CHECK: Array<{
  path: string;
  expectedStatus: number;
  kind: "public" | "auth-required";
}> = [
  { path: "/api/community", expectedStatus: 200, kind: "public" },
  { path: "/api/community?mode=popular", expectedStatus: 200, kind: "public" },
  {
    path: "/api/hospitals?lat=37.5665&lng=126.978&radius=1200",
    expectedStatus: 200,
    kind: "public",
  },
  {
    path: "/api/pharmacies?lat=37.5665&lng=126.978&radius=1200",
    expectedStatus: 200,
    kind: "public",
  },
  { path: "/api/school/search?q=서울", expectedStatus: 200, kind: "public" },
  { path: "/api/food/search?q=라면", expectedStatus: 200, kind: "public" },
  { path: "/api/profile", expectedStatus: 401, kind: "auth-required" },
  { path: "/api/bookmarks", expectedStatus: 401, kind: "auth-required" },
];

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: Request) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const adminDb = getAdminClient();
  const startedAt = Date.now();
  const origin = new URL(request.url).origin;

  const tableHealth: TableHealth[] = await Promise.all(
    TABLES_TO_CHECK.map(async (tableName) => {
      try {
        const { count, error } = await adminDb
          .from(tableName)
          .select("*", { count: "exact", head: true });

        if (error) {
          return {
            name: tableName,
            rowCount: null,
            ok: false,
            hasData: false,
            message: error.message,
          };
        }

        return {
          name: tableName,
          rowCount: count ?? 0,
          ok: true,
          hasData: (count ?? 0) > 0,
        };
      } catch (error) {
        return {
          name: tableName,
          rowCount: null,
          ok: false,
          hasData: false,
          message: error instanceof Error ? error.message : "unknown error",
        };
      }
    }),
  );

  const endpointHealth: EndpointHealth[] = await Promise.all(
    ENDPOINTS_TO_CHECK.map(async (endpoint) => {
      const t0 = Date.now();
      try {
        const res = await fetch(`${origin}${endpoint.path}`, {
          method: "GET",
          cache: "no-store",
        });
        const latencyMs = Date.now() - t0;
        return {
          path: endpoint.path,
          expectedStatus: endpoint.expectedStatus,
          status: res.status,
          ok: res.status === endpoint.expectedStatus,
          latencyMs,
          kind: endpoint.kind,
        };
      } catch {
        const latencyMs = Date.now() - t0;
        return {
          path: endpoint.path,
          expectedStatus: endpoint.expectedStatus,
          status: null,
          ok: false,
          latencyMs,
          kind: endpoint.kind,
        };
      }
    }),
  );

  const tableOk = tableHealth.filter((t) => t.ok).length;
  const tableError = tableHealth.length - tableOk;
  const endpointOk = endpointHealth.filter((e) => e.ok).length;
  const endpointError = endpointHealth.length - endpointOk;

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    database: {
      ok: tableError === 0,
      tables: tableHealth,
      okCount: tableOk,
      errorCount: tableError,
    },
    endpoints: {
      ok: endpointError === 0,
      items: endpointHealth,
      okCount: endpointOk,
      errorCount: endpointError,
    },
    summary: {
      totalOk: tableOk + endpointOk,
      totalError: tableError + endpointError,
    },
  });
}
