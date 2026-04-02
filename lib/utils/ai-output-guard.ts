import { z } from "zod";

export const ZShortText = (max: number) => z.coerce.string().trim().max(max);

export const ZStringList = (maxItems: number, itemMaxLength: number) =>
  z
    .array(z.coerce.string().trim().max(itemMaxLength))
    .max(maxItems)
    .transform((list) => list.filter(Boolean));

export function clampText(value: unknown, maxLength: number, fallback = ""): string {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.slice(0, maxLength);
}

export function clampInt(
  value: unknown,
  options: { min: number; max: number; fallback: number },
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return options.fallback;
  return Math.min(options.max, Math.max(options.min, Math.round(parsed)));
}

export function clampFloat(
  value: unknown,
  options: { min: number; max: number; fallback: number },
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return options.fallback;
  return Math.min(options.max, Math.max(options.min, parsed));
}
