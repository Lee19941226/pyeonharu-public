import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/utils/action-log";

// PUT /api/profile — 프로필 닉네임 업데이트 (auth + profiles 동기화)
export async function PUT(req: NextRequest) {
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
  const { name, showAllergyPublic } = body;

  // show_allergy_public만 업데이트하는 경우
  if (showAllergyPublic !== undefined && !name) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ show_allergy_public: !!showAllergyPublic })
      .eq("id", user.id);

    if (profileError) {
      console.error("profiles 업데이트 에러:", profileError);
      return NextResponse.json({ error: "설정 저장 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true, showAllergyPublic: !!showAllergyPublic });
  }

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "이름을 입력해주세요." },
      { status: 400 },
    );
  }
  if (name.trim().length > 30) {
    return NextResponse.json(
      { error: "이름은 30자 이하로 입력해주세요." },
      { status: 400 },
    );
  }
  const trimmedName = name.trim();

  // 1. auth.users user_metadata 업데이트
  const { error: authError } = await supabase.auth.updateUser({
    data: { name: trimmedName },
  });

  if (authError) {
    console.error("auth updateUser 에러:", authError);
    return NextResponse.json(
      { error: "프로필 업데이트 실패" },
      { status: 500 },
    );
  }

  // 2. profiles.nickname 동기화
  const updateData: Record<string, any> = {
    id: user.id,
    nickname: trimmedName,
    updated_at: new Date().toISOString(),
  };
  if (showAllergyPublic !== undefined) {
    updateData.show_allergy_public = !!showAllergyPublic;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    updateData,
    { onConflict: "id" },
  );

  if (profileError) {
    console.error("profiles 업데이트 에러:", profileError);
    return NextResponse.json(
      { error: "프로필 업데이트 실패" },
      { status: 500 },
    );
  }

  logAction({
    userId: user.id,
    actionType: "profile_update",
    metadata: { nickname: trimmedName },
  });

  return NextResponse.json({ success: true, name: trimmedName });
}

// GET /api/profile — 프로필 조회
export async function GET() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url, show_allergy_public")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    name: profile?.nickname || user.user_metadata?.name || "사용자",
    email: user.email || "",
    avatarUrl: profile?.avatar_url || null,
    showAllergyPublic: profile?.show_allergy_public ?? false,
  });
}
