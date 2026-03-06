"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, X, Plus } from "lucide-react";

type WhitelistMode = "user" | "ip";

interface WhitelistUser {
  id: string;
  nickname: string;
  email?: string;
}

export default function WhitelistManager() {
  const [mode, setMode] = useState<WhitelistMode>("user");

  // 사용자 화이트리스트
  const [whitelistIds, setWhitelistIds] = useState<string[]>([]);
  const [whitelistUsers, setWhitelistUsers] = useState<WhitelistUser[]>([]);

  // IP 화이트리스트
  const [whitelistIps, setWhitelistIps] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WhitelistUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 화이트리스트 로드
  useEffect(() => {
    (async () => {
      try {
        const [userRes, ipRes] = await Promise.all([
          fetch("/api/admin/site-settings?key=whitelist_user_ids"),
          fetch("/api/admin/site-settings?key=whitelist_ips"),
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          const ids: string[] = Array.isArray(data.value) ? data.value : [];
          setWhitelistIds(ids);

          if (ids.length > 0) {
            const users: WhitelistUser[] = [];
            for (const id of ids) {
              try {
                const r = await fetch(
                  `/api/admin/rate-limit?q=${encodeURIComponent(id)}`,
                );
                if (r.ok) {
                  const d = await r.json();
                  if (d.users?.[0]) {
                    users.push(d.users[0]);
                  } else {
                    users.push({ id, nickname: id.slice(0, 8) + "..." });
                  }
                }
              } catch {
                users.push({ id, nickname: id.slice(0, 8) + "..." });
              }
            }
            setWhitelistUsers(users);
          }
        }

        if (ipRes.ok) {
          const data = await ipRes.json();
          setWhitelistIps(Array.isArray(data.value) ? data.value : []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 사용자 검색 (debounce)
  useEffect(() => {
    if (mode !== "user" || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/rate-limit?q=${encodeURIComponent(searchQuery.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.users || []).filter(
            (u: WhitelistUser) => !whitelistIds.includes(u.id),
          );
          setSearchResults(filtered);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, whitelistIds, mode]);

  const saveUserWhitelist = async (newIds: string[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "whitelist_user_ids", value: newIds }),
      });
      const data = await res.json();
      if (data.success) {
        setWhitelistIds(newIds);
        return true;
      }
      showToast("저장 실패", "error");
      return false;
    } catch {
      showToast("저장 중 오류 발생", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveIpWhitelist = async (newIps: string[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "whitelist_ips", value: newIps }),
      });
      const data = await res.json();
      if (data.success) {
        setWhitelistIps(newIps);
        return true;
      }
      showToast("저장 실패", "error");
      return false;
    } catch {
      showToast("저장 중 오류 발생", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (user: WhitelistUser) => {
    const newIds = [...whitelistIds, user.id];
    const ok = await saveUserWhitelist(newIds);
    if (ok) {
      setWhitelistUsers([...whitelistUsers, user]);
      setSearchQuery("");
      setSearchResults([]);
      showToast(`${user.nickname} 님을 화이트리스트에 추가했습니다.`, "success");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    const newIds = whitelistIds.filter((id) => id !== userId);
    const ok = await saveUserWhitelist(newIds);
    if (ok) {
      setWhitelistUsers(whitelistUsers.filter((u) => u.id !== userId));
      showToast("화이트리스트에서 제거했습니다.", "success");
    }
  };

  const handleAddIp = async () => {
    const ip = ipInput.trim();
    if (!ip) return;
    // 기본 IP 형식 검증
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6 = /^[0-9a-fA-F:]+$/;
    if (!ipv4.test(ip) && !ipv6.test(ip)) {
      showToast("올바른 IP 형식이 아닙니다.", "error");
      return;
    }
    if (whitelistIps.includes(ip)) {
      showToast("이미 등록된 IP입니다.", "error");
      return;
    }
    const ok = await saveIpWhitelist([...whitelistIps, ip]);
    if (ok) {
      setIpInput("");
      showToast(`${ip} 를 화이트리스트에 추가했습니다.`, "success");
    }
  };

  const handleRemoveIp = async (ip: string) => {
    const ok = await saveIpWhitelist(whitelistIps.filter((i) => i !== ip));
    if (ok) {
      showToast(`${ip} 를 제거했습니다.`, "success");
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
    <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/30 text-lg">
            🛡️
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
              화이트리스트 관리
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              점검 모드 중에도 접속 허용할 사용자/IP
            </p>
          </div>
        </div>
        <div className="flex items-center text-[11px] font-medium text-gray-400">
          <span className="mr-1">👤</span>{whitelistUsers.length}
          <span className="mx-1.5">·</span>
          <span className="mr-1">🌐</span>{whitelistIps.length}
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

      {/* 모드 토글 */}
      <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 p-0.5 mb-4">
        {(
          [
            { key: "user", label: "사용자 (닉네임/UUID)" },
            { key: "ip", label: "IP 주소" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setMode(tab.key);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === tab.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── 사용자 모드 ─── */}
      {mode === "user" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="닉네임 또는 UUID로 검색하여 추가"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            {searching && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-gray-400" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-36 overflow-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAddUser(user)}
                  disabled={saving}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between disabled:opacity-50"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {user.nickname}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                    + 추가
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              허용 사용자 ({whitelistUsers.length}명)
            </p>
            {whitelistUsers.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                추가된 사용자가 없습니다
              </div>
            ) : (
              <div className="space-y-1.5">
                {whitelistUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {user.nickname}
                      </span>
                      {user.email && (
                        <span className="text-[10px] text-gray-400 ml-2">
                          {user.email}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      disabled={saving}
                      className="text-red-400 hover:text-red-600 disabled:opacity-50 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── IP 모드 ─── */}
      {mode === "ip" && (
        <>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddIp()}
              placeholder="IP 주소 입력 (예: 123.45.67.89)"
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <button
              onClick={handleAddIp}
              disabled={!ipInput.trim() || saving}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white disabled:text-gray-400 text-xs font-semibold px-4 py-2 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              추가
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              허용 IP ({whitelistIps.length}개)
            </p>
            {whitelistIps.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                추가된 IP가 없습니다
              </div>
            ) : (
              <div className="space-y-1.5">
                {whitelistIps.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                  >
                    <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">
                      {ip}
                    </span>
                    <button
                      onClick={() => handleRemoveIp(ip)}
                      disabled={saving}
                      className="text-red-400 hover:text-red-600 disabled:opacity-50 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
