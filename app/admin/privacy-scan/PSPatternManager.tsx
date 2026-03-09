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
  Play,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";

interface Pattern {
  id: string;
  name: string;
  description: string | null;
  pattern_type: "default" | "custom";
  is_active: boolean;
  regex_pattern: string;
  regex_string: string | null;
  exclude_regex: string | null;
  exclude_string: string | null;
  validation_module: string | null;
  masking_start: number;
  masking_end: number;
  masking_char: string;
  created_at: string;
}

const emptyForm = {
  name: "",
  description: "",
  regex_pattern: "",
  regex_string: "",
  exclude_regex: "",
  exclude_string: "",
  validation_module: "",
  masking_start: "0",
  masking_end: "0",
  masking_char: "*",
  is_active: true,
};

export default function PSPatternManager() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [patternTab, setPatternTab] = useState<"default" | "custom">("default");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState<"default" | "custom">("custom");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{ match: boolean; matches: string[] } | null>(null);
  const limit = 15;
  const totalPages = Math.ceil(total / limit);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), pattern_type: patternTab });
      const res = await fetch(`/api/admin/privacy-scan/patterns?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPatterns(data.patterns || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, patternTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setEditType("custom");
    setTestInput("");
    setTestResult(null);
    setModal("add");
  };

  const openEdit = (p: Pattern) => {
    setForm({
      name: p.name,
      description: p.description || "",
      regex_pattern: p.regex_pattern,
      regex_string: p.regex_string || "",
      exclude_regex: p.exclude_regex || "",
      exclude_string: p.exclude_string || "",
      validation_module: p.validation_module || "",
      masking_start: String(p.masking_start),
      masking_end: String(p.masking_end),
      masking_char: p.masking_char,
      is_active: p.is_active,
    });
    setEditId(p.id);
    setEditType(p.pattern_type);
    setTestInput("");
    setTestResult(null);
    setModal("edit");
  };

  const runTest = () => {
    if (!form.regex_pattern || !testInput) return;
    try {
      const re = new RegExp(form.regex_pattern, "g");
      const matches = testInput.match(re);
      setTestResult({ match: !!matches, matches: matches || [] });
    } catch {
      showToast("정규식이 유효하지 않습니다.", "error");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.regex_pattern.trim()) {
      showToast("이름과 정규식을 입력해주세요.", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        regex_pattern: form.regex_pattern.trim(),
        regex_string: form.regex_string.trim() || null,
        exclude_regex: form.exclude_regex.trim() || null,
        exclude_string: form.exclude_string.trim() || null,
        validation_module: form.validation_module.trim() || null,
        masking_start: parseInt(form.masking_start) || 0,
        masking_end: parseInt(form.masking_end) || 0,
        masking_char: form.masking_char || "*",
        is_active: form.is_active,
      };
      if (editId) body.id = editId;

      const res = await fetch("/api/admin/privacy-scan/patterns", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(editId ? "패턴이 수정되었습니다." : "패턴이 추가되었습니다.", "success");
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
      const res = await fetch("/api/admin/privacy-scan/patterns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { showToast("패턴이 삭제되었습니다.", "success"); fetchData(); }
      else {
        const err = await res.json();
        showToast(err.error || "삭제 실패", "error");
      }
    } catch { showToast("삭제 중 오류가 발생했습니다.", "error"); } finally { setDeleteConfirm(null); }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
          {toast.message}
        </div>
      )}

      {/* Guide */}
      <div className="flex items-start gap-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">개인식별정보를 검출하는 정규식 패턴을 관리 (기본 4대 식별정보 + 사용자 정의)</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {patternTab === "default"
              ? "주민등록번호, 운전면허번호, 여권번호, 외국인등록번호 4대 기본 패턴이 제공됩니다. 정규식과 마스킹 범위를 수정할 수 있지만 삭제는 불가합니다."
              : "기본 패턴 외에 추가로 검출할 개인정보 패턴을 직접 정의할 수 있습니다. (예: 신용카드번호, 계좌번호, 이메일 등)"}
          </p>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-0.5">
          {(["default", "custom"] as const).map((t) => (
            <button key={t} onClick={() => { setPatternTab(t); setPage(1); }} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${patternTab === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "default" ? "기본 정규식" : "사용자 정규식"}
            </button>
          ))}
        </div>
        {patternTab === "custom" && (
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            패턴 추가
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : patterns.length === 0 ? (
          <div className="text-center py-20 text-sm text-gray-400">등록된 패턴이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">이름</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden md:table-cell">정규식</th>
                  <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500 hidden sm:table-cell">검증모듈</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">마스킹</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">상태</th>
                  <th className="text-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {patterns.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">{p.name}</td>
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-[11px] hidden md:table-cell max-w-[200px] truncate">{p.regex_pattern}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden sm:table-cell">{p.validation_module || "-"}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{p.masking_start}~{p.masking_end}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.is_active ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                        {p.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                        {p.pattern_type === "custom" && (
                          <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        )}
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
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{modal === "add" ? "패턴 추가" : "패턴 수정"}</h3>
              <button onClick={() => setModal(null)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <FI label="이름" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <FI label="설명" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
              <FI label="정규식 패턴" value={form.regex_pattern} onChange={(v) => setForm({ ...form, regex_pattern: v })} placeholder="\\d{6}[-]?\\d{7}" />
              <FI label="정규식 문자열" value={form.regex_string} onChange={(v) => setForm({ ...form, regex_string: v })} />
              <div className="grid grid-cols-2 gap-3">
                <FI label="제외 정규식" value={form.exclude_regex} onChange={(v) => setForm({ ...form, exclude_regex: v })} />
                <FI label="제외 문자열" value={form.exclude_string} onChange={(v) => setForm({ ...form, exclude_string: v })} />
              </div>
              <FI label="검증 모듈" value={form.validation_module} onChange={(v) => setForm({ ...form, validation_module: v })} placeholder="resident_number" />
              <div className="grid grid-cols-3 gap-3">
                <FI label="마스킹 시작" value={form.masking_start} onChange={(v) => setForm({ ...form, masking_start: v })} type="number" />
                <FI label="마스킹 끝" value={form.masking_end} onChange={(v) => setForm({ ...form, masking_end: v })} type="number" />
                <FI label="마스킹 문자" value={form.masking_char} onChange={(v) => setForm({ ...form, masking_char: v })} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">활성</label>
                <button onClick={() => setForm({ ...form, is_active: !form.is_active })} className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {/* Regex test */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">정규식 테스트</label>
                <div className="flex gap-2 mt-1">
                  <input
                    value={testInput}
                    onChange={(e) => { setTestInput(e.target.value); setTestResult(null); }}
                    placeholder="테스트 문자열 입력"
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button onClick={runTest} className="flex items-center gap-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-2">
                    <Play className="h-3 w-3" />
                    테스트
                  </button>
                </div>
                {testResult && (
                  <div className={`mt-2 px-3 py-2 rounded-xl text-xs ${testResult.match ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"}`}>
                    <div className="flex items-center gap-1 font-semibold">
                      {testResult.match ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {testResult.match ? `${testResult.matches.length}건 매치` : "매치 없음"}
                    </div>
                    {testResult.matches.length > 0 && (
                      <div className="mt-1 font-mono">{testResult.matches.join(", ")}</div>
                    )}
                  </div>
                )}
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
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">이 패턴을 삭제하시겠습니까?</p>
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

function FI({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
    </div>
  );
}
