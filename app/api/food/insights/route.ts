import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  try {
    // ── 전체 히스토리 조회 ──
    const { data: history } = await supabase
      .from("food_check_history")
      .select(
        "barcode, product_name, manufacturer, is_safe, detected_allergens, checked_at",
      )
      .eq("user_id", user.id)
      .order("checked_at", { ascending: false })
      .limit(500);

    if (!history || history.length === 0) {
      return NextResponse.json({ success: true, empty: true });
    }

    // ── 1. 기본 통계 ──
    const total = history.length;
    const safeCount = history.filter((h) => h.is_safe).length;
    const dangerCount = total - safeCount;
    const safeRate = Math.round((safeCount / total) * 100);

    // ── 2. 알레르기 빈도 TOP 5 ──
    const allergenFreq: Record<string, number> = {};
    history.forEach((h) => {
      (h.detected_allergens || []).forEach((a: string) => {
        allergenFreq[a] = (allergenFreq[a] || 0) + 1;
      });
    });
    const topAllergens = Object.entries(allergenFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // ── 3. 최근 30일 일별 스캔 추이 ──
    const dailyMap: Record<string, { safe: number; danger: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { safe: 0, danger: 0 };
    }
    history.forEach((h) => {
      const date = h.checked_at?.slice(0, 10);
      if (date && dailyMap[date] !== undefined) {
        if (h.is_safe) dailyMap[date].safe++;
        else dailyMap[date].danger++;
      }
    });
    const dailyTrend = Object.entries(dailyMap).map(([date, v]) => ({
      date: date.slice(5), // MM-DD
      safe: v.safe,
      danger: v.danger,
      total: v.safe + v.danger,
    }));

    // ── 4. 요일별 스캔 패턴 ──
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayCount = Array(7).fill(0);
    history.forEach((h) => {
      const day = new Date(h.checked_at).getDay();
      dayCount[day]++;
    });
    const weekdayPattern = dayNames.map((name, i) => ({
      day: name,
      count: dayCount[i],
    }));

    // ── 5. 가장 많이 스캔한 제품 TOP 5 ──
    const productFreq: Record<
      string,
      { count: number; isSafe: boolean; manufacturer: string; barcode: string }
    > = {};
    history.forEach((h) => {
      if (!productFreq[h.product_name]) {
        productFreq[h.product_name] = {
          count: 0,
          isSafe: h.is_safe,
          manufacturer: h.manufacturer || "",
          barcode: h.barcode,
        };
      }
      productFreq[h.product_name].count++;
    });
    const topProducts = Object.entries(productFreq)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, v]) => ({ name, ...v }));

    // ── 6. 위험 제품 최근 5개 ──
    const dangerHistory = history
      .filter((h) => !h.is_safe)
      .slice(0, 5)
      .map((h) => ({
        productName: h.product_name,
        allergens: h.detected_allergens || [],
        checkedAt: h.checked_at,
        barcode: h.barcode,
      }));

    // ── 7. 이번 달 vs 지난 달 비교 ──
    const thisMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const lastMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).toISOString();
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
    ).toISOString();

    const thisMonth = history.filter(
      (h) => h.checked_at >= thisMonthStart,
    ).length;
    const lastMonth = history.filter(
      (h) => h.checked_at >= lastMonthStart && h.checked_at <= lastMonthEnd,
    ).length;
    const monthChange =
      lastMonth > 0
        ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      stats: {
        total,
        safeCount,
        dangerCount,
        safeRate,
        thisMonth,
        lastMonth,
        monthChange,
      },
      topAllergens,
      dailyTrend,
      weekdayPattern,
      topProducts,
      dangerHistory,
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
