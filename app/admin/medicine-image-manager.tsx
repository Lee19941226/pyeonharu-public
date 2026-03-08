"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Save, Trash2, Image as ImageIcon } from "lucide-react";

type OverrideRow = {
  key: string;
  imageUrl: string;
};

type OverridesPayload = {
  byItemSeq: Record<string, string>;
  byItemName: Record<string, string>;
};

const EMPTY_PAYLOAD: OverridesPayload = {
  byItemSeq: {},
  byItemName: {},
};

function toRows(record: Record<string, string>): OverrideRow[] {
  return Object.entries(record).map(([key, imageUrl]) => ({ key, imageUrl }));
}

function toRecord(rows: OverrideRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    const v = row.imageUrl.trim();
    if (!k || !v) continue;
    out[k] = v;
  }
  return out;
}

export default function MedicineImageManager() {
  const [seqRows, setSeqRows] = useState<OverrideRow[]>([]);
  const [nameRows, setNameRows] = useState<OverrideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/site-settings?key=medicine_image_overrides", { cache: "no-store" });
        if (!res.ok) {
          setSeqRows([]);
          setNameRows([]);
          return;
        }

        const setting = await res.json();
        const value = (setting?.value || {}) as Partial<OverridesPayload>;
        setSeqRows(toRows(value.byItemSeq || {}));
        setNameRows(toRows(value.byItemName || {}));
      } catch {
        setError("설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const payload = useMemo<OverridesPayload>(() => {
    return {
      byItemSeq: toRecord(seqRows),
      byItemName: toRecord(nameRows),
    };
  }, [seqRows, nameRows]);

  const validateRows = (rows: OverrideRow[]) => {
    for (const row of rows) {
      if (!row.key.trim() && !row.imageUrl.trim()) continue;
      if (!row.key.trim() || !row.imageUrl.trim()) {
        return "키와 이미지 URL을 모두 입력해야 합니다.";
      }
      if (!/^https?:\/\//i.test(row.imageUrl.trim()) && !/^\/\//.test(row.imageUrl.trim())) {
        return "이미지 URL은 http(s):// 또는 // 로 시작해야 합니다.";
      }
    }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    const seqErr = validateRows(seqRows);
    const nameErr = validateRows(nameRows);
    if (seqErr || nameErr) {
      setError(seqErr || nameErr);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "medicine_image_overrides", value: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다. 약 검색 API에 최대 5분 내 반영됩니다.");
    } catch {
      setError("저장 중 네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (
    rows: OverrideRow[],
    setRows: Dispatch<SetStateAction<OverrideRow[]>>,
    index: number,
    patch: Partial<OverrideRow>,
  ) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (
    rows: OverrideRow[],
    setRows: Dispatch<SetStateAction<OverrideRow[]>>,
    index: number,
  ) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const addRow = (setRows: Dispatch<SetStateAction<OverrideRow[]>>) => {
    setRows((prev) => [...prev, { key: "", imageUrl: "" }]);
  };

  return (
    <Card className="border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          약 이미지 매핑 관리자
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          공공 API에 이미지가 없는 약을 itemSeq 또는 품목명으로 직접 매핑합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            설정 불러오는 중...
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">itemSeq 매핑</h4>
                <Button size="sm" variant="outline" onClick={() => addRow(setSeqRows)}>
                  <Plus className="h-3 w-3 mr-1" />
                  추가
                </Button>
              </div>
              <div className="space-y-2">
                {seqRows.map((row, i) => (
                  <div key={`seq-${i}`} className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2">
                    <Input
                      placeholder="itemSeq (예: 200808876)"
                      value={row.key}
                      onChange={(e) => updateRow(seqRows, setSeqRows, i, { key: e.target.value })}
                    />
                    <Input
                      placeholder="https://..."
                      value={row.imageUrl}
                      onChange={(e) => updateRow(seqRows, setSeqRows, i, { imageUrl: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeRow(seqRows, setSeqRows, i)}
                      aria-label="행 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {seqRows.length === 0 && (
                  <p className="text-xs text-muted-foreground">등록된 itemSeq 매핑이 없습니다.</p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">품목명 매핑</h4>
                <Button size="sm" variant="outline" onClick={() => addRow(setNameRows)}>
                  <Plus className="h-3 w-3 mr-1" />
                  추가
                </Button>
              </div>
              <div className="space-y-2">
                {nameRows.map((row, i) => (
                  <div key={`name-${i}`} className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2">
                    <Input
                      placeholder="품목명 (예: 타이레놀정500밀리그램)"
                      value={row.key}
                      onChange={(e) => updateRow(nameRows, setNameRows, i, { key: e.target.value })}
                    />
                    <Input
                      placeholder="https://..."
                      value={row.imageUrl}
                      onChange={(e) => updateRow(nameRows, setNameRows, i, { imageUrl: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeRow(nameRows, setNameRows, i)}
                      aria-label="행 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {nameRows.length === 0 && (
                  <p className="text-xs text-muted-foreground">등록된 품목명 매핑이 없습니다.</p>
                )}
              </div>
            </section>

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                저장
              </Button>
              {message && <span className="text-xs text-emerald-600">{message}</span>}
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

