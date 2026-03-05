import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * 세션 토큰 생성 및 DB upsert (서버 전용)
 * 기존 세션이 있으면 덮어씀 → 이전 기기 세션 무효화
 */
export async function createSessionToken(userId: string): Promise<string> {
  const token = randomUUID();

  const { error } = await supabaseAdmin.from("active_sessions").upsert(
    {
      user_id: userId,
      session_token: token,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[session-manager] upsert failed:", error.message);
  }

  return token;
}

/**
 * 세션 토큰 검증: DB의 토큰과 쿠키 토큰 비교
 * true = 유효, false = 불일치 (다른 기기에서 로그인됨)
 * DB 오류 시 true 반환 (fail-open)
 */
export async function validateSession(
  supabase: SupabaseClient,
  userId: string,
  token: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("active_sessions")
      .select("session_token")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // 레코드 없음 or 쿼리 실패 → 안전 허용
      return true;
    }

    return data.session_token === token;
  } catch {
    // 예외 발생 시 fail-open
    return true;
  }
}
