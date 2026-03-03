/**
 * 온라인 사용자 Supabase 저장소
 *
 * 이전: Node.js 인메모리 Map (서버리스 인스턴스 간 공유 불가)
 * 현재: Supabase online_users 테이블 (모든 인스턴스에서 공유)
 *
 * 각 사용자는 heartbeat를 주기적으로 보내고,
 * TIMEOUT(60초) 내에 heartbeat가 없으면 오프라인으로 판정됩니다.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface OnlineUser {
  userId: string;
  nickname: string | null;
  isAuthenticated: boolean;
  ipAddress: string;
  lastHeartbeat: number; // timestamp ms
  connectedAt: number; // timestamp ms
}

const TIMEOUT_SECONDS = 60;

export const onlineStore = {
  /**
   * 사용자 heartbeat 등록/갱신 (Supabase upsert)
   */
  async upsert(
    userId: string,
    info: {
      nickname?: string | null;
      isAuthenticated?: boolean;
      ipAddress?: string;
    },
  ): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from("online_users").upsert(
      {
        user_id: userId,
        nickname: info.nickname ?? null,
        is_authenticated: info.isAuthenticated ?? false,
        ip_address: info.ipAddress ?? "unknown",
        last_heartbeat: now,
        // connected_at는 INSERT 시에만 설정 (conflict 시 갱신하지 않음)
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: false,
      },
    );

    if (error) {
      console.error("[online-store] upsert error:", error.message);
    }
  },

  /**
   * 사용자 명시적 퇴장
   */
  async remove(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("online_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[online-store] remove error:", error.message);
    }
  },

  /**
   * 현재 온라인 사용자 목록 (60초 이내 heartbeat)
   */
  async getOnlineUsers(): Promise<OnlineUser[]> {
    const cutoff = new Date(
      Date.now() - TIMEOUT_SECONDS * 1000,
    ).toISOString();

    const { data, error } = await supabaseAdmin
      .from("online_users")
      .select("*")
      .gte("last_heartbeat", cutoff)
      .order("last_heartbeat", { ascending: false });

    if (error) {
      console.error("[online-store] getOnlineUsers error:", error.message);
      return [];
    }

    // 만료된 사용자 정리 (fire-and-forget)
    supabaseAdmin
      .from("online_users")
      .delete()
      .lt("last_heartbeat", cutoff)
      .then(({ error: cleanupErr }) => {
        if (cleanupErr) {
          console.error("[online-store] cleanup error:", cleanupErr.message);
        }
      });

    return (data || []).map((row) => ({
      userId: row.user_id,
      nickname: row.nickname,
      isAuthenticated: row.is_authenticated,
      ipAddress: row.ip_address,
      lastHeartbeat: new Date(row.last_heartbeat).getTime(),
      connectedAt: new Date(row.connected_at).getTime(),
    }));
  },

  /**
   * 요약 통계
   */
  async getSummary(): Promise<{
    totalOnline: number;
    authenticatedCount: number;
    anonymousCount: number;
  }> {
    const users = await this.getOnlineUsers();
    const authenticated = users.filter((u) => u.isAuthenticated);
    return {
      totalOnline: users.length,
      authenticatedCount: authenticated.length,
      anonymousCount: users.length - authenticated.length,
    };
  },
};
