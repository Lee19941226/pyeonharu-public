import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function toSignedUrl(path: string) {
  const supabase = getAdminClient();
  const { data } = await supabase.storage
    .from("food-product-images")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl || null;
}

// GET /api/admin/food-images?status=pending&page=1&pageSize=30&foodCode=...
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status") || "pending";
  const foodCode = (req.nextUrl.searchParams.get("foodCode") || "").trim();
  const page = Math.max(parseInt(req.nextUrl.searchParams.get("page") || "1", 10), 1);
  const pageSize = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("pageSize") || "30", 10), 1),
    100,
  );

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getAdminClient();
  let query = supabase
    .from("food_product_images")
    .select("id, food_code, food_name, storage_path, mime_type, file_size, source_type, status, submitted_by, reviewed_by, review_note, reviewed_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (["pending", "approved", "rejected"].includes(status)) {
    query = query.eq("status", status);
  }
  if (foodCode) {
    query = query.eq("food_code", foodCode);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = await Promise.all(
    (data || []).map(async (row: any) => ({
      ...row,
      preview_url: await toSignedUrl(row.storage_path),
    })),
  );

  return NextResponse.json({
    items: rows,
    page,
    pageSize,
    total: count || 0,
  });
}

// PATCH /api/admin/food-images
// body: { id, status: "approved"|"rejected", note? }
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  const note = body.note ? String(body.note) : null;

  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("food_product_images")
    .update({
      status,
      review_note: note,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, reviewed_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, item: data });
}
