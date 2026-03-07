import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const supportRateLimit = new Map<string, number>();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_CATEGORIES = new Set(["general", "bug", "account", "billing", "suggestion"]);

setInterval(() => {
  supportRateLimit.clear();
}, 60 * 60 * 1000);

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("support_inquiries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, inquiries: data });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const ipCount = supportRateLimit.get(ip) || 0;
    if (ipCount >= 5) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }
    supportRateLimit.set(ip, ipCount + 1);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const { name, email, category, title, content } = body;

    if (!name?.trim() || !email?.trim() || !title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json({ error: "올바른 이메일 형식을 입력해주세요." }, { status: 400 });
    }

    if (title.trim().length > 100) {
      return NextResponse.json({ error: "제목은 100자 이내로 입력해주세요." }, { status: 400 });
    }

    if (content.trim().length > 2000) {
      return NextResponse.json({ error: "내용은 2000자 이내로 입력해주세요." }, { status: 400 });
    }

    const normalizedCategory = ALLOWED_CATEGORIES.has(String(category || ""))
      ? String(category)
      : "general";

    const { data, error } = await supabase
      .from("support_inquiries")
      .insert({
        user_id: user?.id || null,
        name: String(name).trim(),
        email: normalizedEmail,
        category: normalizedCategory,
        title: String(title).trim(),
        content: String(content).trim(),
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, inquiry: data });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
