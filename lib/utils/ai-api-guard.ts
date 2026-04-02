import { createClient as createServiceClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { apiError } from "@/lib/utils/api-response";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const AI_RESULT_UNKNOWN_MESSAGE = "결과를 알 수 없습니다. 잠시 후 다시 시도해주세요.";

export function aiInvalidInputResponse() {
  return apiError(400, "INVALID_AI_INPUT", "입력 형식이 올바르지 않습니다.");
}

export function aiResultUnavailableResponse() {
  return apiError(502, "AI_RESULT_UNAVAILABLE", AI_RESULT_UNKNOWN_MESSAGE);
}

export function aiServiceErrorResponse() {
  return apiError(500, "AI_SERVICE_ERROR", "분석 중 오류가 발생했습니다.");
}

export async function logAiSecurityEvent(params: {
  route: string;
  reason: string;
  userId?: string | null;
  sample?: string;
}) {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await supabaseAdmin.from("user_action_logs").insert({
      user_id: params.userId || null,
      action_type: "security_event",
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        route: params.route,
        reason: params.reason,
        sample: String(params.sample || "").slice(0, 200),
      },
    });
  } catch (error) {
    console.error("[ai-security-event] log failed:", error);
  }
}
