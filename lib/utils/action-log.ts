import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type ActionType =
  | "login"
  | "signup"
  | "page_view"
  | "food_search"
  | "food_scan"
  | "food_check"
  | "community_post_create"
  | "community_comment_create"
  | "community_comment_delete"
  | "community_like"
  | "diet_entry_create"
  | "diet_entry_delete"
  | "profile_update"
  | "account_delete";

interface LogActionParams {
  userId: string | null;
  actionType: ActionType;
  metadata?: Record<string, unknown>;
}

/**
 * 요청 헤더에서 IP 주소와 User-Agent 추출
 */
export async function getRequestInfo() {
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  return { ipAddress, userAgent };
}

/**
 * 사용자 액션 로그 기록 (fire-and-forget)
 */
export async function logAction({
  userId,
  actionType,
  metadata = {},
}: LogActionParams) {
  try {
    const { ipAddress, userAgent } = await getRequestInfo();

    supabaseAdmin
      .from("user_action_logs")
      .insert({
        user_id: userId,
        action_type: actionType,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata,
      })
      .then(({ error }) => {
        if (error) {
          console.error("[action-log] Insert failed:", error.message);
        }
      });
  } catch (err) {
    console.error("[action-log] Unexpected error:", err);
  }
}
