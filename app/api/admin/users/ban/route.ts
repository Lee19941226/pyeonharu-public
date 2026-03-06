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
  const { userId, reason, duration } = body;

  if (!userId || !reason?.trim()) {
    return NextResponse.json(
      { error: "userId와 reason(밴 사유)은 필수입니다." },
      { status: 400 },
    );
  }

  if (!["1d", "7d", "30d", "permanent"].includes(duration)) {
    return NextResponse.json(
      { error: "duration은 '1d', '7d', '30d', 'permanent' 중 하나여야 합니다." },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();

  // 대상 사용자가 관리자인지 확인
  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (target?.role === "admin" || target?.role === "super_admin") {
    return NextResponse.json(
      { error: "관리자 계정은 밴할 수 없습니다." },
      { status: 403 },
    );
  }

  // ban_until 계산
  let banUntil: string | null = null;
  if (duration !== "permanent") {
    const days = duration === "1d" ? 1 : duration === "7d" ? 7 : 30;
    const until = new Date();
    until.setDate(until.getDate() + days);
    banUntil = until.toISOString();
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      is_banned: true,
      ban_reason: reason.trim(),
      ban_until: banUntil,
      banned_at: new Date().toISOString(),
      banned_by: auth.userId,
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 세션 무효화: active_sessions에서 해당 사용자 삭제
  await supabase.from("active_sessions").delete().eq("user_id", userId);

  return NextResponse.json({
    success: true,
    message: duration === "permanent"
      ? "영구 정지 처리되었습니다."
      : `${duration.replace("d", "일")} 정지 처리되었습니다.`,
  });
}
