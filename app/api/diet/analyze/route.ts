import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── 매직 넘버로 실제 이미지 형식 검출 ───
function detectImageMime(buf: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // WebP: RIFF....WEBP
  if (buf.length > 11 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  // HEIC/HEIF: ISO Base Media File (ftyp box at offset 4)
  if (buf.length > 11 &&
      buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return "image/heic";
  return null;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

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

    // ─── 일일 분석 횟수 제한 (20회) ───
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from("diet_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString());

    if ((todayCount || 0) >= 20) {
      return NextResponse.json(
        { error: "오늘 식단 분석 한도(20회)를 초과했습니다." },
        { status: 429 },
      );
    }
    const formData = await req.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json(
        { error: "이미지가 필요합니다." },
        { status: 400 },
      );
    }

    // ─── 파일 크기 제한 (7MB) ───
    const MAX_FILE_SIZE = 7 * 1024 * 1024; // 7MB
    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "이미지 크기가 너무 큽니다. 7MB 이하의 이미지를 사용해주세요." },
        { status: 413 },
      );
    }

    // ─── MIME 타입 + 매직 넘버 검증 ───
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "지원하지 않는 이미지 형식입니다. (JPG, PNG, WebP만 가능)" },
        { status: 400 },
      );
    }

    const bytes = await image.arrayBuffer();
    const buf = new Uint8Array(bytes);
    const detectedMime = detectImageMime(buf);
    // HEIC와 HEIF는 동일한 ftyp 컨테이너를 사용하므로 함께 허용
    const isHeicFamily =
      detectedMime === "image/heic" &&
      (image.type === "image/heic" || image.type === "image/heif");
    if (!detectedMime || (detectedMime !== image.type && !isHeicFamily)) {
      return NextResponse.json(
        { error: "파일 형식이 유효하지 않습니다." },
        { status: 400 },
      );
    }

    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = image.type;

    // ─── 이미지를 Supabase Storage에 업로드 ───
    let imageUrl: string | null = null;
    try {
      const ext = MIME_TO_EXT[detectedMime] ?? "jpg";
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("diet-images")
        .upload(fileName, Buffer.from(bytes), {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[Diet Analyze] 이미지 업로드 실패:", uploadError);
        // 업로드 실패해도 분석은 계속 진행
      } else if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("diet-images")
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }
    } catch (uploadErr) {
      console.error("[Diet Analyze] 이미지 업로드 오류:", uploadErr);
      // 업로드 실패해도 분석은 계속 진행
    }

    // GPT-4o Vision으로 분석
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 음식 사진을 분석해주세요. 반드시 아래 JSON 형식으로만 응답하세요.

{
  "food_name": "음식 이름 (한국어)",
  "estimated_cal": 추정 칼로리 (정수, kcal),
  "confidence": 신뢰도 (0.0~1.0),
  "emoji": "음식을 나타내는 이모지 1개"
}

규칙:
- 여러 음식이 보이면 전체를 하나의 식사로 합산
- 칼로리는 통상적인 1인분 기준으로 추정
- confidence: 명확하면 0.8+, 애매하면 0.5~0.7, 잘 안보이면 0.3 이하
- 음식이 아닌 사진이면 estimated_cal을 0으로`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content || "";

    let result;
    try {
      const cleaned = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI 분석 결과를 처리할 수 없습니다." },
        { status: 500 },
      );
    }

    if (!result.food_name || result.estimated_cal === 0) {
      return NextResponse.json(
        {
          error: "음식을 인식할 수 없습니다. 다시 촬영해주세요.",
        },
        { status: 400 },
      );
    }

    // DB에 저장 (image_url 포함)
    const { data: entry, error: insertError } = await supabase
      .from("diet_entries")
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        food_name: result.food_name,
        estimated_cal: result.estimated_cal,
        source: "ai",
        ai_confidence: result.confidence,
        emoji: result.emoji || "🍽️",
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "저장에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        food_name: result.food_name,
        estimated_cal: result.estimated_cal,
        confidence: result.confidence,
        emoji: result.emoji,
        source: "ai",
        image_url: imageUrl,
        recorded_at: entry.recorded_at,
      },
      disclaimer:
        "AI 추정 칼로리는 통상적인 값을 추측한 데이터이며, 실제와 차이가 있을 수 있습니다.",
    });
  } catch (error) {
    console.error("[Diet Analyze] Error:", error);
    return NextResponse.json(
      { error: "AI 분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
