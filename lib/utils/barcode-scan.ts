"use client";

function toDataUrlBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
}

function normalizeBarcode(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, "").trim();
  if (!cleaned) return null;

  // EAN/UPC/GTIN 우선 추출
  const digitMatches = cleaned.match(/\d{8,14}/g);
  if (digitMatches && digitMatches.length > 0) {
    const best = digitMatches.sort((a, b) => b.length - a.length)[0];
    return best;
  }

  return cleaned;
}

async function imageBitmapFromFile(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

async function buildVariantFiles(file: File): Promise<File[]> {
  const variants: File[] = [file];
  const bitmap = await imageBitmapFromFile(file);
  if (!bitmap || typeof document === "undefined") return variants;

  // 작은 바코드 입력에서 인식률 향상을 위해 업스케일 + 큰 입력은 다운스케일
  const maxSide = 2200;
  const minSideForScan = 1000;
  const longest = Math.max(bitmap.width, bitmap.height);
  const upScale = longest < minSideForScan ? minSideForScan / longest : 1;
  const downScale = Math.min(1, maxSide / longest);
  const scale = Math.max(0.5, Math.min(4, upScale * downScale));

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });
  if (!baseCtx) return variants;

  baseCtx.drawImage(bitmap, 0, 0, width, height);

  const pushCanvasFile = async (canvas: HTMLCanvasElement, name: string) => {
    const blob = await toDataUrlBlob(canvas);
    if (!blob) return;
    variants.push(new File([blob], name, { type: "image/jpeg" }));
  };

  await pushCanvasFile(baseCanvas, "barcode-original.jpg");

  // 약간 기울어진 바코드 보정
  const pushRotatedVariant = async (deg: number, name: string) => {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const rw = Math.max(1, Math.round(width * cos + height * sin));
    const rh = Math.max(1, Math.round(width * sin + height * cos));

    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = rw;
    rotatedCanvas.height = rh;
    const ctx = rotatedCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.translate(rw / 2, rh / 2);
    ctx.rotate(rad);
    ctx.drawImage(baseCanvas, -width / 2, -height / 2);

    await pushCanvasFile(rotatedCanvas, name);
  };

  await pushRotatedVariant(-4, "barcode-rotated-minus4.jpg");
  await pushRotatedVariant(4, "barcode-rotated-plus4.jpg");

  // 그레이스케일 + 대비 강화
  const grayCanvas = document.createElement("canvas");
  grayCanvas.width = width;
  grayCanvas.height = height;
  const grayCtx = grayCanvas.getContext("2d", { willReadFrequently: true });
  if (grayCtx) {
    grayCtx.drawImage(baseCanvas, 0, 0);
    const img = grayCtx.getImageData(0, 0, width, height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      const boosted = Math.max(0, Math.min(255, (lum - 128) * 1.6 + 128));
      d[i] = boosted;
      d[i + 1] = boosted;
      d[i + 2] = boosted;
    }
    grayCtx.putImageData(img, 0, 0);
    await pushCanvasFile(grayCanvas, "barcode-gray-contrast.jpg");
  }

  // 이진화(Threshold)
  const bwCanvas = document.createElement("canvas");
  bwCanvas.width = width;
  bwCanvas.height = height;
  const bwCtx = bwCanvas.getContext("2d", { willReadFrequently: true });
  if (bwCtx) {
    bwCtx.drawImage(baseCanvas, 0, 0);
    const img = bwCtx.getImageData(0, 0, width, height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = lum > 150 ? 255 : 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
    }
    bwCtx.putImageData(img, 0, 0);
    await pushCanvasFile(bwCanvas, "barcode-threshold.jpg");
  }

  return variants;
}

async function tryBarcodeDetector(file: File): Promise<string | null> {
  const Detector = (globalThis as any).BarcodeDetector;
  if (!Detector) return null;

  try {
    const detector = new Detector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf", "qr_code"],
    });
    const bitmap = await createImageBitmap(file);
    const results = await detector.detect(bitmap);
    for (const r of results || []) {
      const value = normalizeBarcode(r?.rawValue || "");
      if (value) return value;
    }
  } catch {
    // 브라우저/디바이스 호환 이슈는 무시하고 다음 방식으로 폴백
  }

  return null;
}

async function tryHtml5Qrcode(file: File, readerElementId: string): Promise<string | null> {
  try {
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode(readerElementId);
    const raw = await scanner.scanFile(file, false);
    return normalizeBarcode(String(raw));
  } catch {
    return null;
  }
}

export async function detectBarcodeValue(
  file: File,
  options?: { readerElementId?: string },
): Promise<string | null> {
  const readerElementId = options?.readerElementId ?? "qr-reader-hidden";
  const variants = await buildVariantFiles(file);

  for (const variant of variants) {
    const detected = await tryBarcodeDetector(variant);
    if (detected) return detected;
  }

  for (const variant of variants) {
    const detected = await tryHtml5Qrcode(variant, readerElementId);
    if (detected) return detected;
  }

  return null;
}
