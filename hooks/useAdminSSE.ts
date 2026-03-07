"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface OnlineUser {
  userId: string;
  nickname: string | null;
  isAuthenticated: boolean;
  ipAddress: string;
  connectedAt: number;
  lastHeartbeat: number;
}

interface AdminSSEData {
  totalOnline: number;
  authenticatedCount: number;
  anonymousCount: number;
  users: OnlineUser[];
  connected: boolean;
}

/**
 * SSE로 관리자 대시보드에 실시간 접속자 정보를 스트리밍합니다.
 * 연결 끊김 시 자동 재연결 (최대 5회, 백오프 적용)
 */
export function useAdminSSE(): AdminSSEData {
  const [data, setData] = useState<AdminSSEData>({
    totalOnline: 0,
    authenticatedCount: 0,
    anonymousCount: 0,
    users: [],
    connected: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // 기존 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource("/api/admin/online");

    es.onopen = () => {
      retryCountRef.current = 0; // 연결 성공 시 재시도 카운트 리셋
      setData((prev) => ({ ...prev, connected: true }));
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData({
          totalOnline: parsed.totalOnline ?? 0,
          authenticatedCount: parsed.authenticatedCount ?? 0,
          anonymousCount: parsed.anonymousCount ?? 0,
          users: parsed.users ?? [],
          connected: true,
        });
      } catch (e) {
        console.error("SSE parse error:", e);
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setData((prev) => ({ ...prev, connected: false }));

      // 자동 재연결 (최대 5회, 지수 백오프)
      if (retryCountRef.current < 5) {
        const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000);
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(connect, delay);
      }
    };

    eventSourceRef.current = es;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return data;
}
