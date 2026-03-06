"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BannedPage() {
  const [banInfo, setBanInfo] = useState<{
    reason: string;
    until: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("is_banned, ban_reason, ban_until")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!data) return;
          // 밴이 아니거나 기간 만료 → 홈으로 이동
          if (!data.is_banned) {
            window.location.href = "/";
            return;
          }
          if (data.ban_until && new Date(data.ban_until) < new Date()) {
            // 만료된 밴 → 자동 해제 API 호출
            fetch("/api/auth/auto-unban", { method: "POST" }).then(() => {
              window.location.href = "/";
            });
            return;
          }
          setBanInfo({
            reason: data.ban_reason || "",
            until: data.ban_until,
          });
        });
    });
  }, []);

  const untilStr = banInfo?.until
    ? new Date(banInfo.until).toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🚫</div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">
          계정이 정지되었습니다
        </h1>

        {banInfo?.reason && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 text-left space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-1">
                정지 사유
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {banInfo.reason}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 mb-1">
                해제 예정일
              </p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                {untilStr || "영구 정지"}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          정지에 대한 문의는 아래 이메일로 연락해주세요.
          <br />
          <a
            href="mailto:pyeonharu@gmail.com"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            pyeonharu@gmail.com
          </a>
        </p>

        <button
          onClick={handleLogout}
          className="w-full rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold py-3 hover:opacity-90 transition-opacity"
        >
          로그아웃
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
          편하루 - 편리한 하루의 시작
        </p>
      </div>
    </div>
  );
}
