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
  | "food_select"
  | "food_share"
  | "favorite_add"
  | "favorite_remove"
  | "hospital_search"
  | "hospital_select"
  | "pharmacy_search"
  | "pharmacy_select"
  | "community_post_create"
  | "community_comment_create"
  | "community_comment_delete"
  | "community_like"
  | "diet_entry_create"
  | "diet_entry_delete"
  | "profile_update"
  | "account_delete"
  | "doctor_review_create"
  | "doctor_review_delete"
  | "doctor_review_report";

interface LogActionParams {
  userId: string | null;
  actionType: ActionType;
  metadata?: Record<string, unknown>;
  /** 클라이언트 GPS 기반 지역명 (우선 사용) */
  geoRegion?: string;
  /** "gps" | "ip" — 지역 정보 출처 */
  geoSource?: string;
}

/**
 * 요청 헤더에서 IP 주소, User-Agent, 리전 정보 추출
 */
export async function getRequestInfo() {
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  // Vercel / Cloudflare 지오 헤더
  const country =
    headersList.get("x-vercel-ip-country") ||
    headersList.get("cf-ipcountry") ||
    "";
  const countryRegion = headersList.get("x-vercel-ip-country-region") || "";
  const city = headersList.get("x-vercel-ip-city") || "";
  const region = [city, countryRegion, country].filter(Boolean).join(", ");

  return { ipAddress, userAgent, region };
}

export async function logAction({
  userId,
  actionType,
  metadata = {},
  geoRegion,
  geoSource,
}: LogActionParams) {
  try {
    const { ipAddress, userAgent, region: ipRegion } = await getRequestInfo();

    // GPS 지역이 있으면 우선 사용, 없으면 IP 기반 폴백
    const finalRegion = geoRegion || ipRegion;
    const finalSource = geoRegion ? (geoSource || "gps") : (ipRegion ? "ip" : "");

    supabaseAdmin
      .from("user_action_logs")
      .insert({
        user_id: userId,
        action_type: actionType,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          ...metadata,
          ...(finalRegion && { _region: finalRegion }),
          ...(finalSource && { _geo_source: finalSource }),
        },
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
