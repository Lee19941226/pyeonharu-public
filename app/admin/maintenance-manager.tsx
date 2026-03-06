"use client";

import { useState, useEffect } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  endTime: string | null;
}

export default function MaintenanceManager() {
  const [settings, setSettings] = useState<MaintenanceSettings>({
    enabled: false,
    message: "",
    endTime: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirmToggle, setConfirmToggle] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 설정 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/site-settings?key=maintenance_mode");
        if (res.ok) {
          const data = await res.json();
          if (data.value) {
            setSettings(data.value);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (newSettings: MaintenanceSettings) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "maintenance_mode",
          value: newSettings,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(newSettings);
        showToast(
          newSettings.enabled
            ? "점검 모드가 활성화되었습니다."
            : "점검 모드가 해제되었습니다.",
          "success",
        );
      } else {
        showToast("저장 실패: " + (data.error || ""), "error");
      }
    } catch {
      showToast("저장 중 오류 발생", "error");
    } finally {
      setSaving(false);
      setConfirmToggle(false);
    }
  };

  const handleToggle = () => {
    if (settings.enabled) {
      // 끄기는 바로 실행
      handleSave({ ...settings, enabled: false });
    } else {
      // 켜기는 확인 필요
      setConfirmToggle(true);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-card border ${
        settings.enabled
          ? "border-red-300 dark:border-red-800"
          : "border-gray-100 dark:border-gray-800"
      } p-6 shadow-sm`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 text-lg">
            🚧
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
              점검 모드
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              활성화 시 일반 사용자는 점검 페이지로 리다이렉트됩니다
            </p>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            settings.enabled
              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {settings.enabled ? "ON" : "OFF"}
        </div>
      </div>

      {toast && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="space-y-4">
        {/* 점검 메시지 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
            점검 메시지
          </label>
          <textarea
            value={settings.message}
            onChange={(e) =>
              setSettings({ ...settings, message: e.target.value })
            }
            placeholder="서버 점검 중입니다. 14:00에 복구 예정입니다."
            rows={2}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
          />
        </div>

        {/* 점검 종료 예정 시간 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
            예상 종료 시간
          </label>
          <input
            type="datetime-local"
            value={settings.endTime || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                endTime: e.target.value || null,
              })
            }
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        {/* 메시지/시간 저장 (점검 모드 상태 변경 없이) */}
        <button
          onClick={() => handleSave(settings)}
          disabled={saving}
          className="w-full rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold py-2.5 transition-colors disabled:opacity-50"
        >
          메시지/시간 저장
        </button>

        {/* 토글 버튼 */}
        {!confirmToggle ? (
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`w-full rounded-xl text-xs font-semibold py-2.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              settings.enabled
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {settings.enabled ? "점검 모드 해제" : "점검 모드 활성화"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handleSave({ ...settings, enabled: true })}
              disabled={saving}
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              정말 활성화
            </button>
            <button
              onClick={() => setConfirmToggle(false)}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
