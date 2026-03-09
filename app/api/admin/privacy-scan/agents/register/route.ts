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
    const {
      device_name,
      hostname,
      ip_address,
      mac_address,
      os_type,
      os_version,
      agent_version,
    } = body;

    if (!mac_address) {
      return NextResponse.json(
        { error: "MAC 주소는 필수 항목입니다." },
        { status: 400 },
      );
    }

    if (!device_name) {
      return NextResponse.json(
        { error: "장치명은 필수 항목입니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ps_agents")
      .upsert(
        {
          device_name,
          hostname: hostname || null,
          ip_address: ip_address || null,
          mac_address,
          os_type: os_type || null,
          os_version: os_version || null,
          agent_version: agent_version || null,
          is_active: true,
          last_heartbeat_at: new Date().toISOString(),
        },
        { onConflict: "mac_address" },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ agent: data }, { status: 201 });
  } catch (error) {
    console.error("PS agent register error:", error);
    return NextResponse.json(
      { error: "에이전트 등록에 실패했습니다." },
      { status: 500 },
    );
  }
}
