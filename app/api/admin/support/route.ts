import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** PostgREST .or() 필터 인젝션 방지 */
function sanitizeFilterValue(value: string): string {
  return value.replace(/[,.()"\\]/g, "");
}

// 문의 목록 조회 (관리자)
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

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
      const safeSearch = sanitizeFilterValue(search);
      query = query.or(
        `title.ilike.%${safeSearch}%,name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`,
      );
    }

    const { data, count, error } = await query.range(
      offset,
      offset + limit - 1,
    );

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
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// 문의 답변/상태 변경 (관리자)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

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
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// 문의 삭제 (관리자)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.ok) return auth.response;

    const { inquiryId } = await req.json();

    const { error } = await supabaseAdmin
      .from("support_inquiries")
      .delete()
      .eq("id", inquiryId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[admin/support]", error.message);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
