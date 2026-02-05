import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/bookmarks/check?type=hospital&id=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ bookmarked: false })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const itemId = searchParams.get("id")

  if (!type || !itemId) {
    return NextResponse.json({ bookmarked: false })
  }

  const table = type === "hospital" ? "hospital_bookmarks" : "pharmacy_bookmarks"
  const idCol = type === "hospital" ? "hospital_id" : "pharmacy_id"

  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", user.id)
    .eq(idCol, itemId)
    .maybeSingle()

  return NextResponse.json({ bookmarked: !!data })
}
