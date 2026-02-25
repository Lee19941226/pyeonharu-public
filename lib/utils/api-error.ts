/**
 * API 에러 유형 분류 및 메시지 반환
 */

export type ApiErrorType =
  | "network" // 인터넷 연결 없음
  | "timeout" // 요청 시간 초과
  | "rate_limit" // 너무 많은 요청 (429)
  | "server" // 서버 오류 (500)
  | "not_found" // 데이터 없음 (404)
  | "unknown"; // 기타

export interface ApiErrorInfo {
  type: ApiErrorType;
  message: string; // 사용자에게 보여줄 메시지
  retry: boolean; // 재시도 가능 여부
  retryAfter?: number; // 재시도 대기 시간 (초)
}

/** fetch 에러 또는 HTTP 상태코드로 에러 유형 분류 */
export function classifyApiError(
  error: unknown,
  status?: number,
  responseData?: any,
): ApiErrorInfo {
  // ── 네트워크 오류 (fetch 자체 실패) ──
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: "network",
      message: "인터넷 연결을 확인해주세요",
      retry: true,
    };
  }

  // ── AbortError (타임아웃 또는 사용자 취소) ──
  if (error instanceof Error && error.name === "AbortError") {
    return {
      type: "timeout",
      message: "요청 시간이 초과됐습니다. 다시 시도해주세요",
      retry: true,
    };
  }

  // ── HTTP 상태코드 기반 ──
  if (status) {
    if (status === 429) {
      const retryAfter = responseData?.retryAfter || 60;
      return {
        type: "rate_limit",
        message:
          responseData?.error ||
          `잠시 후 다시 시도해주세요 (${retryAfter}초 후)`,
        retry: true,
        retryAfter,
      };
    }
    if (status === 404) {
      return {
        type: "not_found",
        message: "제품 정보를 찾을 수 없습니다",
        retry: false,
      };
    }
    if (status >= 500) {
      return {
        type: "server",
        message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요",
        retry: true,
      };
    }
  }

  return {
    type: "unknown",
    message: "오류가 발생했습니다. 다시 시도해주세요",
    retry: true,
  };
}

/** toast 메시지용 duration 반환 */
export function getToastDuration(type: ApiErrorType): number {
  switch (type) {
    case "rate_limit":
      return 6000;
    case "network":
      return 5000;
    case "server":
      return 4000;
    default:
      return 3000;
  }
}
