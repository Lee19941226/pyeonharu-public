import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface RateLimitParams {
  prefix: string;
  userId: string | null;
  dailyLimitLogin: number;
  dailyLimitAnon: number;
}

/**
 * DB 기반 API rate limit 체크 + 카운트 증가
 * 호출 시점에 카운트가 증가되므로, OpenAI 호출 직전에 사용할 것.
 */
export async function checkApiRateLimit({
  prefix,
  userId,
  dailyLimitLogin,
  dailyLimitAnon,
}: RateLimitParams): Promise<{
  allowed: boolean;
  limit: number;
  used: number;
}> {
  const today = new Date().toISOString().split("T")[0];
  let identifier: string;
  let dailyLimit: number;

  if (userId) {
    identifier = `${prefix}:user:${userId}:${today}`;
    dailyLimit = dailyLimitLogin;
  } else {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
    identifier = `${prefix}:ip:${ip}:${today}`;
    dailyLimit = dailyLimitAnon;
  }

  const { count } = await supabaseAdmin
    .from("api_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier);

  const used = count || 0;
  if (used >= dailyLimit) {
    return { allowed: false, limit: dailyLimit, used };
  }

  await supabaseAdmin.from("api_rate_limits").insert({ identifier });
  return { allowed: true, limit: dailyLimit, used: used + 1 };
}
