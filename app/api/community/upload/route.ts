import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── 매직 넘버로 실제 이미지 형식 검출 ───
function detectImageMime(buf: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // GIF: 47 49 46 38 (GIF8)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  // WebP: RIFF....WEBP
  if (buf.length > 11 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return null;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

// POST /api/community/upload — 이미지 업로드
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

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json(
      { error: "업로드할 파일이 없습니다." },
      { status: 400 },
    );
  }

  if (files.length > 5) {
    return NextResponse.json(
      { error: "이미지는 최대 5장까지 업로드 가능합니다." },
      { status: 400 },
    );
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "이미지 크기는 5MB 이하만 가능합니다." },
        { status: 400 },
      );
    }

    // ─── MIME 타입 + 매직 넘버 검증 ───
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다." },
        { status: 400 },
      );
    }

    const fileBytes = await file.arrayBuffer();
    const buf = new Uint8Array(fileBytes);
    const detectedMime = detectImageMime(buf);
    // image/jpg는 비표준 — image/jpeg로 정규화하여 비교
    const normalizedType = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!detectedMime || detectedMime !== normalizedType) {
      return NextResponse.json(
        { error: "파일 형식이 유효하지 않습니다." },
        { status: 400 },
      );
    }

    const ext = MIME_TO_EXT[detectedMime] ?? "jpg";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from("community-images")
      .upload(fileName, Buffer.from(fileBytes), {
        contentType: normalizedType,
        upsert: false,
      });

    if (error) {
      console.error("Image upload error:", error);
      return NextResponse.json(
        { error: "이미지 업로드에 실패했습니다." },
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage
      .from("community-images")
      .getPublicUrl(data.path);

    uploadedUrls.push(urlData.publicUrl);
  }

  return NextResponse.json({ success: true, urls: uploadedUrls });
}
