import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: 가족 목록 + 알레르기
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { data: members, error } = await supabase
    .from("family_members")
    .select(
      `
      id, name, relation, avatar_emoji, created_at,
      family_member_allergies (
        allergen_code, allergen_name, severity
      )
    `,
    )
    .eq("owner_id", user.id)
    .order("created_at");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, members: members || [] });
}

// POST: 구성원 추가
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { name, relation, avatar_emoji, allergies } = await req.json();
  if (!name?.trim())
    return NextResponse.json({ error: "이름 필요" }, { status: 400 });

  // 최대 10명 제한
  const { count } = await supabase
    .from("family_members")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count || 0) >= 10) {
    return NextResponse.json(
      { error: "최대 10명까지 등록 가능합니다" },
      { status: 400 },
    );
  }

  const { data: member, error } = await supabase
    .from("family_members")
    .insert({ owner_id: user.id, name: name.trim(), relation, avatar_emoji })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // 알레르기 저장
  if (allergies?.length > 0) {
    for (const a of allergies) {
      if (!a.code?.trim() || !a.name?.trim()) {
        return NextResponse.json(
          { error: "알레르기 코드와 이름은 필수입니다." },
          { status: 400 },
        );
      }
      if (a.code.trim().length > 50 || a.name.trim().length > 50) {
        return NextResponse.json(
          { error: "알레르기 코드와 이름은 50자 이하여야 합니다." },
          { status: 400 },
        );
      }
    }
    await supabase.from("family_member_allergies").insert(
      allergies.map((a: any) => ({
        member_id: member.id,
        allergen_code: a.code.trim(),
        allergen_name: a.name.trim(),
        severity: a.severity || "medium",
      })),
    );
  }

  return NextResponse.json({ success: true, member });
}

// PATCH: 구성원 수정
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { id, name, relation, avatar_emoji, allergies } = await req.json();

  // 본인 소유 확인
  const { data: member } = await supabase
    .from("family_members")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!member)
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  await supabase
    .from("family_members")
    .update({
      name: name.trim(),
      relation,
      avatar_emoji,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // 알레르기 전체 교체
  if (allergies?.length > 0) {
    for (const a of allergies) {
      if (!a.code?.trim() || !a.name?.trim()) {
        return NextResponse.json(
          { error: "알레르기 코드와 이름은 필수입니다." },
          { status: 400 },
        );
      }
      if (a.code.trim().length > 50 || a.name.trim().length > 50) {
        return NextResponse.json(
          { error: "알레르기 코드와 이름은 50자 이하여야 합니다." },
          { status: 400 },
        );
      }
    }
  }
  await supabase.from("family_member_allergies").delete().eq("member_id", id);
  if (allergies?.length > 0) {
    await supabase.from("family_member_allergies").insert(
      allergies.map((a: any) => ({
        member_id: id,
        allergen_code: a.code.trim(),
        allergen_name: a.name.trim(),
        severity: a.severity || "medium",
      })),
    );
  }

  return NextResponse.json({ success: true });
}

// DELETE: 구성원 삭제
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { id } = await req.json();

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
