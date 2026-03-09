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
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("ps_agents")
      .select("*, ps_policies(id, name)", { count: "exact" });

    if (search) {
      query = query.or(
        `device_name.ilike.%${search}%,hostname.ilike.%${search}%`,
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      agents: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("PS agents GET error:", error);
    return NextResponse.json(
      { error: "에이전트 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const {
      device_name,
      hostname,
      ip_address,
      mac_address,
      os_type,
      os_version,
      agent_version,
      policy_id,
      is_active,
    } = body;

    if (!device_name) {
      return NextResponse.json(
        { error: "장치명은 필수 항목입니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ps_agents")
      .insert({
        device_name,
        hostname: hostname || null,
        ip_address: ip_address || null,
        mac_address: mac_address || null,
        os_type: os_type || null,
        os_version: os_version || null,
        agent_version: agent_version || null,
        policy_id: policy_id || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ agent: data }, { status: 201 });
  } catch (error) {
    console.error("PS agents POST error:", error);
    return NextResponse.json(
      { error: "에이전트 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "에이전트 ID는 필수 항목입니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ps_agents")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ agent: data });
  } catch (error) {
    console.error("PS agents PATCH error:", error);
    return NextResponse.json(
      { error: "에이전트 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "에이전트 ID는 필수 항목입니다." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("ps_agents")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PS agents DELETE error:", error);
    return NextResponse.json(
      { error: "에이전트 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
