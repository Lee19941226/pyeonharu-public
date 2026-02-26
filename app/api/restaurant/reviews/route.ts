import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// restaurant_key 생성: 이름+주소 → 해시 (프론트와 동일 로직)
function makeRestaurantKey(name: string, address: string): string {
  const raw = `${name.trim()}::${address.trim()}`.toLowerCase()
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// =============================================
// GET /api/restaurant/reviews
// ?keys=key1,key2,key3  → 여러 음식점 평균 별점 일괄 조회
// ?key=xxx              → 단일 음식점 리뷰 목록
// ?name=xxx&address=yyy → 이름+주소로 단일 음식점
// =============================================
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const keys = searchParams.get("keys")
  const key = searchParams.get("key")
  const name = searchParams.get("name")
  const address = searchParams.get("address")

  // ── 여러 음식점 평균 별점 일괄 조회 ──
  if (keys) {
    const keyList = keys.split(",").filter(Boolean)
    if (keyList.length === 0) {
      return NextResponse.json({ ratings: {} })
    }

    const { data, error } = await supabase
      .from("restaurant_reviews")
      .select("restaurant_key, rating")
      .in("restaurant_key", keyList)

    if (error) {
      console.error("[Reviews GET] Error:", error)
      console.error('[restaurant/reviews]', error.message)
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
    }

    // 음식점별 평균 계산
    const grouped: Record<string, number[]> = {}
    for (const row of data || []) {
      if (!grouped[row.restaurant_key]) grouped[row.restaurant_key] = []
      grouped[row.restaurant_key].push(row.rating)
    }

    const ratings: Record<string, { avg: number; count: number }> = {}
    for (const [rKey, ratingList] of Object.entries(grouped)) {
      const sum = ratingList.reduce((a, b) => a + b, 0)
      const avg = Math.round((sum / ratingList.length) * 10) / 10 // 소수점 1자리
      ratings[rKey] = { avg, count: ratingList.length }
    }

    // 현재 사용자의 리뷰도 함께 반환 (새로고침 시 "내 리뷰" 버튼 복원용)
    const { data: { user } } = await supabase.auth.getUser()
    let myReviews: Record<string, { id: string; rating: number; memo: string }> = {}
    if (user) {
      const { data: myData } = await supabase
        .from("restaurant_reviews")
        .select("id, restaurant_key, rating, memo")
        .eq("user_id", user.id)
        .in("restaurant_key", keyList)

      for (const row of myData || []) {
        myReviews[row.restaurant_key] = {
          id: row.id,
          rating: row.rating,
          memo: row.memo || "",
        }
      }
    }

    return NextResponse.json({ ratings, myReviews })
  }

  // ── 단일 음식점 리뷰 목록 ──
  const targetKey = key || (name ? makeRestaurantKey(name, address || "") : null)
  if (!targetKey) {
    return NextResponse.json({ error: "key 또는 name 파라미터가 필요합니다." }, { status: 400 })
  }

  // 현재 사용자 확인 (내 리뷰 여부)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: reviews, error: reviewError } = await supabase
    .from("restaurant_reviews")
    .select("id, user_id, rating, memo, created_at, updated_at")
    .eq("restaurant_key", targetKey)
    .order("created_at", { ascending: false })

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 })
  }

  // 평균 계산
  const ratings = (reviews || []).map(r => r.rating)
  const avg = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0

  // 내 리뷰 찾기
  const myReview = user
    ? (reviews || []).find(r => r.user_id === user.id) || null
    : null

  return NextResponse.json({
    key: targetKey,
    avg,
    count: ratings.length,
    reviews: (reviews || []).map(r => ({
      id: r.id,
      rating: r.rating,
      memo: r.memo,
      isMine: user ? r.user_id === user.id : false,
      createdAt: r.created_at,
    })),
    myReview: myReview ? {
      id: myReview.id,
      rating: myReview.rating,
      memo: myReview.memo,
    } : null,
  })
}

// =============================================
// POST /api/restaurant/reviews — 리뷰 작성
// =============================================
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const body = await req.json()
  const { name, address, rating, memo } = body

  if (!name || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "음식점 이름과 별점(1~5)이 필요합니다." }, { status: 400 })
  }

  if (memo && memo.length > 100) {
    return NextResponse.json({ error: "메모는 100자까지만 가능합니다." }, { status: 400 })
  }

  const restaurantKey = makeRestaurantKey(name, address || "")

  // upsert로 1인 1리뷰 처리 (있으면 업데이트)
  const { data, error } = await supabase
    .from("restaurant_reviews")
    .upsert(
      {
        user_id: user.id,
        restaurant_key: restaurantKey,
        restaurant_name: name.trim(),
        restaurant_address: (address || "").trim(),
        rating: Math.round(rating),
        memo: (memo || "").trim().slice(0, 100),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,restaurant_key" }
    )
    .select("id, rating, memo")
    .single()

  if (error) {
    console.error("[Reviews POST] Error:", error)
    return NextResponse.json({ error: "리뷰 저장에 실패했습니다." }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    review: data,
    restaurantKey,
  })
}

// =============================================
// DELETE /api/restaurant/reviews — 리뷰 삭제
// =============================================
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const reviewId = searchParams.get("id")

  if (!reviewId) {
    return NextResponse.json({ error: "리뷰 ID가 필요합니다." }, { status: 400 })
  }

  const { error } = await supabase
    .from("restaurant_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id) // 본인 것만 삭제

  if (error) {
    console.error("[Reviews DELETE] Error:", error)
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
