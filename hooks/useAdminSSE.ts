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
 * SSE濡?愿由ъ옄 ??쒕낫?쒖뿉 ?ㅼ떆媛??묒냽???뺣낫瑜??ㅽ듃由щ컢?⑸땲??
 * ?곌껐 ?딄? ???먮룞 ?ъ뿰寃?(理쒕? 5?? 諛깆삤???곸슜)
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

  const connect = useCallback(function connectSSE() {
    // 湲곗〈 ?곌껐 ?뺣━
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource("/api/admin/online");

    es.onopen = () => {
      retryCountRef.current = 0; // ?곌껐 ?깃났 ???ъ떆??移댁슫??由ъ뀑
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

      // ?먮룞 ?ъ뿰寃?(理쒕? 5?? 吏??諛깆삤??
      if (retryCountRef.current < 5) {
        const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000);
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(connectSSE, delay);
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
