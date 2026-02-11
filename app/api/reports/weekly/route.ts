import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/reports/weekly — 주간 안전 리포트 데이터
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const weeksAgo = parseInt(searchParams.get("weeksAgo") || "0") // 0 = 이번 주, 1 = 지난 주

  // 주간 범위 계산 (월~일)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=일, 1=월, ...
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - diffToMonday - weeksAgo * 7)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  weekEnd.setHours(0, 0, 0, 0)

  const startStr = weekStart.toISOString()
  const endStr = weekEnd.toISOString()

  // 1. 이번 주 전체 스캔 기록
  const { data: scans, error } = await supabase
    .from("food_scan_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("scanned_at", startStr)
    .lt("scanned_at", endStr)
    .order("scanned_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const allScans = scans || []
  const totalScans = allScans.length
  const safeScans = allScans.filter(s => s.is_safe).length
  const dangerScans = totalScans - safeScans
  const safeRate = totalScans > 0 ? Math.round((safeScans / totalScans) * 100) : 0

  // 2. 위험 감지된 식품 목록
  const dangerFoods = allScans
    .filter(s => !s.is_safe)
    .map(s => ({
      foodCode: s.food_code,
      foodName: s.food_name,
      manufacturer: s.manufacturer,
      detectedAllergens: s.detected_allergens || [],
      scannedAt: s.scanned_at,
    }))

  // 3. 가장 많이 확인한 식품 Top 5
  const foodCountMap: Record<string, { foodName: string; manufacturer: string; count: number; isSafe: boolean }> = {}
  for (const s of allScans) {
    if (!foodCountMap[s.food_code]) {
      foodCountMap[s.food_code] = {
        foodName: s.food_name,
        manufacturer: s.manufacturer,
        count: 0,
        isSafe: s.is_safe,
      }
    }
    foodCountMap[s.food_code].count++
  }
  const topFoods = Object.entries(foodCountMap)
    .map(([code, data]) => ({ foodCode: code, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 4. 이번 주 새로 추가된 안전 식품 (즐겨찾기)
  const { data: newFavorites } = await supabase
    .from("food_favorites")
    .select("food_code, food_name, manufacturer, is_safe, created_at")
    .eq("user_id", user.id)
    .gte("created_at", startStr)
    .lt("created_at", endStr)
    .order("created_at", { ascending: false })

  // 5. 일별 스캔 현황
  const dailyStats: Record<string, { total: number; safe: number; danger: number }> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    dailyStats[key] = { total: 0, safe: 0, danger: 0 }
  }
  for (const s of allScans) {
    const key = s.scanned_at.slice(0, 10)
    if (dailyStats[key]) {
      dailyStats[key].total++
      if (s.is_safe) dailyStats[key].safe++
      else dailyStats[key].danger++
    }
  }

  // 6. 지난 주 대비 변화
  const prevStart = new Date(weekStart)
  prevStart.setDate(prevStart.getDate() - 7)
  const prevStartStr = prevStart.toISOString()

  const { count: prevTotal } = await supabase
    .from("food_scan_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("scanned_at", prevStartStr)
    .lt("scanned_at", startStr)

  const { count: prevDanger } = await supabase
    .from("food_scan_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_safe", false)
    .gte("scanned_at", prevStartStr)
    .lt("scanned_at", startStr)

  return NextResponse.json({
    period: {
      start: weekStart.toISOString().slice(0, 10),
      end: new Date(weekEnd.getTime() - 1).toISOString().slice(0, 10),
      weeksAgo,
    },
    summary: {
      totalScans,
      safeScans,
      dangerScans,
      safeRate,
    },
    comparison: {
      prevTotalScans: prevTotal || 0,
      prevDangerScans: prevDanger || 0,
      scanChange: totalScans - (prevTotal || 0),
      dangerChange: dangerScans - (prevDanger || 0),
    },
    dangerFoods,
    topFoods,
    newFavorites: newFavorites || [],
    dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
    })),
  })
}
