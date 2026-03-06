"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  endTime: string | null;
}

export default function MaintenancePage() {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single()
      .then(({ data }) => {
        if (data?.value) {
          setSettings(data.value as MaintenanceSettings);
        }
      });
  }, []);

  const endTimeStr = settings?.endTime
    ? new Date(settings.endTime).toLocaleString("ko-KR", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🔧</div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">
          서비스 점검 중입니다
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {settings?.message ||
            "더 나은 서비스를 위해 점검 중입니다. 잠시 후 다시 방문해 주세요."}
        </p>
        {endTimeStr && (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <span className="text-xs text-gray-400">예상 복구 시간</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              {endTimeStr}
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 pt-4">
          편하루 - 편리한 하루의 시작
        </p>
      </div>
    </div>
  );
}
