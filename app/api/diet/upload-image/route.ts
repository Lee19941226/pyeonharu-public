import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  ) return "image/webp";
  return null;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const entryId = formData.get("entryId") as string | null;

    if (!image) {
      return NextResponse.json({ error: "이미지가 필요합니다." }, { status: 400 });
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "이미지 크기는 5MB 이하여야 합니다." }, { status: 400 });
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json({ error: "JPG, PNG, WEBP 형식만 업로드 가능합니다." }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buf = new Uint8Array(bytes);
    const detectedMime = detectImageMime(buf);
    const normalizedType = image.type === "image/jpg" ? "image/jpeg" : image.type;

    if (!detectedMime || detectedMime !== normalizedType) {
      return NextResponse.json({ error: "파일 형식이 유효하지 않습니다." }, { status: 400 });
    }

    const ext = MIME_TO_EXT[detectedMime] ?? "jpg";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("diet-images")
      .upload(fileName, Buffer.from(bytes), {
        contentType: detectedMime,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Diet Upload] 이미지 업로드 실패:", uploadError);
      return NextResponse.json({ error: "이미지 업로드에 실패했습니다." }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("diet-images")
      .getPublicUrl(uploadData.path);

    const imageUrl = urlData.publicUrl;

    if (entryId) {
      const { error: updateError } = await supabase
        .from("diet_entries")
        .update({ image_url: imageUrl })
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("[Diet Upload] DB 업데이트 실패:", updateError);
        return NextResponse.json({ error: "이미지 정보 저장에 실패했습니다." }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, image_url: imageUrl });
  } catch (error: any) {
    console.error("[Diet Upload] Error:", error);
    return NextResponse.json({ error: "이미지 업로드 중 오류가 발생했습니다." }, { status: 500 });
  }
}
