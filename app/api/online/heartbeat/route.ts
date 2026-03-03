import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onlineStore } from "@/lib/online-store";
import { headers } from "next/headers";

/**
 * POST /api/online/heartbeat
 * 사용자가 주기적으로(30초) 호출하여 온라인 상태를 유지합니다.
 * 로그인/비로그인 모두 지원합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body.sessionId as string | undefined;

    // IP 주소 추출
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";

    // 로그인 사용자 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 로그인 사용자
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .single();

      await onlineStore.upsert(user.id, {
        nickname: profile?.nickname || user.user_metadata?.nickname || null,
        isAuthenticated: true,
        ipAddress,
      });
    } else if (sessionId) {
      // 비로그인 사용자 (sessionId 기반)
      await onlineStore.upsert(`anon_${sessionId}`, {
        nickname: null,
        isAuthenticated: false,
        ipAddress,
      });
    } else {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/**
 * DELETE /api/online/heartbeat
 * 사용자가 페이지를 떠날 때 명시적으로 오프라인 처리합니다.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = body.sessionId as string | undefined;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || (sessionId ? `anon_${sessionId}` : null);
    if (userId) {
      await onlineStore.remove(userId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
