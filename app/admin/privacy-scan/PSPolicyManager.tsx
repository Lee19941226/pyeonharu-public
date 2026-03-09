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
  Info,
} from "lucide-react";

interface Policy {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  scan_paths: string[];
  exclude_paths: string[];
  schedule_cron: string | null;
  schedule_description: string | null;
  rule_ids: string[];
  created_by: string | null;
  created_at: string;
}

const emptyForm = {
  name: "",
  description: "",
  is_active: true,
  valid_from: "",
  valid_until: "",
  scan_paths: "",
  exclude_paths: "",
  schedule_cron: "",
  schedule_description: "",
  rule_ids: "",
};

export default function PSPolicyManager() {
  const [policies, setPolicies] = useState<Policy[]>([]);
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
      const res = await fetch(`/api/admin/privacy-scan/policies?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setModal("add");
  };

  const openEdit = (p: Policy) => {
    setForm({
      name: p.name,
      description: p.description || "",
      is_active: p.is_active,
      valid_from: p.valid_from ? p.valid_from.slice(0, 16) : "",
      valid_until: p.valid_until ? p.valid_until.slice(0, 16) : "",
      scan_paths: (p.scan_paths || []).join("\n"),
      exclude_paths: (p.exclude_paths || []).join("\n"),
      schedule_cron: p.schedule_cron || "",
      schedule_description: p.schedule_description || "",
      rule_ids: (p.rule_ids || []).join(", "),
    });
    setEditId(p.id);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("이름을 입력해주세요.", "error"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        scan_paths: form.scan_paths.split("\n").map((s) => s.trim()).filter(Boolean),
        exclude_paths: form.exclude_paths.split("\n").map((s) => s.trim()).filter(Boolean),
        schedule_cron: form.schedule_cron.trim() || null,
        schedule_description: form.schedule_description.trim() || null,
        rule_ids: form.rule_ids.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (editId) body.id = editId;

      const res = await fetch("/api/admin/privacy-scan/policies", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editId ? "정책이 수정되었습니다." : "정책이 추가되었습니다.", "success");
        setModal(null);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "저장 실패", "error");
      }
    } catch {
      showToast("저장 중 오류가 발생했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/privacy-scan/policies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast("정책이 삭제되었습니다.", "success");
        fetchData();
      }
    } catch {
      showToast("삭제 중 오류가 발생했습니다.", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Guide */}
      <div className="flex items-start gap-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">검사 대상 경로, 스케줄, 적용 규칙 등을 정책 단위로 관리</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">정책을 생성하여 검사 경로, 예외 경로, 검사 스케줄, 적용할 검출 규칙을 설정하세요. 정책은 에이전트에 할당하여 사용합니다.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">정책 관리</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          정책 추가
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-20 text-sm text-gray-400">등록된 정책이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">이름</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden md:table-cell">설명</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">상태</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden lg:table-cell">스케줄</th>
                  <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">생성일</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">{p.name}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs hidden md:table-cell max-w-[200px] truncate">{p.description || "-"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.is_active
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      }`}>
                        {p.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs hidden lg:table-cell">{p.schedule_description || p.schedule_cron || "-"}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400 text-xs hidden sm:table-cell">{new Date(p.created_at).toLocaleDateString("ko-KR")}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-600">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${page === p ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900" : "border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="mx-4 w-full max-w-lg max-h-[80vh] overflow-auto rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{modal === "add" ? "정책 추가" : "정책 수정"}</h3>
              <button onClick={() => setModal(null)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <Field label="이름" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="설명" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">활성</label>
                <button onClick={() => setForm({ ...form, is_active: !form.is_active })} className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="유효 시작" value={form.valid_from} onChange={(v) => setForm({ ...form, valid_from: v })} type="datetime-local" />
                <Field label="유효 종료" value={form.valid_until} onChange={(v) => setForm({ ...form, valid_until: v })} type="datetime-local" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">검사 경로 (줄바꿈 구분)</label>
                <textarea value={form.scan_paths} onChange={(e) => setForm({ ...form, scan_paths: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">예외 경로 (줄바꿈 구분)</label>
                <textarea value={form.exclude_paths} onChange={(e) => setForm({ ...form, exclude_paths: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="스케줄 Cron" value={form.schedule_cron} onChange={(v) => setForm({ ...form, schedule_cron: v })} placeholder="0 2 * * *" />
                <Field label="스케줄 설명" value={form.schedule_description} onChange={(v) => setForm({ ...form, schedule_description: v })} placeholder="매일 새벽 2시" />
              </div>
              <Field label="규칙 ID (쉼표 구분)" value={form.rule_ids} onChange={(v) => setForm({ ...form, rule_ids: v })} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)} className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold py-2.5 px-4 hover:bg-gray-50 dark:hover:bg-gray-800">취소</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 disabled:opacity-50 flex items-center gap-1.5">
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">이 정책을 삭제하시겠습니까?</p>
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

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
    </div>
  );
}
