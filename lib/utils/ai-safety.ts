export function redactSensitiveText(input: string): string {
  return String(input || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/\b01[0-9]-?\d{3,4}-?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{2,3}-?\d{3,4}-?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{6}-?[1-4]\d{6}\b/g, "[RRN]")
    .trim();
}

export function parseJsonObjectSafe<T = Record<string, unknown>>(
  raw: string,
): T | null {
  const cleaned = String(raw || "")
    .replace(/```json\s?/g, "")
    .replace(/```/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export function parseJsonArraySafe<T = unknown>(raw: string): T[] | null {
  const cleaned = String(raw || "")
    .replace(/```json\s?/g, "")
    .replace(/```/g, "")
    .trim();

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed as T[];
  } catch {
    return null;
  }
}