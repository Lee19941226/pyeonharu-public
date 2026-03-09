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

export async function POST(request: Request) {
  try {
    if (!verifyAgentKey(request)) {
      return NextResponse.json(
        { error: "인증에 실패했습니다." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: "에이전트 ID는 필수 항목입니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ps_agents")
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq("id", agent_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, agent: data });
  } catch (error) {
    console.error("PS agent heartbeat error:", error);
    return NextResponse.json(
      { error: "하트비트 업데이트에 실패했습니다." },
      { status: 500 },
    );
  }
}
