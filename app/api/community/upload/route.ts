import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // 이미지 타입 확인
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다." },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from("community-images")
      .upload(fileName, file, {
        contentType: file.type,
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
