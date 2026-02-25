/**
 * 서버사이드 OpenAI API 호출 제한 유틸
 * 메모리 기반 — Vercel Serverless에서는 인스턴스별 독립 카운트
 * 완벽한 방어는 아니지만 단일 인스턴스 폭주를 방지합니다.
 */

interface RateBucket {
  count: number;
  resetAt: number;
}

// 엔드포인트별 호출 기록 (메모리)
const buckets = new Map<string, RateBucket>();

// 기본 설정: 분당 30회, 일일 1000회
const LIMITS = {
  perMinute: 30,
  perDay: 1000,
};

/**
 * OpenAI API 호출 전에 체크
 * @param endpoint 엔드포인트 이름 (예: "analyze-image", "meal-recommend")
 * @returns { allowed: boolean, retryAfterSec?: number }
 */
export function checkOpenAIRateLimit(endpoint: string): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();

  // 분당 제한
  const minuteKey = `${endpoint}:minute`;
  const minuteBucket = buckets.get(minuteKey);

  if (minuteBucket && now < minuteBucket.resetAt) {
    if (minuteBucket.count >= LIMITS.perMinute) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((minuteBucket.resetAt - now) / 1000),
      };
    }
    minuteBucket.count++;
  } else {
    buckets.set(minuteKey, { count: 1, resetAt: now + 60_000 });
  }

  // 일일 제한
  const dayKey = `${endpoint}:day`;
  const dayBucket = buckets.get(dayKey);

  if (dayBucket && now < dayBucket.resetAt) {
    if (dayBucket.count >= LIMITS.perDay) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((dayBucket.resetAt - now) / 1000),
      };
    }
    dayBucket.count++;
  } else {
    buckets.set(dayKey, { count: 1, resetAt: now + 86_400_000 });
  }

  return { allowed: true };
}
