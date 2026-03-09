import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "검사 결과 ID는 필수 항목입니다." },
        { status: 400 },
      );
    }

    // 검사 결과 조회 (에이전트 정보 포함)
    const { data: scanResult, error: resultError } = await supabaseAdmin
      .from("ps_scan_results")
      .select("*, ps_agents(id, device_name, hostname, ip_address, os_type)")
      .eq("id", id)
      .single();

    if (resultError) throw resultError;

    if (!scanResult) {
      return NextResponse.json(
        { error: "검사 결과를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 해당 검사 결과의 파일 목록 조회
    const { data: files, error: filesError } = await supabaseAdmin
      .from("ps_scan_files")
      .select("*")
      .eq("scan_result_id", id)
      .order("created_at", { ascending: false });

    if (filesError) throw filesError;

    return NextResponse.json({
      result: scanResult,
      files: files || [],
    });
  } catch (error) {
    console.error("PS scan-result detail GET error:", error);
    return NextResponse.json(
      { error: "검사 결과 상세 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
