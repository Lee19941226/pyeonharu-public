import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 관리자 인증 헬퍼
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;
  return user;
}

// 문의 목록 조회 (관리자)
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("support_inquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`,
      );
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // 통계
    const { data: allInquiries } = await supabaseAdmin
      .from("support_inquiries")
      .select("status");

    const stats = {
      total: allInquiries?.length || 0,
      pending: allInquiries?.filter((i) => i.status === "pending").length || 0,
      in_progress:
        allInquiries?.filter((i) => i.status === "in_progress").length || 0,
      resolved:
        allInquiries?.filter((i) => i.status === "resolved").length || 0,
    };

    return NextResponse.json({
      inquiries: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
    });
  } catch (error: any) {
    console.error("[admin/support]", error.message);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// 문의 답변/상태 변경 (관리자)
export async function PATCH(req: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const body = await req.json();
    const { inquiryId, status, admin_reply } = body;

    if (!inquiryId) {
      return NextResponse.json(
        { error: "문의 ID가 필요합니다" },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (admin_reply !== undefined) {
      updateData.admin_reply = admin_reply;
      updateData.replied_at = new Date().toISOString();
      if (!status) updateData.status = "resolved";
    }

    const { data, error } = await supabaseAdmin
      .from("support_inquiries")
      .update(updateData)
      .eq("id", inquiryId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, inquiry: data });
  } catch (error: any) {
    console.error("[admin/support]", error.message);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// 문의 삭제 (관리자)
export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const { inquiryId } = await req.json();

    const { error } = await supabaseAdmin
      .from("support_inquiries")
      .delete()
      .eq("id", inquiryId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[admin/support]", error.message);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
