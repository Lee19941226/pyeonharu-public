/**
 * AI 분석 결과 저장소
 * - sessionStorage 대신 localStorage + TTL 사용
 * - TTL: 24시간 (이후 자동 만료)
 * - 탭 전환, 앱 백그라운드, 공유 링크 모두 대응
 */

const PREFIX = "ai_result_";
const TTL_MS = 24 * 60 * 60 * 1000; // 24시간
const MAX_ENTRIES = 20; // 최대 저장 개수 (오래된 것부터 제거)

interface StoredAiResult {
  data: Record<string, any>;
  expiresAt: number; // timestamp
}

/** AI 결과 저장 */
export function saveAiResult(
  foodCode: string,
  data: Record<string, any>,
): void {
  if (typeof window === "undefined") return;

  try {
    const entry: StoredAiResult = {
      data,
      expiresAt: Date.now() + TTL_MS,
    };
    localStorage.setItem(PREFIX + foodCode, JSON.stringify(entry));

    // 오래된 항목 정리 (백그라운드)
    cleanupExpiredAiResults();
  } catch (e) {
    // localStorage 용량 초과 시 가장 오래된 것 제거 후 재시도
    evictOldestAiResult();
    try {
      const entry: StoredAiResult = {
        data,
        expiresAt: Date.now() + TTL_MS,
      };
      localStorage.setItem(PREFIX + foodCode, JSON.stringify(entry));
    } catch {
      console.warn("[AiResultStorage] 저장 실패:", e);
    }
  }
}

/** AI 결과 읽기 (만료된 경우 null 반환) */
export function getAiResult(foodCode: string): Record<string, any> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(PREFIX + foodCode);
    if (!raw) return null;

    const entry: StoredAiResult = JSON.parse(raw);

    // TTL 만료 체크
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(PREFIX + foodCode);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/** AI 결과 삭제 */
export function removeAiResult(foodCode: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREFIX + foodCode);
}

/** 만료된 AI 결과 전체 정리 */
export function cleanupExpiredAiResults(): void {
  if (typeof window === "undefined") return;

  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const entry: StoredAiResult = JSON.parse(raw);
        if (now > entry.expiresAt) keysToRemove.push(key);
      } catch {
        keysToRemove.push(key!); // 파싱 실패도 제거
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // 무시
  }
}

/** 가장 오래된 AI 결과 1개 제거 (용량 초과 시) */
function evictOldestAiResult(): void {
  try {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const entry: StoredAiResult = JSON.parse(raw);
        if (entry.expiresAt < oldestExpiry) {
          oldestExpiry = entry.expiresAt;
          oldestKey = key;
        }
      } catch {
        oldestKey = key;
        break;
      }
    }

    if (oldestKey) localStorage.removeItem(oldestKey);
  } catch {
    // 무시
  }
}
