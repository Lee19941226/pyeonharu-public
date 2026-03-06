import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/admin/site-settings?key=maintenance_mode
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const key = req.nextUrl.searchParams.get("key");
  const supabase = getAdminClient();

  if (key) {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("key", key)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "설정을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  }

  // key 없으면 전체 반환
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .order("key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}

// POST /api/admin/site-settings
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json(
      { error: "key와 value가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("site_settings")
    .upsert(
      { key, value, updated_by: auth.userId },
      { onConflict: "key" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, setting: data });
}
