import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 문의 목록 조회 (본인 것만)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("support_inquiries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, inquiries: data });
  } catch (error: any) {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// 문의 등록
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const { name, email, category, title, content } = body;

    if (!name?.trim() || !email?.trim() || !title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("support_inquiries")
      .insert({
        user_id: user?.id || null,
        name: name.trim(),
        email: email.trim(),
        category: category || "general",
        title: title.trim(),
        content: content.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, inquiry: data });
  } catch (error: any) {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
