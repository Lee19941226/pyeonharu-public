"use client";

import { useHeartbeat } from "@/hooks/useHeartbeat";

/**
 * 글로벌 레이아웃에서 children을 감싸서 모든 페이지에서
 * heartbeat를 자동 전송하도록 합니다.
 *
 * AWS 이관 후에도 동일하게 동작합니다 (순수 HTTP 기반).
 */
export function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  useHeartbeat();
  return <>{children}</>;
}
