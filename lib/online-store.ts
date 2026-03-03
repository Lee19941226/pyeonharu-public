/**
 * 온라인 사용자 인메모리 저장소
 *
 * 현재: Node.js 프로세스 메모리 (단일 서버/서버리스 인스턴스)
 * AWS 이관 시: Redis (ElastiCache) 또는 DynamoDB TTL로 교체
 *
 * 각 사용자는 heartbeat를 주기적으로 보내고,
 * TIMEOUT_MS 내에 heartbeat가 없으면 오프라인으로 판정됩니다.
 */

export interface OnlineUser {
  userId: string;
  nickname: string | null;
  isAuthenticated: boolean;
  ipAddress: string;
  lastHeartbeat: number; // timestamp ms
  connectedAt: number; // timestamp ms
}

// heartbeat 없으면 오프라인으로 판정하는 시간 (60초)
const TIMEOUT_MS = 60_000;

// 정리 주기 (30초마다 만료된 사용자 제거)
const CLEANUP_INTERVAL_MS = 30_000;

class OnlineStore {
  private users = new Map<string, OnlineUser>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * 사용자 heartbeat 등록/갱신
   */
  upsert(
    userId: string,
    info: { nickname?: string | null; isAuthenticated?: boolean; ipAddress?: string },
  ): void {
    const existing = this.users.get(userId);
    const now = Date.now();

    this.users.set(userId, {
      userId,
      nickname: info.nickname ?? existing?.nickname ?? null,
      isAuthenticated: info.isAuthenticated ?? existing?.isAuthenticated ?? false,
      ipAddress: info.ipAddress ?? existing?.ipAddress ?? "unknown",
      lastHeartbeat: now,
      connectedAt: existing?.connectedAt ?? now,
    });
  }

  /**
   * 사용자 명시적 퇴장
   */
  remove(userId: string): void {
    this.users.delete(userId);
  }

  /**
   * 현재 온라인 사용자 목록 (만료되지 않은)
   */
  getOnlineUsers(): OnlineUser[] {
    const now = Date.now();
    const result: OnlineUser[] = [];

    for (const [key, user] of this.users) {
      if (now - user.lastHeartbeat < TIMEOUT_MS) {
        result.push(user);
      } else {
        // 만료된 사용자 제거
        this.users.delete(key);
      }
    }

    return result;
  }

  /**
   * 요약 통계
   */
  getSummary(): {
    totalOnline: number;
    authenticatedCount: number;
    anonymousCount: number;
  } {
    const users = this.getOnlineUsers();
    const authenticated = users.filter((u) => u.isAuthenticated);
    return {
      totalOnline: users.length,
      authenticatedCount: authenticated.length,
      anonymousCount: users.length - authenticated.length,
    };
  }

  /**
   * 만료된 사용자 정리
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, user] of this.users) {
      if (now - user.lastHeartbeat >= TIMEOUT_MS) {
        this.users.delete(key);
      }
    }
  }

  private startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // 서버리스 환경에서 프로세스 종료 시 정리
    if (typeof process !== "undefined") {
      process.on("SIGTERM", () => this.stopCleanup());
    }
  }

  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// 싱글톤 인스턴스 (같은 서버 프로세스 내에서 공유)
// globalThis를 사용해 Next.js HMR에서도 재생성 방지
const globalForOnline = globalThis as unknown as {
  __onlineStore?: OnlineStore;
};

export const onlineStore =
  globalForOnline.__onlineStore ?? new OnlineStore();

if (process.env.NODE_ENV !== "production") {
  globalForOnline.__onlineStore = onlineStore;
}
