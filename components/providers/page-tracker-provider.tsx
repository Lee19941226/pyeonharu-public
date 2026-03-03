"use client";

import { usePageTracker } from "@/hooks/usePageTracker";

/**
 * 글로벌 레이아웃에서 children을 감싸서 모든 페이지 방문을
 * 자동으로 액션 로그에 기록합니다.
 */
export function PageTrackerProvider({ children }: { children: React.ReactNode }) {
  usePageTracker();
  return <>{children}</>;
}
