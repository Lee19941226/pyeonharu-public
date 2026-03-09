"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FoodImageItem {
  id: string;
  food_code: string;
  food_name: string;
  source_type: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at?: string | null;
  review_note?: string | null;
  preview_url?: string | null;
}

const STATUS_OPTIONS: Array<{ key: "pending" | "approved" | "rejected"; label: string }> = [
  { key: "pending", label: "검토 대기" },
  { key: "approved", label: "승인됨" },
  { key: "rejected", label: "반려됨" },
];

export default function FoodImageManager() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [items, setItems] = useState<FoodImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/food-images?status=${status}&page=1&pageSize=50`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "목록 조회 실패");
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const review = async (id: string, nextStatus: "approved" | "rejected") => {
    const note = window.prompt(
      nextStatus === "rejected" ? "반려 사유를 입력하세요 (선택)" : "검토 메모를 입력하세요 (선택)",
      "",
    );

    setBusyId(id);
    try {
      const res = await fetch("/api/admin/food-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus, note: note || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리 실패");
      await fetchItems();
    } catch (e) {
      console.error(e);
      alert("처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">식품 이미지 승인 관리</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">승인된 이미지만 결과 페이지 대표 이미지로 노출됩니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>
          {loading ? "불러오는 중..." : "새로고침"}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setStatus(opt.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === opt.key
                ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && !loading && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">표시할 이미지가 없습니다.</div>
        )}

        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div className="grid gap-3 md:grid-cols-[140px,1fr,auto] md:items-start">
              <div className="overflow-hidden rounded-lg border bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30">
                {item.preview_url ? (
                  <img src={item.preview_url} alt={`${item.food_name} 이미지`} className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center text-xs text-gray-400">미리보기 없음</div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.food_name}</p>
                  <Badge variant="outline" className="text-[11px]">{item.food_code}</Badge>
                  <Badge variant="secondary" className="text-[11px]">{item.source_type}</Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">등록: {new Date(item.created_at).toLocaleString()}</p>
                {item.reviewed_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">검토: {new Date(item.reviewed_at).toLocaleString()}</p>
                )}
                {item.review_note && <p className="text-xs text-amber-700 dark:text-amber-300">메모: {item.review_note}</p>}
              </div>

              {status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => review(item.id, "approved")}
                    disabled={busyId === item.id}
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => review(item.id, "rejected")}
                    disabled={busyId === item.id}
                  >
                    반려
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
