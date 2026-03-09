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
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from("ps_licenses")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      licenses: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("PS licenses GET error:", error);
    return NextResponse.json(
      { error: "라이선스 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("ps_licenses")
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ license: data }, { status: 201 });
  } catch (error) {
    console.error("PS licenses POST error:", error);
    return NextResponse.json(
      { error: "라이선스 생성에 실패했습니다." },
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
        { error: "라이선스 ID는 필수 항목입니다." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("ps_licenses")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PS licenses DELETE error:", error);
    return NextResponse.json(
      { error: "라이선스 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
