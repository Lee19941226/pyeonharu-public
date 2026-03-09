"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  X,
  Key,
  Shield,
} from "lucide-react";

interface License {
  id: string;
  license_key: string;
  site_id: string | null;
  license_type: string;
  max_agents: number;
  valid_from: string | null;
  valid_until: string | null;
  issued_by: string | null;
  issued_at: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  license_key: "",
  site_id: "",
  license_type: "trial",
  max_agents: "10",
  valid_from: "",
  valid_until: "",
  issued_by: "",
};

export default function PSLicenseManager() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/privacy-scan/licenses");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.license_key.trim()) { showToast("라이선스 키를 입력해주세요.", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/privacy-scan/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: form.license_key.trim(),
          site_id: form.site_id.trim() || null,
          license_type: form.license_type,
          max_agents: parseInt(form.max_agents) || 10,
          valid_from: form.valid_from || null,
          valid_until: form.valid_until || null,
          issued_by: form.issued_by.trim() || null,
        }),
      });
      if (res.ok) {
        showToast("라이선스가 추가되었습니다.", "success");
        setModal(false);
        setForm(emptyForm);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "저장 실패", "error");
      }
    } catch { showToast("저장 중 오류가 발생했습니다.", "error"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/privacy-scan/licenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast("라이선스가 삭제되었습니다.", "success"); fetchData(); }
    } catch { showToast("삭제 중 오류가 발생했습니다.", "error"); } finally { setDeleteConfirm(null); }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.slice(0, 4) + "****" + key.slice(-4);
  };

  const typeBadge: Record<string, { label: string; cls: string }> = {
    trial: { label: "Trial", cls: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
    standard: { label: "Standard", cls: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400" },
    enterprise: { label: "Enterprise", cls: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400" },
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">라이선스</h3>
        <button onClick={() => { setForm(emptyForm); setModal(true); }} className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          라이선스 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : licenses.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-10 shadow-sm text-center text-sm text-gray-400">
          등록된 라이선스가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {licenses.map((lic) => {
            const t = typeBadge[lic.license_type] || typeBadge.trial;
            return (
              <div key={lic.id} className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/30">
                      <Key className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">{maskKey(lic.license_key)}</p>
                      {lic.site_id && <p className="text-[10px] text-gray-400">{lic.site_id}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.cls}`}>{t.label}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${lic.is_active ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"}`}>
                      {lic.is_active ? "활성" : "만료"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-400">최대 에이전트</span>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{lic.max_agents}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">발급자</span>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">{lic.issued_by || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">유효 시작</span>
                    <p className="text-gray-600 dark:text-gray-300">{lic.valid_from ? new Date(lic.valid_from).toLocaleDateString("ko-KR") : "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">유효 종료</span>
                    <p className="text-gray-600 dark:text-gray-300">{lic.valid_until ? new Date(lic.valid_until).toLocaleDateString("ko-KR") : "-"}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setDeleteConfirm(lic.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                    <Trash2 className="h-3 w-3" />
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => setModal(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">라이선스 추가</h3>
              <button onClick={() => setModal(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <FI label="라이선스 키" value={form.license_key} onChange={(v) => setForm({ ...form, license_key: v })} />
              <FI label="사이트 ID" value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} />
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">라이선스 유형</label>
                <select value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                  <option value="trial">Trial</option>
                  <option value="standard">Standard</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <FI label="최대 에이전트 수" value={form.max_agents} onChange={(v) => setForm({ ...form, max_agents: v })} type="number" />
              <div className="grid grid-cols-2 gap-3">
                <FI label="유효 시작" value={form.valid_from} onChange={(v) => setForm({ ...form, valid_from: v })} type="datetime-local" />
                <FI label="유효 종료" value={form.valid_until} onChange={(v) => setForm({ ...form, valid_until: v })} type="datetime-local" />
              </div>
              <FI label="발급자" value={form.issued_by} onChange={(v) => setForm({ ...form, issued_by: v })} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(false)} className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold py-2.5 px-4">취소</button>
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
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">이 라이선스를 삭제하시겠습니까?</p>
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
