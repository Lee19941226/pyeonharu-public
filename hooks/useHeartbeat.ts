"use client";

import { useEffect, useRef } from "react";

// heartbeat 전송 주기 (30초)
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * 사용자가 앱에 접속해 있는 동안 서버에 heartbeat를 전송합니다.
 * - 로그인 사용자: 인증 쿠키 기반으로 자동 식별
 * - 비로그인 사용자: sessionStorage 기반 임시 ID
 * - 탭이 비활성화되면 heartbeat 중단, 활성화되면 재개
 * - 페이지 이탈 시 명시적 퇴장 요청
 */
export function useHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    // 비로그인 사용자용 세션 ID 생성
    let sessionId = sessionStorage.getItem("hb_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID().slice(0, 12);
      sessionStorage.setItem("hb_session_id", sessionId);
    }
    sessionIdRef.current = sessionId;

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/online/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
          // keepalive는 beforeunload에서만 사용
        });
      } catch {
        // 네트워크 오류 무시 (다음 heartbeat에서 재시도)
      }
    };

    const sendLeave = () => {
      // navigator.sendBeacon은 페이지 이탈 시에도 안정적으로 전송
      const body = JSON.stringify({ sessionId: sessionIdRef.current });
      try {
        navigator.sendBeacon("/api/online/heartbeat", new Blob(
          [body],
          { type: "application/json" }
        ));
      } catch {
        // sendBeacon 실패 시 fetch fallback
        fetch("/api/online/heartbeat", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const startHeartbeat = () => {
      if (intervalRef.current) return;
      sendHeartbeat(); // 즉시 1회 전송
      intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeat = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    };

    // 시작
    startHeartbeat();

    // 탭 활성/비활성 감지
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 페이지 이탈 시 퇴장 알림
    window.addEventListener("beforeunload", sendLeave);

    return () => {
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", sendLeave);
      sendLeave();
    };
  }, []);
}
