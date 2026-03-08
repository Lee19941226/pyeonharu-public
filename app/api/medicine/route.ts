import medicineImageOverridesJson from "@/data/medicine-image-overrides.json";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface MedicineItem {
  entpName: string;
  itemName: string;
  itemSeq: string;
  efcyQesitm: string;
  useMethodQesitm: string;
  atpnWarnQesitm: string;
  atpnQesitm: string;
  intrcQesitm: string;
  seQesitm: string;
  depositMethodQesitm: string;
  openDe: string;
  updateDe: string;
  itemImage: string;
}

interface MedicineImageOverrides {
  byItemSeq?: Record<string, string>;
  byItemName?: Record<string, string>;
}

const fallbackMedicineImageOverrides =
  medicineImageOverridesJson as MedicineImageOverrides;
let activeMedicineImageOverrides: MedicineImageOverrides =
  fallbackMedicineImageOverrides;
let lastOverridesLoadedAt = 0;
const OVERRIDES_CACHE_MS = 5 * 60 * 1000;

function normalizeMedicineName(name: string | null | undefined): string {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
}

function normalizeMedicineImageUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";
  const trimmed = String(rawUrl).trim().replace(/&amp;/g, "&");
  if (!trimmed) return "";

  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return "";
  }

  return "";
}

function getMedicineImageOverride(
  itemSeq: string | null | undefined,
  itemName: string | null | undefined,
): string {
  const bySeq = itemSeq ? activeMedicineImageOverrides.byItemSeq?.[itemSeq] : "";
  if (bySeq) return normalizeMedicineImageUrl(bySeq);

  const targetName = normalizeMedicineName(itemName);
  if (!targetName) return "";

  const byNameEntries = Object.entries(activeMedicineImageOverrides.byItemName || {});
  for (const [nameKey, imageUrl] of byNameEntries) {
    if (normalizeMedicineName(nameKey) === targetName) {
      return normalizeMedicineImageUrl(imageUrl);
    }
  }

  return "";
}

async function loadMedicineImageOverridesFromDb(): Promise<void> {
  const now = Date.now();
  if (now - lastOverridesLoadedAt < OVERRIDES_CACHE_MS) return;

  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      activeMedicineImageOverrides = fallbackMedicineImageOverrides;
      lastOverridesLoadedAt = now;
      return;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "medicine_image_overrides")
      .maybeSingle();

    if (error || !data?.value) {
      activeMedicineImageOverrides = fallbackMedicineImageOverrides;
      lastOverridesLoadedAt = now;
      return;
    }

    const dbValue = data.value as MedicineImageOverrides;
    activeMedicineImageOverrides = {
      byItemSeq: dbValue.byItemSeq || {},
      byItemName: dbValue.byItemName || {},
    };
    lastOverridesLoadedAt = now;
  } catch {
    activeMedicineImageOverrides = fallbackMedicineImageOverrides;
    lastOverridesLoadedAt = now;
  }
}

export async function GET(req: NextRequest) {
  try {
    await loadMedicineImageOverridesFromDb();

    const { searchParams } = new URL(req.url);
    const itemName = searchParams.get("itemName") || "";
    const pageNo = searchParams.get("pageNo") || "1";
    const numOfRows = searchParams.get("numOfRows") || "10";

    if (!itemName.trim()) {
      return NextResponse.json(
        { error: "약 이름을 입력해주세요." },
        { status: 400 },
      );
    }

    const serviceKey =
      process.env.MEDICINE_API_KEY || process.env.DATA_GO_KR_API_KEY;

    if (!serviceKey) {
      console.error("MEDICINE_API_KEY 환경변수가 설정되지 않음");
      return NextResponse.json(
        { error: "API 키가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const url = `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList?serviceKey=${serviceKey}&itemName=${encodeURIComponent(itemName)}&pageNo=${pageNo}&numOfRows=${numOfRows}&type=json`;

    console.log(
      "[Medicine API] 요청 URL:",
      url.replace(serviceKey, "KEY_HIDDEN"),
    );

    const response = await fetch(url);
    const text = await response.text();

    console.log("[Medicine API] 응답 상태:", response.status);

    if (!response.ok) {
      console.error(
        "Medicine API error:",
        response.status,
        text.substring(0, 500),
      );
      return NextResponse.json(
        { error: "의약품 정보를 가져오는 중 오류가 발생했습니다." },
        { status: 502 },
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("JSON 파싱 실패:", text.substring(0, 500));
      return NextResponse.json(
        { error: "API 응답 파싱 실패" },
        { status: 502 },
      );
    }

    const body = data.body;
    if (!body) {
      return NextResponse.json({
        success: true,
        totalCount: 0,
        items: [],
        pageNo: parseInt(pageNo),
        numOfRows: parseInt(numOfRows),
      });
    }

    const items: MedicineItem[] = body.items || [];
    const totalCount = body.totalCount || 0;

    const medicines = items.map((item: MedicineItem) => ({
      id: item.itemSeq,
      name: item.itemName || "",
      company: item.entpName || "",
      efficacy: cleanHtml(item.efcyQesitm) || "",
      usage: cleanHtml(item.useMethodQesitm) || "",
      warningPrecaution: cleanHtml(item.atpnWarnQesitm) || "",
      precaution: cleanHtml(item.atpnQesitm) || "",
      interaction: cleanHtml(item.intrcQesitm) || "",
      sideEffect: cleanHtml(item.seQesitm) || "",
      storage: cleanHtml(item.depositMethodQesitm) || "",
      image:
        normalizeMedicineImageUrl(item.itemImage) ||
        getMedicineImageOverride(item.itemSeq, item.itemName),
      openDate: item.openDe || "",
      updateDate: item.updateDe || "",
    }));

    return NextResponse.json({
      success: true,
      totalCount,
      items: medicines,
      pageNo: parseInt(pageNo),
      numOfRows: parseInt(numOfRows),
    });
  } catch (error) {
    console.error("Medicine search error:", error);
    return NextResponse.json(
      { error: "약 정보 검색 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

function cleanHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
