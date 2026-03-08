import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction, type ActionType } from "@/lib/utils/action-log";

const ALLOWED_ACTIONS: ActionType[] = [
  "login",
  "signup",
  "page_view",
  "food_search",
  "food_scan",
  "food_check",
  "food_select",
  "food_share",
  "favorite_add",
  "favorite_remove",
  "hospital_search",
  "hospital_select",
  "pharmacy_search",
  "pharmacy_select",
  "community_post_create",
  "community_comment_create",
  "community_comment_delete",
  "community_like",
  "diet_entry_create",
  "diet_entry_delete",
  "profile_update",
  "account_delete",
  "doctor_review_create",
  "doctor_review_delete",
  "doctor_review_report",
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim() as ActionType;
    const metadata =
      body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "지원하지 않는 액션" }, { status: 400 });
    }

    logAction({
      userId: user?.id || null,
      actionType: action,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "로그 기록 실패" }, { status: 500 });
  }
}