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
    const patternType = searchParams.get("pattern_type") || "";
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("ps_patterns")
      .select("*", { count: "exact" });

    if (patternType) {
      query = query.eq("pattern_type", patternType);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      patterns: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("PS patterns GET error:", error);
    return NextResponse.json(
      { error: "패턴 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();

    if (body.pattern_type && body.pattern_type !== "custom") {
      return NextResponse.json(
        { error: "사용자 정의(custom) 패턴만 생성할 수 있습니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ps_patterns")
      .insert({ ...body, pattern_type: "custom" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ pattern: data }, { status: 201 });
  } catch (error) {
    console.error("PS patterns POST error:", error);
    return NextResponse.json(
      { error: "패턴 생성에 실패했습니다." },
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
        { error: "패턴 ID는 필수 항목입니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ps_patterns")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ pattern: data });
  } catch (error) {
    console.error("PS patterns PATCH error:", error);
    return NextResponse.json(
      { error: "패턴 수정에 실패했습니다." },
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
        { error: "패턴 ID는 필수 항목입니다." },
        { status: 400 },
      );
    }

    // 기본 패턴은 삭제 불가
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("ps_patterns")
      .select("pattern_type")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (!existing) {
      return NextResponse.json(
        { error: "패턴을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (existing.pattern_type !== "custom") {
      return NextResponse.json(
        { error: "기본 패턴은 삭제할 수 없습니다. 사용자 정의(custom) 패턴만 삭제 가능합니다." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("ps_patterns")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PS patterns DELETE error:", error);
    return NextResponse.json(
      { error: "패턴 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
