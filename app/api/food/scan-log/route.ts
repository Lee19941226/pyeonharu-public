import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/food/scan-log — 스캔 기록 저장
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인이면 무시 (localStorage에만 저장됨)
  if (!user) {
    return NextResponse.json({ success: false, reason: "not_logged_in" })
  }

  const body = await req.json()
  const { foodCode, foodName, manufacturer, isSafe, detectedAllergens } = body

  if (!foodCode || !foodName) {
    return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 })
  }

  // 같은 식품을 5분 내 중복 스캔 방지
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("food_scan_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("food_code", foodCode)
    .gte("scanned_at", fiveMinAgo)
    .limit(1)

  if (recent && recent.length > 0) {
    return NextResponse.json({ success: true, duplicate: true })
  }

  const { error } = await supabase
    .from("food_scan_logs")
    .insert({
      user_id: user.id,
      food_code: foodCode,
      food_name: foodName,
      manufacturer: manufacturer || "",
      is_safe: isSafe ?? true,
      detected_allergens: detectedAllergens || [],
    })

  if (error) {
    console.error("scan log insert error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
