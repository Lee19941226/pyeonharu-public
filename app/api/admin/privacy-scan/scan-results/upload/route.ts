import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function verifyAgentKey(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === process.env.PS_AGENT_API_KEY;
}

interface ScanFileInput {
  file_path: string;
  file_name: string;
  file_size: number;
  pattern_names: string[];
  detected_patterns: { pattern_name: string; count: number }[];
  last_modified_at?: string;
}

export async function POST(request: Request) {
  try {
    if (!verifyAgentKey(request)) {
      return NextResponse.json(
        { error: "인증에 실패했습니다." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      agent_id,
      policy_id,
      scan_round,
      total_files,
      detected_files,
      detected_count,
      status,
      files,
    } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: "에이전트 ID는 필수 항목입니다." },
        { status: 400 },
      );
    }

    // 검사 결과 생성
    const { data: scanResult, error: resultError } = await supabaseAdmin
      .from("ps_scan_results")
      .insert({
        agent_id,
        policy_id: policy_id || null,
        scan_round: scan_round || null,
        total_files: total_files || 0,
        detected_files: detected_files || 0,
        detected_count: detected_count || 0,
        status: status || "completed",
        scanned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (resultError) throw resultError;

    // 파일 목록 삽입
    if (Array.isArray(files) && files.length > 0) {
      const fileRecords = files.map((f: ScanFileInput) => ({
        scan_result_id: scanResult.id,
        file_path: f.file_path,
        file_name: f.file_name,
        file_size: f.file_size || 0,
        pattern_names: f.pattern_names || [],
        detected_patterns: f.detected_patterns || [],
        last_modified_at: f.last_modified_at || null,
      }));

      const { error: filesError } = await supabaseAdmin
        .from("ps_scan_files")
        .insert(fileRecords);

      if (filesError) throw filesError;
    }

    return NextResponse.json(
      { success: true, scan_result_id: scanResult.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("PS scan-results upload error:", error);
    return NextResponse.json(
      { error: "검사 결과 업로드에 실패했습니다." },
      { status: 500 },
    );
  }
}
