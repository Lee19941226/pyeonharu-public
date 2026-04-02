import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { checkApiRateLimit } from "@/lib/utils/api-rate-limit";
import { parseJsonObjectSafe } from "@/lib/utils/ai-safety";

const supabaseService = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type VerifyType = "hospital" | "doctor";

interface VerificationAiResult {
  found: boolean;
  documentType?: string;
  confidence?: number;
  hospitalName?: string;
  doctorName?: string;
  reason?: string;
}

function normalizeName(s: string): string {
  return s
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/의원|병원|클리닉|센터|원장|전문의/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const aa = normalizeName(a);
  const bb = normalizeName(b);
  if (!aa || !bb) return 0;
  const dist = levenshtein(aa, bb);
  return 1 - dist / Math.max(aa.length, bb.length);
}

function isStrongNameMatch(expectedName: string, extractedName: string): boolean {
  const expected = normalizeName(expectedName);
  const extracted = normalizeName(extractedName);

  if (!expected || !extracted) return false;
  if (extracted.length < 2) return false;
  if (expected === extracted) return true;

  const includeMatch =
    (expected.includes(extracted) || extracted.includes(expected)) &&
    Math.min(expected.length, extracted.length) >= 3;

  if (includeMatch) return true;

  return similarity(expectedName, extractedName) >= 0.8;
}

function parseJsonObject(text: string): VerificationAiResult | null {
  const parsed = parseJsonObjectSafe<Record<string, unknown>>(text);
  if (!parsed) return null;

  return {
    found: Boolean(parsed.found),
    documentType: String(parsed.documentType || "").trim(),
    confidence: Number(parsed.confidence || 0),
    hospitalName: String(parsed.hospitalName || "").trim(),
    doctorName: String(parsed.doctorName || "").trim(),
    reason: String(parsed.reason || "").trim(),
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await req.formData();
  const image = formData.get("image") as File | null;
  const type = formData.get("type") as VerifyType | null;
  const expectedNameRaw = formData.get("expectedName") as string | null;

  const expectedName = String(expectedNameRaw || "").trim();

  if (!image || !type || !expectedName) {
    return NextResponse.json(
      { error: "이미지, 타입, 대상 이름이 필요합니다." },
      { status: 400 },
    );
  }

  if (type !== "hospital" && type !== "doctor") {
    return NextResponse.json({ error: "유효하지 않은 인증 타입입니다." }, { status: 400 });
  }

  if (expectedName.length < 2 || expectedName.length > 60) {
    return NextResponse.json(
      { error: "대상 이름은 2~60자 사이로 입력해주세요." },
      { status: 400 },
    );
  }

  if (image.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "이미지 크기는 3MB 이하만 가능합니다." }, { status: 400 });
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(image.type)) {
    return NextResponse.json({ error: "JPG, PNG, WEBP 형식만 가능합니다." }, { status: 400 });
  }

  const bytes = await image.arrayBuffer();
  const buf = new Uint8Array(bytes);
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isWebp =
    buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45;

  if (!isJpeg && !isPng && !isWebp) {
    return NextResponse.json({ error: "유효하지 않은 이미지 파일입니다." }, { status: 400 });
  }

  const rateResult = await checkApiRateLimit({
    prefix: "review",
    userId: user.id,
    dailyLimitLogin: 5,
    dailyLimitAnon: 0,
  });

  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "일일 인증 한도(5회)를 초과했습니다. 내일 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "AI 서비스를 사용할 수 없습니다." }, { status: 500 });
  }

  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${image.type};base64,${base64}`;

  const prompt =
    type === "hospital"
      ? `이 이미지는 진료비 영수증/계산서입니다. 병원 이름을 추출하세요.
JSON으로만 응답:
{"found":true,"documentType":"receipt","confidence":0~100,"hospitalName":"...","reason":"..."}
찾지 못하면:
{"found":false,"documentType":"unknown","confidence":0~100,"reason":"..."}`
      : `이 이미지는 진료 확인서/진단서입니다. 담당 의사명과 병원명을 추출하세요.
JSON으로만 응답:
{"found":true,"documentType":"certificate","confidence":0~100,"doctorName":"...","hospitalName":"...","reason":"..."}
찾지 못하면:
{"found":false,"documentType":"unknown","confidence":0~100,"reason":"..."}`;

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
        max_tokens: 250,
        temperature: 0,
      }),
    });

    if (!aiRes.ok) {
      console.error("[review-verification] OpenAI error:", aiRes.status);
      return NextResponse.json({ error: "AI 분석에 실패했습니다." }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const parsed = parseJsonObject(content);

    if (!parsed) {
      return NextResponse.json(
        { verified: false, reason: "이미지에서 정보를 추출할 수 없습니다." },
        { status: 200 },
      );
    }

    const confidence = Number(parsed.confidence || 0);
    if (!parsed.found || !Number.isFinite(confidence) || confidence < 70) {
      return NextResponse.json(
        {
          verified: false,
          reason:
            parsed.reason ||
            "문서 인식 신뢰도가 낮아 인증할 수 없습니다. 더 선명한 이미지를 업로드해주세요.",
        },
        { status: 200 },
      );
    }

    const extractedName =
      type === "hospital" ? String(parsed.hospitalName || "") : String(parsed.doctorName || "");

    if (!isStrongNameMatch(expectedName, extractedName)) {
      return NextResponse.json(
        {
          verified: false,
          reason: `문서에서 확인된 ${type === "hospital" ? "병원" : "의사"}명은 "${extractedName || "확인 불가"}"이며, 선택한 "${expectedName}"과 일치하지 않습니다.`,
        },
        { status: 200 },
      );
    }

    const ext = isJpeg ? "jpg" : isPng ? "png" : "webp";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("review-verifications")
      .upload(fileName, Buffer.from(bytes), {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError || !uploadData?.path) {
      console.error("[review-verification] Upload error:", uploadError);
      return NextResponse.json({ error: "이미지 저장에 실패했습니다." }, { status: 500 });
    }

    // 민감 이미지 노출 방지를 위해 Public URL 대신 짧은 만료 서명 URL 반환
    const { data: signedData, error: signedError } = await supabaseService.storage
      .from("review-verifications")
      .createSignedUrl(uploadData.path, 60 * 10);

    if (signedError || !signedData?.signedUrl) {
      console.error("[review-verification] Signed URL error:", signedError);
      return NextResponse.json({ error: "이미지 URL 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      verified: true,
      imageUrl: signedData.signedUrl,
      extractedName,
      confidence,
    });
  } catch (err) {
    console.error("[review-verification] Error:", err);
    return NextResponse.json({ error: "인증 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

