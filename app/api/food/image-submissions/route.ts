import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function detectImageMime(buf: Uint8Array): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf.length > 11 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";
  return null;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST /api/food/image-submissions
// 인증 사용자 제품 이미지 제보 (pending)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const form = await req.formData();
  const foodCode = String(form.get("foodCode") || "").trim();
  const foodName = String(form.get("foodName") || "").trim();
  const file = form.get("image") as File | null;

  if (!foodCode || !foodName || !file) {
    return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "이미지 크기는 5MB 이하만 가능합니다." }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WEBP 형식만 업로드 가능합니다." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buf = new Uint8Array(bytes);
  const detected = detectImageMime(buf);
  const normalized = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!detected || detected !== normalized) {
    return NextResponse.json({ error: "파일 형식이 유효하지 않습니다." }, { status: 400 });
  }

  const ext = MIME_TO_EXT[detected] ?? "jpg";
  const objectPath = `${foodCode}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = getAdminClient();
  const uploadRes = await admin.storage
    .from("food-product-images")
    .upload(objectPath, Buffer.from(bytes), {
      contentType: normalized,
      upsert: false,
    });

  if (uploadRes.error) {
    return NextResponse.json({ error: "이미지 업로드에 실패했습니다." }, { status: 500 });
  }

  const { data: row, error: insertErr } = await admin
    .from("food_product_images")
    .insert({
      food_code: foodCode,
      food_name: foodName,
      storage_path: objectPath,
      mime_type: normalized,
      file_size: file.size,
      source_type: "user_upload",
      status: "pending",
      submitted_by: user.id,
    })
    .select("id, status, created_at")
    .single();

  if (insertErr) {
    await admin.storage.from("food-product-images").remove([objectPath]);
    return NextResponse.json({ error: "이미지 제보 저장에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    submission: row,
    message: "이미지 제보가 접수되었습니다. 관리자 검토 후 반영됩니다.",
  });
}
