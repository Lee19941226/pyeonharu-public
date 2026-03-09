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

interface Rule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  file_extensions: string[];
  check_metadata: boolean;
  pattern_ids: string[];
  min_sensitive_count: number;
  max_sensitive_count: number | null;
  created_at: string;
}

const emptyForm = {
  name: "",
  description: "",
  is_active: true,
  file_extensions: [] as string[],
  check_metadata: false,
  pattern_ids: "",
  min_sensitive_count: "1",
  max_sensitive_count: "",
};

export default function PSDetectionRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [extInput, setExtInput] = useState("");
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
      const res = await fetch(`/api/admin/privacy-scan/rules?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setExtInput("");
    setModal("add");
  };

  const openEdit = (r: Rule) => {
    setForm({
      name: r.name,
      description: r.description || "",
      is_active: r.is_active,
      file_extensions: r.file_extensions || [],
      check_metadata: r.check_metadata,
      pattern_ids: (r.pattern_ids || []).join(", "),
      min_sensitive_count: String(r.min_sensitive_count),
      max_sensitive_count: r.max_sensitive_count != null ? String(r.max_sensitive_count) : "",
    });
    setEditId(r.id);
    setExtInput("");
    setModal("edit");
  };

  const addExtension = () => {
    const val = extInput.trim();
    if (!val) return;
    const ext = val.startsWith(".") ? val : `.${val}`;
    if (!form.file_extensions.includes(ext)) {
      setForm({ ...form, file_extensions: [...form.file_extensions, ext] });
    }
    setExtInput("");
  };

  const removeExtension = (ext: string) => {
    setForm({ ...form, file_extensions: form.file_extensions.filter((e) => e !== ext) });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("이름을 입력해주세요.", "error"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        file_extensions: form.file_extensions,
        check_metadata: form.check_metadata,
        pattern_ids: form.pattern_ids.split(",").map((s) => s.trim()).filter(Boolean),
        min_sensitive_count: parseInt(form.min_sensitive_count) || 1,
        max_sensitive_count: form.max_sensitive_count ? parseInt(form.max_sensitive_count) : null,
      };
      if (editId) body.id = editId;

      const res = await fetch("/api/admin/privacy-scan/rules", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editId ? "규칙이 수정되었습니다." : "규칙이 추가되었습니다.", "success");
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
      const res = await fetch("/api/admin/privacy-scan/rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast("규칙이 삭제되었습니다.", "success"); fetchData(); }
    } catch { showToast("삭제 중 오류가 발생했습니다.", "error"); } finally { setDeleteConfirm(null); }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">검출 규칙</h3>
        <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          규칙 추가
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20 text-sm text-gray-400">등록된 규칙이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">이름</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden md:table-cell">파일확장자</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">메타데이터</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">패턴수</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">민감정보 범위</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">상태</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">{r.name}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(r.file_extensions || []).map((ext, j) => (
                          <span key={j} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{ext}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">{r.check_metadata ? "O" : "-"}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500">{(r.pattern_ids || []).length}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500 hidden sm:table-cell">{r.min_sensitive_count}~{r.max_sensitive_count ?? "∞"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.is_active ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                        {r.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="mx-4 w-full max-w-lg max-h-[80vh] overflow-auto rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{modal === "add" ? "규칙 추가" : "규칙 수정"}</h3>
              <button onClick={() => setModal(null)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <FieldInput label="이름" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <FieldInput label="설명" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">활성</label>
                  <button onClick={() => setForm({ ...form, is_active: !form.is_active })} className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? "translate-x-5" : ""}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">메타데이터 검사</label>
                  <button onClick={() => setForm({ ...form, check_metadata: !form.check_metadata })} className={`relative w-10 h-5 rounded-full transition-colors ${form.check_metadata ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.check_metadata ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              </div>
              {/* Tag input for file extensions */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">파일 확장자</label>
                <div className="mt-1 flex flex-wrap gap-1.5 mb-2">
                  {form.file_extensions.map((ext) => (
                    <span key={ext} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[11px] font-medium">
                      {ext}
                      <button onClick={() => removeExtension(ext)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={extInput}
                    onChange={(e) => setExtInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtension(); } }}
                    placeholder=".log, .txt 등"
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button onClick={addExtension} className="rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-700">추가</button>
                </div>
              </div>
              <FieldInput label="패턴 ID (쉼표 구분)" value={form.pattern_ids} onChange={(v) => setForm({ ...form, pattern_ids: v })} />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="최소 민감정보 수" value={form.min_sensitive_count} onChange={(v) => setForm({ ...form, min_sensitive_count: v })} type="number" />
                <FieldInput label="최대 민감정보 수" value={form.max_sensitive_count} onChange={(v) => setForm({ ...form, max_sensitive_count: v })} type="number" placeholder="무제한" />
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
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">이 규칙을 삭제하시겠습니까?</p>
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

function FieldInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
    </div>
  );
}
