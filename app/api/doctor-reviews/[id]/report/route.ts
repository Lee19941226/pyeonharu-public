import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/utils/action-log";

const VALID_REASONS = [
  "스팸/광고",
  "욕설/비방",
  "허위정보",
  "개인정보 노출",
  "기타",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reviewId } = await params;
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
  const { reason } = body;

  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: "올바른 신고 사유를 선택해주세요." },
      { status: 400 },
    );
  }

  // 본인 리뷰 신고 방지
  const { data: review } = await supabase
    .from("doctor_reviews")
    .select("user_id")
    .eq("id", reviewId)
    .single();

  if (review?.user_id === user.id) {
    return NextResponse.json(
      { error: "본인 리뷰는 신고할 수 없습니다." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("doctor_review_reports").insert({
    review_id: reviewId,
    reporter_id: user.id,
    reason,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 신고한 리뷰입니다." },
        { status: 409 },
      );
    }
    console.error("[doctor-review report]", error.message);
    return NextResponse.json(
      { error: "신고 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  logAction({
    userId: user.id,
    actionType: "doctor_review_report",
    metadata: { reviewId },
  });

  return NextResponse.json({ success: true });
}
