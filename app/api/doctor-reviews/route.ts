import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/utils/action-log";
import { stripHtml, maskProfanity } from "@/lib/utils/profanity-filter";

// =============================================
// GET /api/doctor-reviews
// 용도 1) 의사 탭: 검색 — ?q=병명/의사명 &department=진료과
// 용도 2) 병원 상세: 해당 병원 의사 리뷰 — ?hospital=병원명
// =============================================
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q")?.trim() || "";
  const department = searchParams.get("department")?.trim() || "";
  const hospital = searchParams.get("hospital")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 병원 상세용: 특정 병원의 의사 리뷰 전체 ──
  if (hospital) {
    const { data: reviews, error } = await supabase
      .from("doctor_reviews")
      .select("*")
      .eq("hospital_name", hospital)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[doctor-reviews GET hospital]", error.message);
      return NextResponse.json(
        { error: "서버 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      reviews: (reviews || []).map((r) => ({
        id: r.id,
        doctorName: r.doctor_name,
        department: r.department,
        diseaseName: r.disease_name,
        rating: r.rating,
        content: r.content,
        isVerified: r.is_verified || false,
        isMine: user ? r.user_id === user.id : false,
        createdAt: r.created_at,
      })),
    });
  }

  // ── 의사 탭용: 의사별 집계 검색 ──
  let query = supabase
    .from("doctor_reviews")
    .select("*");

  if (department) {
    query = query.eq("department", department);
  }

  if (q) {
    query = query.or(
      `doctor_name.ilike.%${q}%,disease_name.ilike.%${q}%,hospital_name.ilike.%${q}%,department.ilike.%${q}%`,
    );
  }

  const { data: allReviews, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("[doctor-reviews GET search]", error.message);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  // 의사별 집계 (doctor_name + hospital_name 기준 그룹핑) + 질병별 평점
  const grouped: Record<
    string,
    {
      doctorName: string;
      hospitalName: string;
      department: string;
      ratings: number[];
      diseaseRatings: Record<string, number[]>;
      latestDate: string;
    }
  > = {};

  for (const r of allReviews || []) {
    const key = `${r.doctor_name}::${r.hospital_name}`;
    if (!grouped[key]) {
      grouped[key] = {
        doctorName: r.doctor_name,
        hospitalName: r.hospital_name,
        department: r.department,
        ratings: [],
        diseaseRatings: {},
        latestDate: r.created_at,
      };
    }
    grouped[key].ratings.push(r.rating);
    if (r.disease_name) {
      if (!grouped[key].diseaseRatings[r.disease_name]) {
        grouped[key].diseaseRatings[r.disease_name] = [];
      }
      grouped[key].diseaseRatings[r.disease_name].push(r.rating);
    }
    if (r.created_at > grouped[key].latestDate) {
      grouped[key].latestDate = r.created_at;
    }
  }

  const doctors = Object.values(grouped)
    .map((g) => {
      const sum = g.ratings.reduce((a, b) => a + b, 0);
      const avg = Math.round((sum / g.ratings.length) * 10) / 10;
      const diseaseStats = Object.entries(g.diseaseRatings)
        .map(([name, ratings]) => ({
          name,
          avgRating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
          count: ratings.length,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      return {
        doctorName: g.doctorName,
        hospitalName: g.hospitalName,
        department: g.department,
        avgRating: avg,
        reviewCount: g.ratings.length,
        diseases: diseaseStats,
        latestDate: g.latestDate,
      };
    })
    // 평균 별점 내림차순, 리뷰 수 내림차순
    .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);

  const paged = doctors.slice(offset, offset + limit);

  return NextResponse.json({
    doctors: paged,
    total: doctors.length,
    page,
    limit,
  });
}

// =============================================
// POST /api/doctor-reviews — 의사 리뷰 작성 (병원 상세에서 호출)
// =============================================
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { hospitalName, hospitalAddress, doctorName, department, diseaseName, rating, content, verificationImageUrl } =
    body;

  if (!hospitalName?.trim()) {
    return NextResponse.json(
      { error: "병원 정보가 필요합니다." },
      { status: 400 },
    );
  }
  if (!doctorName?.trim()) {
    return NextResponse.json(
      { error: "의사명을 입력해주세요." },
      { status: 400 },
    );
  }
  if (!department?.trim()) {
    return NextResponse.json(
      { error: "진료과를 입력해주세요." },
      { status: 400 },
    );
  }
  if (!diseaseName?.trim()) {
    return NextResponse.json(
      { error: "병명을 입력해주세요." },
      { status: 400 },
    );
  }
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "별점(1~5)을 선택해주세요." },
      { status: 400 },
    );
  }

  const cleanContent = content
    ? maskProfanity(stripHtml(content)).slice(0, 500)
    : "";

  // 같은 날짜 + 같은 병원 + 같은 의사 → upsert (하루 1건)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD

  const { data, error } = await supabase
    .from("doctor_reviews")
    .upsert(
      {
        user_id: user.id,
        hospital_name: stripHtml(hospitalName).slice(0, 100),
        hospital_address: stripHtml(hospitalAddress || "").slice(0, 200),
        doctor_name: stripHtml(doctorName).slice(0, 50),
        department: stripHtml(department).slice(0, 50),
        disease_name: stripHtml(diseaseName).slice(0, 100),
        rating: Math.round(rating),
        content: cleanContent || null,
        is_verified: !!verificationImageUrl,
        verification_image_url: verificationImageUrl || null,
        review_date: today,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,hospital_name,doctor_name,review_date" },
    )
    .select("id, rating, doctor_name, disease_name")
    .single();

  if (error) {
    console.error("[doctor-reviews POST]", error.message);
    return NextResponse.json(
      { error: "리뷰 저장에 실패했습니다." },
      { status: 500 },
    );
  }

  logAction({
    userId: user.id,
    actionType: "doctor_review_create",
    metadata: { reviewId: data.id, doctorName: data.doctor_name },
  });

  return NextResponse.json({ success: true, review: data });
}

// =============================================
// DELETE /api/doctor-reviews?id=xxx — 본인 리뷰 삭제
// =============================================
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const reviewId = searchParams.get("id");

  if (!reviewId) {
    return NextResponse.json(
      { error: "리뷰 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("doctor_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[doctor-reviews DELETE]", error.message);
    return NextResponse.json(
      { error: "삭제에 실패했습니다." },
      { status: 500 },
    );
  }

  logAction({
    userId: user.id,
    actionType: "doctor_review_delete",
    metadata: { reviewId },
  });

  return NextResponse.json({ success: true });
}
