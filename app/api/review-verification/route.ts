import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/review-verification
// 진료비 영수증 또는 진료 확인서 이미지를 AI로 분석하여
// 병원명/의사명 매칭 여부를 확인하고, 이미지를 저장한다.
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
  const image = formData.get("image") as File | null;
  const type = formData.get("type") as string; // "hospital" | "doctor"
  const expectedName = formData.get("expectedName") as string; // 병원명 또는 의사명

  if (!image || !type || !expectedName) {
    return NextResponse.json(
      { error: "이미지, 타입, 대상 이름이 필요합니다." },
      { status: 400 },
    );
  }

  if (image.size > 3 * 1024 * 1024) {
    return NextResponse.json(
      { error: "이미지 크기는 3MB 이하만 가능합니다." },
      { status: 400 },
    );
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(image.type)) {
    return NextResponse.json(
      { error: "JPG, PNG, WEBP 형식만 가능합니다." },
      { status: 400 },
    );
  }

  // 매직 넘버 검증
  const bytes = await image.arrayBuffer();
  const buf = new Uint8Array(bytes);
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isWebp =
    buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45;

  if (!isJpeg && !isPng && !isWebp) {
    return NextResponse.json(
      { error: "유효하지 않은 이미지 파일입니다." },
      { status: 400 },
    );
  }

  // 1. OpenAI Vision API로 이미지 분석
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      { error: "AI 서비스를 사용할 수 없습니다." },
      { status: 500 },
    );
  }

  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${image.type};base64,${base64}`;

  const prompt =
    type === "hospital"
      ? `이 이미지는 진료비 영수증 또는 진료비 계산서입니다.
이미지에서 병원 이름(의료기관명)을 정확히 추출해주세요.
다음 JSON 형식으로만 응답하세요:
{"found": true, "hospitalName": "추출된 병원명"}
병원명을 찾을 수 없거나 진료비 영수증이 아닌 경우:
{"found": false, "reason": "사유"}`
      : `이 이미지는 진료 확인서 또는 진단서입니다.
이미지에서 담당 의사 이름과 병원 이름을 정확히 추출해주세요.
다음 JSON 형식으로만 응답하세요:
{"found": true, "doctorName": "추출된 의사명", "hospitalName": "추출된 병원명"}
의사명을 찾을 수 없거나 진료 확인서가 아닌 경우:
{"found": false, "reason": "사유"}`;

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0,
      }),
    });

    if (!aiRes.ok) {
      console.error("[review-verification] OpenAI error:", aiRes.status);
      return NextResponse.json(
        { error: "AI 분석에 실패했습니다." },
        { status: 500 },
      );
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        verified: false,
        reason: "이미지에서 정보를 추출할 수 없습니다.",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.found) {
      return NextResponse.json({
        verified: false,
        reason:
          parsed.reason ||
          (type === "hospital"
            ? "진료비 영수증이 아니거나 병원명을 확인할 수 없습니다."
            : "진료 확인서가 아니거나 의사명을 확인할 수 없습니다."),
      });
    }

    // 이름 매칭 확인 (부분 매칭 허용)
    const normalize = (s: string) =>
      s.replace(/\s+/g, "").toLowerCase().replace(/의원|병원|클리닉|센터/g, "");

    let matched = false;
    if (type === "hospital") {
      const extracted = normalize(parsed.hospitalName || "");
      const expected = normalize(expectedName);
      matched =
        extracted.includes(expected) ||
        expected.includes(extracted) ||
        extracted === expected;
    } else {
      const extractedDoctor = normalize(parsed.doctorName || "");
      const expectedDoctor = normalize(expectedName);
      matched =
        extractedDoctor.includes(expectedDoctor) ||
        expectedDoctor.includes(extractedDoctor) ||
        extractedDoctor === expectedDoctor;
    }

    if (!matched) {
      const extractedLabel =
        type === "hospital" ? parsed.hospitalName : parsed.doctorName;
      return NextResponse.json({
        verified: false,
        reason: `문서에서 확인된 ${type === "hospital" ? "병원" : "의사"}명은 "${extractedLabel}"이며, 선택한 "${expectedName}"과 일치하지 않습니다.`,
      });
    }

    // 2. 이미지 저장
    const ext = isJpeg ? "jpg" : isPng ? "png" : "webp";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("review-verifications")
      .upload(fileName, Buffer.from(bytes), {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[review-verification] Upload error:", uploadError);
      return NextResponse.json(
        { error: "이미지 저장에 실패했습니다." },
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage
      .from("review-verifications")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      verified: true,
      imageUrl: urlData.publicUrl,
      extractedName:
        type === "hospital" ? parsed.hospitalName : parsed.doctorName,
    });
  } catch (err) {
    console.error("[review-verification] Error:", err);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
