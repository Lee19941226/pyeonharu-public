"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Smartphone, Eye } from "lucide-react";

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

interface VersionConfig {
  enabled: boolean;
  latestVersion: string;
  forceUpdateBelow: string;
  recommendUpdateBelow: string;
  forceUpdateMessage: string;
  recommendUpdateMessage: string;
  storeUrl: { android: string; ios: string };
}

const DEFAULT_CONFIG: VersionConfig = {
  enabled: false,
  latestVersion: "",
  forceUpdateBelow: "",
  recommendUpdateBelow: "",
  forceUpdateMessage:
    "필수 업데이트가 있습니다. 최신 버전으로 업데이트해주세요.",
  recommendUpdateMessage:
    "새로운 기능이 추가되었습니다. 업데이트를 권장합니다.",
  storeUrl: { android: "", ios: "" },
};

export default function AppVersionManager() {
  const [config, setConfig] = useState<VersionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [simVersion, setSimVersion] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "/api/admin/site-settings?key=app_version_config",
        );
        if (res.ok) {
          const data = await res.json();
          if (data.value) {
            setConfig({ ...DEFAULT_CONFIG, ...data.value });
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validate = (): string | null => {
    if (config.latestVersion && !SEMVER_RE.test(config.latestVersion)) {
      return "최신 버전 형식이 올바르지 않습니다. (예: 1.0.0)";
    }
    if (config.forceUpdateBelow && !SEMVER_RE.test(config.forceUpdateBelow)) {
      return "강제 업데이트 기준 버전 형식이 올바르지 않습니다.";
    }
    if (
      config.recommendUpdateBelow &&
      !SEMVER_RE.test(config.recommendUpdateBelow)
    ) {
      return "권장 업데이트 기준 버전 형식이 올바르지 않습니다.";
    }
    if (
      config.forceUpdateBelow &&
      config.recommendUpdateBelow &&
      SEMVER_RE.test(config.forceUpdateBelow) &&
      SEMVER_RE.test(config.recommendUpdateBelow) &&
      compareSemver(config.forceUpdateBelow, config.recommendUpdateBelow) > 0
    ) {
      return "강제 업데이트 기준은 권장 업데이트 기준보다 낮아야 합니다.";
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      showToast(err, "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "app_version_config", value: config }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("저장되었습니다.", "success");
      } else {
        showToast("저장 실패: " + (data.error || ""), "error");
      }
    } catch {
      showToast("저장 중 오류 발생", "error");
    } finally {
      setSaving(false);
    }
  };

  // 시뮬레이션 결과
  const simResult = useMemo(() => {
    if (!simVersion || !SEMVER_RE.test(simVersion)) return null;
    if (!config.enabled) return { status: "ok (기능 비활성화)", color: "gray" };
    if (
      config.forceUpdateBelow &&
      SEMVER_RE.test(config.forceUpdateBelow) &&
      compareSemver(simVersion, config.forceUpdateBelow) <= 0
    ) {
      return { status: "force_update (강제 업데이트)", color: "red" };
    }
    if (
      config.recommendUpdateBelow &&
      SEMVER_RE.test(config.recommendUpdateBelow) &&
      compareSemver(simVersion, config.recommendUpdateBelow) <= 0
    ) {
      return { status: "recommend_update (권장 업데이트)", color: "amber" };
    }
    return { status: "ok (최신 버전)", color: "green" };
  }, [simVersion, config]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-card border ${
        config.enabled
          ? "border-blue-300 dark:border-blue-800"
          : "border-gray-100 dark:border-gray-800"
      } p-6 shadow-sm`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
              앱 버전 관리
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              앱 강제/권장 업데이트 기준을 설정합니다
            </p>
          </div>
        </div>
        <button
          onClick={() => setConfig({ ...config, enabled: !config.enabled })}
          className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
            config.enabled
              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {config.enabled ? "ON" : "OFF"}
        </button>
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
        {/* 버전 설정 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              최신 버전
            </label>
            <input
              type="text"
              value={config.latestVersion}
              onChange={(e) =>
                setConfig({ ...config, latestVersion: e.target.value.trim() })
              }
              placeholder="1.5.0"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              강제 업데이트 기준
            </label>
            <input
              type="text"
              value={config.forceUpdateBelow}
              onChange={(e) =>
                setConfig({
                  ...config,
                  forceUpdateBelow: e.target.value.trim(),
                })
              }
              placeholder="1.0.0"
              className={inputClass}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              이 버전 이하 강제 업데이트
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              권장 업데이트 기준
            </label>
            <input
              type="text"
              value={config.recommendUpdateBelow}
              onChange={(e) =>
                setConfig({
                  ...config,
                  recommendUpdateBelow: e.target.value.trim(),
                })
              }
              placeholder="1.3.0"
              className={inputClass}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              이 버전 이하 권장 업데이트
            </p>
          </div>
        </div>

        {/* 메시지 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
            강제 업데이트 메시지
          </label>
          <input
            type="text"
            value={config.forceUpdateMessage}
            onChange={(e) =>
              setConfig({ ...config, forceUpdateMessage: e.target.value })
            }
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
            권장 업데이트 메시지
          </label>
          <input
            type="text"
            value={config.recommendUpdateMessage}
            onChange={(e) =>
              setConfig({ ...config, recommendUpdateMessage: e.target.value })
            }
            className={inputClass}
          />
        </div>

        {/* 스토어 URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              Android 스토어 URL
            </label>
            <input
              type="text"
              value={config.storeUrl.android}
              onChange={(e) =>
                setConfig({
                  ...config,
                  storeUrl: { ...config.storeUrl, android: e.target.value },
                })
              }
              placeholder="https://play.google.com/store/apps/details?id=..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              iOS 스토어 URL
            </label>
            <input
              type="text"
              value={config.storeUrl.ios}
              onChange={(e) =>
                setConfig({
                  ...config,
                  storeUrl: { ...config.storeUrl, ios: e.target.value },
                })
              }
              placeholder="https://apps.apple.com/app/..."
              className={inputClass}
            />
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
          설정 저장
        </button>

        {/* 시뮬레이션 */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
              응답 미리보기
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={simVersion}
              onChange={(e) => setSimVersion(e.target.value.trim())}
              placeholder="테스트할 앱 버전 입력 (예: 1.0.0)"
              className={`flex-1 ${inputClass}`}
            />
          </div>
          {simVersion && (
            <div className="mt-2">
              {!SEMVER_RE.test(simVersion) ? (
                <p className="text-[11px] text-gray-400">
                  올바른 버전 형식을 입력하세요 (x.y.z)
                </p>
              ) : simResult ? (
                <div
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${
                    simResult.color === "red"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      : simResult.color === "amber"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        : simResult.color === "green"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  v{simVersion} → {simResult.status}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
