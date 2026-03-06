import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/utils/admin-auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      is_banned: false,
      ban_reason: null,
      ban_until: null,
      banned_at: null,
      banned_by: null,
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "밴이 해제되었습니다.",
  });
}
