import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/bookmarks - 내 즐겨찾기 목록
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const [hospitalsRes, pharmaciesRes] = await Promise.all([
    supabase
      .from("hospital_bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("pharmacy_bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  return NextResponse.json({
    success: true,
    hospitals: (hospitalsRes.data || []).map((h) => ({
      id: h.hospital_id,
      name: h.hospital_name,
      address: h.hospital_address || "",
      phone: h.hospital_phone || "",
      category: h.hospital_category || "",
      lat: h.latitude || 0,
      lng: h.longitude || 0,
      bookmarkId: h.id,
      createdAt: h.created_at,
    })),
    pharmacies: (pharmaciesRes.data || []).map((p) => ({
      id: p.pharmacy_id,
      name: p.pharmacy_name,
      address: p.pharmacy_address || "",
      phone: p.pharmacy_phone || "",
      lat: p.latitude || 0,
      lng: p.longitude || 0,
      bookmarkId: p.id,
      createdAt: p.created_at,
    })),
  })
}

// POST /api/bookmarks - 즐겨찾기 추가
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const body = await req.json()
  const { type, id, name, address, phone, category, lat, lng } = body

  if (!type || !id || !name) {
    return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 })
  }

  // ✅ type 화이트리스트 검증
  if (!["hospital", "pharmacy"].includes(type)) {
    return NextResponse.json({ error: "올바르지 않은 타입입니다." }, { status: 400 })
  }

  // ✅ id, name 타입 검증
  if (typeof id !== "string" || typeof name !== "string") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }

  if (type === "hospital") {
    const { error } = await supabase.from("hospital_bookmarks").insert({
      user_id: user.id,
      hospital_id: id,
      hospital_name: name,
      hospital_address: address || "",
      hospital_phone: phone || "",
      hospital_category: category || "",
      latitude: lat || 0,
      longitude: lng || 0,
    })

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 즐겨찾기에 추가되어 있습니다." }, { status: 409 })
      }
      return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
    }
  } else if (type === "pharmacy") {
    const { error } = await supabase.from("pharmacy_bookmarks").insert({
      user_id: user.id,
      pharmacy_id: id,
      pharmacy_name: name,
      pharmacy_address: address || "",
      pharmacy_phone: phone || "",
      latitude: lat || 0,
      longitude: lng || 0,
    })

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 즐겨찾기에 추가되어 있습니다." }, { status: 409 })
      }
      return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
    }
  } else {
    return NextResponse.json({ error: "type은 hospital 또는 pharmacy여야 합니다." }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/bookmarks - 즐겨찾기 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const itemId = searchParams.get("id")

  if (!type || !itemId) {
    return NextResponse.json({ error: "type과 id가 필요합니다." }, { status: 400 })
  }

  const table = type === "hospital" ? "hospital_bookmarks" : "pharmacy_bookmarks"
  const idCol = type === "hospital" ? "hospital_id" : "pharmacy_id"

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", user.id)
    .eq(idCol, itemId)

  if (error) {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
