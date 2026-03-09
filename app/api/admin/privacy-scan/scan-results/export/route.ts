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
    const agentId = searchParams.get("agent_id") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    // 검사 결과 조회
    let resultQuery = supabaseAdmin
      .from("ps_scan_results")
      .select("id, agent_id, scanned_at, ps_agents(device_name)");

    if (agentId) {
      resultQuery = resultQuery.eq("agent_id", agentId);
    }
    if (from) {
      resultQuery = resultQuery.gte("scanned_at", from);
    }
    if (to) {
      resultQuery = resultQuery.lte("scanned_at", to);
    }

    const { data: results, error: resultError } = await resultQuery
      .order("scanned_at", { ascending: false });

    if (resultError) throw resultError;

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "내보낼 데이터가 없습니다." },
        { status: 404 },
      );
    }

    // 해당 결과들의 파일 목록 조회
    const resultIds = results.map((r) => r.id);
    const { data: files, error: filesError } = await supabaseAdmin
      .from("ps_scan_files")
      .select("scan_result_id, file_path, file_name, file_size, pattern_names, detected_patterns")
      .in("scan_result_id", resultIds);

    if (filesError) throw filesError;

    // 결과 ID → 에이전트 정보 매핑
    const resultMap: Record<
      string,
      { device_name: string; scanned_at: string }
    > = {};
    results.forEach((r) => {
      const agentInfo = r.ps_agents as unknown as { device_name: string } | null;
      resultMap[r.id] = {
        device_name: agentInfo?.device_name || "알 수 없음",
        scanned_at: r.scanned_at || "",
      };
    });

    // CSV 헤더 (BOM 포함 - 한글 엑셀 호환)
    const BOM = "\uFEFF";
    const header = "서버명,파일경로,파일명,파일크기,검출패턴,검출수,검사일시";
    const rows: string[] = [];

    (files || []).forEach((file) => {
      const info = resultMap[file.scan_result_id] || {
        device_name: "알 수 없음",
        scanned_at: "",
      };

      const patternNames = Array.isArray(file.pattern_names)
        ? file.pattern_names.join("; ")
        : "";

      let detectedCount = 0;
      if (Array.isArray(file.detected_patterns)) {
        detectedCount = file.detected_patterns.reduce(
          (sum: number, p: { count?: number }) => sum + (p.count || 0),
          0,
        );
      }

      // CSV 값 이스케이프: 쉼표, 따옴표, 줄바꿈 포함 시 따옴표로 감싸기
      const escapeCsv = (val: string): string => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      rows.push(
        [
          escapeCsv(info.device_name),
          escapeCsv(file.file_path || ""),
          escapeCsv(file.file_name || ""),
          file.file_size || 0,
          escapeCsv(patternNames),
          detectedCount,
          escapeCsv(info.scanned_at),
        ].join(","),
      );
    });

    const csvContent = BOM + header + "\n" + rows.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="privacy-scan-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("PS scan-results export error:", error);
    return NextResponse.json(
      { error: "검사 결과 내보내기에 실패했습니다." },
      { status: 500 },
    );
  }
}
