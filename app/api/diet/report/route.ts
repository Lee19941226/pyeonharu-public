import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/diet/report?type=weekly|monthly&date=2026-02-21
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "weekly" // weekly | monthly
  const baseDate = searchParams.get("date") || new Date().toISOString().split("T")[0]

  // 프로필에서 BMR 가져오기
  const { data: profile } = await supabase
    .from("profiles")
    .select("bmr")
    .eq("id", user.id)
    .single()
  const bmr = profile?.bmr || 0

  let startDate: string
  let endDate: string

  if (type === "monthly") {
    // 해당 월의 1일 ~ 말일
    const d = new Date(baseDate)
    startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    endDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  } else {
    // 해당 주 (월~일)
    const d = new Date(baseDate)
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    startDate = monday.toISOString().split("T")[0]
    endDate = sunday.toISOString().split("T")[0]
  }

  // 기간 내 모든 엔트리 조회
  const { data: entries, error } = await supabase
    .from("diet_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("recorded_at", `${startDate}T00:00:00+09:00`)
    .lte("recorded_at", `${endDate}T23:59:59+09:00`)
    .order("recorded_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 })
  }

  const allEntries = entries || []

  // 일별 집계
  const dailyMap: Record<string, { totalCal: number; count: number; entries: typeof allEntries }> = {}

  // 기간의 모든 날짜를 미리 채워넣기
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    const key = current.toISOString().split("T")[0]
    dailyMap[key] = { totalCal: 0, count: 0, entries: [] }
    current.setDate(current.getDate() + 1)
  }

  allEntries.forEach((e) => {
    // KST 기준 날짜 추출
    const kstDate = new Date(new Date(e.recorded_at).getTime() + 9 * 60 * 60 * 1000)
    const key = kstDate.toISOString().split("T")[0]
    if (dailyMap[key]) {
      dailyMap[key].totalCal += e.estimated_cal || 0
      dailyMap[key].count += 1
      dailyMap[key].entries.push(e)
    }
  })

  const dailyStats = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      totalCal: data.totalCal,
      count: data.count,
      isOver: bmr > 0 && data.totalCal > bmr,
      overAmount: bmr > 0 ? Math.max(0, data.totalCal - bmr) : 0,
    }))

  // 전체 통계
  const totalCalSum = dailyStats.reduce((sum, d) => sum + d.totalCal, 0)
  const daysWithData = dailyStats.filter((d) => d.count > 0).length
  const avgCal = daysWithData > 0 ? Math.round(totalCalSum / daysWithData) : 0
  const overDays = dailyStats.filter((d) => d.isOver).length
  const maxDay = dailyStats.reduce((max, d) => (d.totalCal > max.totalCal ? d : max), dailyStats[0])
  const minDayWithData = dailyStats
    .filter((d) => d.count > 0)
    .reduce((min, d) => (d.totalCal < min.totalCal ? d : min), dailyStats.find((d) => d.count > 0) || dailyStats[0])

  // 자주 먹은 음식 TOP 5
  const foodCount: Record<string, number> = {}
  allEntries.forEach((e) => {
    foodCount[e.food_name] = (foodCount[e.food_name] || 0) + 1
  })
  const topFoods = Object.entries(foodCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return NextResponse.json({
    success: true,
    type,
    startDate,
    endDate,
    bmr,
    dailyStats,
    summary: {
      totalCalSum,
      avgCal,
      daysWithData,
      totalDays: dailyStats.length,
      overDays,
      maxDay: maxDay ? { date: maxDay.date, totalCal: maxDay.totalCal } : null,
      minDay: minDayWithData ? { date: minDayWithData.date, totalCal: minDayWithData.totalCal } : null,
      topFoods,
    },
  })
}
