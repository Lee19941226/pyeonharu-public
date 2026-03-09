import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    // 1. totalAgents: 활성 에이전트 수
    const { count: totalAgents } = await supabaseAdmin
      .from("ps_agents")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // 2. totalDetected: 전체 검출 건수 합계
    const { data: detectSumData } = await supabaseAdmin
      .from("ps_scan_results")
      .select("detected_count");

    const totalDetected = (detectSumData || []).reduce(
      (sum, row) => sum + (row.detected_count || 0),
      0,
    );

    // 3. riskServers: 검출 건이 있는 고유 에이전트 수
    const { data: riskData } = await supabaseAdmin
      .from("ps_scan_results")
      .select("agent_id")
      .gt("detected_count", 0);

    const riskAgentIds = new Set(
      (riskData || []).map((r) => r.agent_id),
    );
    const riskServers = riskAgentIds.size;

    // 4. lastScanDate: 최근 검사 일시
    const { data: lastScanData } = await supabaseAdmin
      .from("ps_scan_results")
      .select("scanned_at")
      .order("scanned_at", { ascending: false })
      .limit(1);

    const lastScanDate = lastScanData?.[0]?.scanned_at || null;

    // 5. patternDistribution: 패턴별 검출 분포
    const { data: allFiles } = await supabaseAdmin
      .from("ps_scan_files")
      .select("detected_patterns")
      .not("detected_patterns", "is", null);

    const patternCounts: Record<string, number> = {};
    (allFiles || []).forEach((file) => {
      const patterns = file.detected_patterns;
      if (Array.isArray(patterns)) {
        patterns.forEach((p: { pattern_name?: string; count?: number }) => {
          const name = p.pattern_name || "unknown";
          patternCounts[name] = (patternCounts[name] || 0) + (p.count || 1);
        });
      }
    });

    const patternDistribution = Object.entries(patternCounts).map(
      ([name, count]) => ({ name, count }),
    );

    // 6. topRiskServers: 검출 건수 상위 5개 서버
    const { data: scanResults } = await supabaseAdmin
      .from("ps_scan_results")
      .select("agent_id, detected_count");

    const agentDetectMap: Record<string, number> = {};
    (scanResults || []).forEach((r) => {
      if (r.agent_id) {
        agentDetectMap[r.agent_id] =
          (agentDetectMap[r.agent_id] || 0) + (r.detected_count || 0);
      }
    });

    const topAgentIds = Object.entries(agentDetectMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topRiskServers: { agent_id: string; device_name: string; detected_count: number }[] = [];
    for (const [agentId, count] of topAgentIds) {
      const { data: agent } = await supabaseAdmin
        .from("ps_agents")
        .select("device_name")
        .eq("id", agentId)
        .single();

      topRiskServers.push({
        agent_id: agentId,
        device_name: agent?.device_name || "알 수 없음",
        detected_count: count,
      });
    }

    // 7. topRiskFiles: 검출 패턴 수 상위 5개 파일
    const { data: riskFiles } = await supabaseAdmin
      .from("ps_scan_files")
      .select("id, file_path, file_name, pattern_names, detected_patterns")
      .not("detected_patterns", "is", null)
      .limit(1000);

    const scoredFiles = (riskFiles || []).map((f) => {
      const patternCount = Array.isArray(f.pattern_names)
        ? f.pattern_names.length
        : 0;
      const totalDetect = Array.isArray(f.detected_patterns)
        ? f.detected_patterns.reduce(
            (sum: number, p: { count?: number }) => sum + (p.count || 0),
            0,
          )
        : 0;
      return { ...f, patternCount, totalDetect };
    });

    const topRiskFiles = scoredFiles
      .sort((a, b) => b.patternCount - a.patternCount || b.totalDetect - a.totalDetect)
      .slice(0, 5)
      .map((f) => ({
        id: f.id,
        file_path: f.file_path,
        file_name: f.file_name,
        pattern_names: f.pattern_names,
        total_detect: f.totalDetect,
      }));

    return NextResponse.json({
      totalAgents: totalAgents || 0,
      totalDetected,
      riskServers,
      lastScanDate,
      patternDistribution,
      topRiskServers,
      topRiskFiles,
    });
  } catch (error) {
    console.error("Privacy scan dashboard error:", error);
    return NextResponse.json(
      { error: "대시보드 데이터 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
