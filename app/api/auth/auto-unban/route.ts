import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  // 프로필 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_banned, ban_until")
    .eq("id", user.id)
    .single();

  if (!profile?.is_banned) {
    return NextResponse.json({ success: true, message: "밴 상태가 아닙니다." });
  }

  // ban_until이 있고 만료되었을 때만 자동 해제
  if (!profile.ban_until || new Date(profile.ban_until) >= new Date()) {
    return NextResponse.json(
      { error: "아직 정지 기간이 만료되지 않았습니다." },
      { status: 403 },
    );
  }

  // service role로 밴 해제
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await adminClient
    .from("profiles")
    .update({
      is_banned: false,
      ban_reason: null,
      ban_until: null,
      banned_at: null,
      banned_by: null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "정지가 자동 해제되었습니다." });
}
