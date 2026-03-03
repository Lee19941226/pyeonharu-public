import { NextRequest } from "next/server";
import { onlineStore } from "@/lib/online-store";
import { verifyAdmin } from "@/lib/utils/admin-auth";

/**
 * GET /api/admin/online
 * SSE (Server-Sent Events) 엔드포인트
 * 관리자에게 현재 접속자 정보를 5초 간격으로 스트리밍합니다.
 */
export async function GET(request: NextRequest) {
  // 관리자 인증 확인
  const auth = await verifyAdmin();
  if (!auth.ok) return auth.response;

  // SSE 스트림 생성
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendData = async () => {
        try {
          const users = await onlineStore.getOnlineUsers();
          const authenticated = users.filter((u) => u.isAuthenticated);

          const data = JSON.stringify({
            totalOnline: users.length,
            authenticatedCount: authenticated.length,
            anonymousCount: users.length - authenticated.length,
            users: users.map((u) => ({
              userId: u.userId,
              nickname: u.nickname,
              isAuthenticated: u.isAuthenticated,
              ipAddress: u.ipAddress,
              connectedAt: u.connectedAt,
              lastHeartbeat: u.lastHeartbeat,
            })),
            timestamp: Date.now(),
          });

          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          console.error("SSE send error:", error);
        }
      };

      // 즉시 첫 데이터 전송
      sendData();

      // 5초마다 갱신
      const interval = setInterval(sendData, 5000);

      // 클라이언트 연결 종료 감지
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // 이미 닫힌 경우 무시
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx 프록시 버퍼링 비활성화
    },
  });
}
