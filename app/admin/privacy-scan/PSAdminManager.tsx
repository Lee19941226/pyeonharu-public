"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PSAdmin {
  id: string;
  name: string;
  login_id: string;
  department: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  login_id: "",
  department: "",
  email: "",
  role: "viewer",
  is_active: true,
};

export default function PSAdminManager() {
  const [admins, setAdmins] = useState<PSAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const limit = 15;
  const totalPages = Math.ceil(total / limit);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(`/api/admin/privacy-scan/admins?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal("add"); };

  const openEdit = (a: PSAdmin) => {
    setForm({
      name: a.name,
      login_id: a.login_id,
      department: a.department || "",
      email: a.email || "",
      role: a.role,
      is_active: a.is_active,
    });
    setEditId(a.id);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.login_id.trim()) { showToast("이름과 로그인 ID를 입력해주세요.", "error"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        login_id: form.login_id.trim(),
        department: form.department.trim() || null,
        email: form.email.trim() || null,
        role: form.role,
        is_active: form.is_active,
      };
      if (editId) body.id = editId;
      const res = await fetch("/api/admin/privacy-scan/admins", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editId ? "관리자가 수정되었습니다." : "관리자가 추가되었습니다.", "success");
        setModal(null);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "저장 실패", "error");
      }
    } catch { showToast("저장 중 오류가 발생했습니다.", "error"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/privacy-scan/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast("관리자가 삭제되었습니다.", "success"); fetchData(); }
    } catch { showToast("삭제 중 오류가 발생했습니다.", "error"); } finally { setDeleteConfirm(null); }
  };

  const roleLabel: Record<string, string> = { viewer: "뷰어", manager: "매니저", admin: "관리자" };
  const roleBadge: Record<string, string> = {
    viewer: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    manager: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
    admin: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400",
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">PS 관리자</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          관리자 추가
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : admins.length === 0 ? (
          <div className="text-center py-20 text-sm text-gray-400">등록된 관리자가 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">이름</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">로그인ID</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">부서</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden md:table-cell">이메일</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">권한</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">상태</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {admins.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">{a.name}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{a.login_id}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden sm:table-cell">{a.department || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs hidden md:table-cell">{a.email || "-"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge[a.role] || roleBadge.viewer}`}>
                        {roleLabel[a.role] || a.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.is_active ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                        {a.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const s = Math.max(1, Math.min(page - 2, totalPages - 4)); const p = s + i; if (p > totalPages) return null; return (<button key={p} onClick={() => setPage(p)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${page === p ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900" : "border border-gray-200 dark:border-gray-700 text-gray-500"}`}>{p}</button>); })}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{modal === "add" ? "관리자 추가" : "관리자 수정"}</h3>
              <button onClick={() => setModal(null)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <FI label="이름" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <FI label="로그인 ID" value={form.login_id} onChange={(v) => setForm({ ...form, login_id: v })} />
              <FI label="부서" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
              <FI label="이메일" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">권한</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                  <option value="viewer">뷰어</option>
                  <option value="manager">매니저</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">활성</label>
                <button onClick={() => setForm({ ...form, is_active: !form.is_active })} className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)} className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold py-2.5 px-4">취소</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 disabled:opacity-50 flex items-center gap-1.5">
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">이 관리자를 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold py-2.5 px-4">취소</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 px-4">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FI({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
    </div>
  );
}
