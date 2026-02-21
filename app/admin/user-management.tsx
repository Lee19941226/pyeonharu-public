"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, Shield, ShieldCheck, ShieldAlert,
  Crown, User, Mail, School, ScanLine, MessageSquare, AlertTriangle,
  Check, X, Loader2, Filter,
} from "lucide-react";

interface UserData {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  role: string;
  height: number | null;
  weight: number | null;
  age: number | null;
  gender: string | null;
  allergies: string[];
  schools: string[];
  scanCount: number;
  postCount: number;
}

interface UsersResponse {
  users: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ROLES = [
  { value: "user", label: "일반 사용자", icon: User, color: "text-gray-600 bg-gray-100" },
  { value: "moderator", label: "모더레이터", icon: Shield, color: "text-blue-600 bg-blue-100" },
  { value: "admin", label: "관리자", icon: ShieldCheck, color: "text-amber-600 bg-amber-100" },
  { value: "super_admin", label: "슈퍼 관리자", icon: Crown, color: "text-red-600 bg-red-100" },
];

function getRoleInfo(role: string) {
  return ROLES.find((r) => r.value === role) || ROLES[0];
}

function RoleBadge({ role }: { role: string }) {
  const info = getRoleInfo(role);
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${info.color}`}>
      <Icon className="h-3 w-3" />
      {info.label}
    </span>
  );
}

export default function UserManagement() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    userId: string;
    userName: string;
    currentRole: string;
    newRole: string;
  } | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Users fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleRoleChange = async () => {
    if (!confirmDialog) return;
    setChangingRole(confirmDialog.userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: confirmDialog.userId,
          newRole: confirmDialog.newRole,
        }),
      });
      if (res.ok) {
        // 목록 새로고침
        await fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "등급 변경 실패");
      }
    } catch {
      alert("등급 변경 중 오류 발생");
    } finally {
      setChangingRole(null);
      setConfirmDialog(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="닉네임 또는 UUID로 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 w-full rounded-lg border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            검색
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-lg border bg-card px-3 text-sm outline-none"
          >
            <option value="">전체 등급</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 통계 바 */}
      {data && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>전체 <strong className="text-foreground">{data.total}</strong>명</span>
          <span>·</span>
          <span>페이지 {data.page} / {data.totalPages}</span>
        </div>
      )}

      {/* 사용자 테이블 */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <User className="h-10 w-10 mb-3" />
          <p>검색 결과가 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">사용자</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">이메일</th>
                <th className="px-4 py-3 text-left font-medium">등급</th>
                <th className="px-4 py-3 text-center font-medium hidden lg:table-cell">활동</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">가입일</th>
                <th className="px-4 py-3 text-center font-medium">등급 변경</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((user) => {
                const isExpanded = expandedUser === user.id;
                return (
                  <tr key={user.id} className="group">
                    <td colSpan={6} className="p-0">
                      <div>
                        {/* 메인 행 */}
                        <div
                          className="flex items-center border-b cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                        >
                          <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-[160px]">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {user.nickname?.charAt(0) || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{user.nickname || "이름 없음"}</p>
                              <p className="text-[10px] text-muted-foreground truncate md:hidden">{user.email}</p>
                            </div>
                          </div>
                          <div className="px-4 py-3 hidden md:block min-w-[180px]">
                            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                          </div>
                          <div className="px-4 py-3 min-w-[120px]">
                            <RoleBadge role={user.role || "user"} />
                          </div>
                          <div className="px-4 py-3 text-center hidden lg:block min-w-[100px]">
                            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                              <span title="스캔"><ScanLine className="inline h-3 w-3" /> {user.scanCount}</span>
                              <span title="게시글"><MessageSquare className="inline h-3 w-3" /> {user.postCount}</span>
                            </div>
                          </div>
                          <div className="px-4 py-3 hidden lg:block min-w-[100px]">
                            <p className="text-xs text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString("ko-KR")}
                            </p>
                          </div>
                          <div className="px-4 py-3 min-w-[140px]">
                            <select
                              value={user.role || "user"}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.value !== user.role) {
                                  setConfirmDialog({
                                    userId: user.id,
                                    userName: user.nickname || user.email,
                                    currentRole: user.role || "user",
                                    newRole: e.target.value,
                                  });
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={changingRole === user.id}
                              className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                            >
                              {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* 확장 상세 */}
                        {isExpanded && (
                          <div className="border-b bg-muted/20 px-4 py-3 space-y-2 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <span className="text-muted-foreground">UUID</span>
                                <p className="font-mono text-[10px] truncate">{user.id}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">신체정보</span>
                                <p>{user.height ? `${user.height}cm` : "-"} / {user.weight ? `${user.weight}kg` : "-"} / {user.age ? `${user.age}세` : "-"} / {user.gender || "-"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">학교</span>
                                <p>{user.schools.length > 0 ? user.schools.join(", ") : "미등록"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">알레르기</span>
                                <p>{user.allergies.length > 0 ? user.allergies.join(", ") : "미등록"}</p>
                              </div>
                            </div>
                            <div className="flex gap-3 pt-1 lg:hidden">
                              <span><ScanLine className="inline h-3 w-3" /> 스캔 {user.scanCount}회</span>
                              <span><MessageSquare className="inline h-3 w-3" /> 게시글 {user.postCount}개</span>
                              <span>가입: {new Date(user.created_at).toLocaleDateString("ko-KR")}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border p-2 hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
            const p = start + i;
            if (p > data.totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  p === page ? "bg-primary text-primary-foreground" : "border hover:bg-muted"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="rounded-lg border p-2 hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 등급 변경 확인 다이얼로그 */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setConfirmDialog(null)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold">등급 변경 확인</h3>
            </div>
            <div className="mb-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{confirmDialog.userName}</strong>님의 등급을 변경합니다.
              </p>
              <div className="flex items-center gap-3">
                <RoleBadge role={confirmDialog.currentRole} />
                <span className="text-muted-foreground">→</span>
                <RoleBadge role={confirmDialog.newRole} />
              </div>
              {confirmDialog.newRole === "super_admin" && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>슈퍼 관리자는 모든 사용자의 등급을 변경할 수 있습니다. 신중하게 부여해주세요.</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRoleChange}
                disabled={changingRole !== null}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {changingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
