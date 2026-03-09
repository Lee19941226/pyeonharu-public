import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const pageRaw = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const limitRaw = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(100, Math.max(1, limitRaw))
      : 20;
    const agentId = searchParams.get("agent_id") || "";
    const status = searchParams.get("status") || "";
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("ps_scan_results")
      .select("*, ps_agents(id, device_name, hostname)", { count: "exact" });

    if (agentId) {
      query = query.eq("agent_id", agentId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query
      .order("scanned_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      results: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("PS scan-results GET error:", error);
    return NextResponse.json(
      { error: "검사 결과 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
