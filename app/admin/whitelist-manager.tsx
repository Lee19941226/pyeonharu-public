"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, X } from "lucide-react";

interface WhitelistUser {
  id: string;
  nickname: string;
  email?: string;
}

export default function WhitelistManager() {
  const [whitelistIds, setWhitelistIds] = useState<string[]>([]);
  const [whitelistUsers, setWhitelistUsers] = useState<WhitelistUser[]>([]);
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
        const res = await fetch(
          "/api/admin/site-settings?key=whitelist_user_ids",
        );
        if (res.ok) {
          const data = await res.json();
          const ids: string[] = Array.isArray(data.value) ? data.value : [];
          setWhitelistIds(ids);

          // 각 ID의 프로필 정보 조회
          if (ids.length > 0) {
            const profileRes = await fetch(
              `/api/admin/rate-limit?q=${ids[0]}`,
            );
            // 간단히 각 ID로 조회 (rate-limit API의 사용자 검색 재활용)
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
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 사용자 검색 (debounce)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 1) {
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
          // 이미 화이트리스트에 있는 사용자 제외
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
  }, [searchQuery, whitelistIds]);

  const saveWhitelist = async (newIds: string[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "whitelist_user_ids",
          value: newIds,
        }),
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

  const handleAdd = async (user: WhitelistUser) => {
    const newIds = [...whitelistIds, user.id];
    const ok = await saveWhitelist(newIds);
    if (ok) {
      setWhitelistUsers([...whitelistUsers, user]);
      setSearchQuery("");
      setSearchResults([]);
      showToast(`${user.nickname} 님을 화이트리스트에 추가했습니다.`, "success");
    }
  };

  const handleRemove = async (userId: string) => {
    const newIds = whitelistIds.filter((id) => id !== userId);
    const ok = await saveWhitelist(newIds);
    if (ok) {
      setWhitelistUsers(whitelistUsers.filter((u) => u.id !== userId));
      showToast("화이트리스트에서 제거했습니다.", "success");
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
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/30 text-lg">
          🛡️
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            화이트리스트 관리
          </h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            점검 모드 중에도 접속 허용할 사용자 (관리자는 기본 허용)
          </p>
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

      {/* 검색 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="사용자 닉네임 또는 UUID로 검색하여 추가"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
        {searching && (
          <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-gray-400" />
        )}
      </div>

      {/* 검색 결과 */}
      {searchResults.length > 0 && (
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-36 overflow-auto">
          {searchResults.map((user) => (
            <button
              key={user.id}
              onClick={() => handleAdd(user)}
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

      {/* 현재 화이트리스트 */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          현재 허용 목록 ({whitelistUsers.length}명)
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
                  onClick={() => handleRemove(user.id)}
                  disabled={saving}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
