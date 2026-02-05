import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    console.log("[DeleteAccount] Request received")
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ success: false, message: "인증되지 않은 사용자입니다." }, { status: 401 })
    }
    console.log([DeleteAccount] Starting deletion for user: )
    await supabase.from("hospital_bookmarks").delete().eq("user_id", user.id)
    await supabase.from("pharmacy_bookmarks").delete().eq("user_id", user.id)
    await supabase.from("clothes").delete().eq("user_id", user.id)
    await supabase.from("outfit_history").delete().eq("user_id", user.id)
    await supabase.from("style_preferences").delete().eq("user_id", user.id)
    await supabase.from("profiles").delete().eq("id", user.id)
    await supabase.auth.signOut()
    const response = NextResponse.json({ success: true, message: "회원 탈퇴가 완료되었습니다." }, { status: 200 })
    response.cookies.set("sb-access-token", "", { maxAge: 0, path: "/" })
    response.cookies.set("sb-refresh-token", "", { maxAge: 0, path: "/" })
    console.log("[DeleteAccount] Deletion completed successfully")
    return response
  } catch (error) {
    console.error("[DeleteAccount] Unexpected error:", error)
    return NextResponse.json({ success: false, message: "회원 탈퇴 중 오류가 발생했습니다." }, { status: 500 })
  }
}
