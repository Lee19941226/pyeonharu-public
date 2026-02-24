import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/diet/upload-image — 식단 이미지 업로드 (직접입력/편집용)
export async function POST(req: NextRequest) {
  try {
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
    const image = formData.get("image") as File | null;
    const entryId = formData.get("entryId") as string | null;

    if (!image) {
      return NextResponse.json(
        { error: "이미지가 필요합니다." },
        { status: 400 },
      );
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "이미지 크기는 5MB 이하만 가능합니다." },
        { status: 400 },
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드 가능합니다." },
        { status: 400 },
      );
    }

    const bytes = await image.arrayBuffer();
    const ext = image.name?.split(".").pop() || "jpg";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("diet-images")
      .upload(fileName, Buffer.from(bytes), {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Diet Upload] 이미지 업로드 실패:", uploadError);
      return NextResponse.json(
        { error: "이미지 업로드에 실패했습니다." },
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage
      .from("diet-images")
      .getPublicUrl(uploadData.path);

    const imageUrl = urlData.publicUrl;

    // 기존 엔트리에 사진 추가/변경인 경우 DB 업데이트
    if (entryId) {
      const { error: updateError } = await supabase
        .from("diet_entries")
        .update({ image_url: imageUrl })
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("[Diet Upload] DB 업데이트 실패:", updateError);
        return NextResponse.json(
          { error: "이미지 정보 저장에 실패했습니다." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
    });
  } catch (error: any) {
    console.error("[Diet Upload] Error:", error);
    return NextResponse.json(
      { error: "이미지 업로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
