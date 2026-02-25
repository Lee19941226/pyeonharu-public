"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Users,
  ShieldCheck,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const RELATIONS = ["나", "배우자", "자녀", "부모", "형제/자매", "기타"];
const AVATARS = ["👤", "👦", "👧", "👨", "👩", "👴", "👵", "👶", "🧒", "🧑"];
const SEVERITIES = [
  { value: "low", label: "가벼움", color: "bg-yellow-100 text-yellow-700" },
  { value: "medium", label: "보통", color: "bg-orange-100 text-orange-700" },
  { value: "high", label: "심각", color: "bg-red-100 text-red-700" },
];

// 핵심 알레르기만 (food/profile의 ALLERGENS에서 가져오거나 간소화)
const QUICK_ALLERGENS = [
  { code: "milk", name: "우유", emoji: "🥛" },
  { code: "egg", name: "계란", emoji: "🥚" },
  { code: "wheat", name: "밀", emoji: "🌾" },
  { code: "peanut", name: "땅콩", emoji: "🥜" },
  { code: "soy", name: "대두", emoji: "🫘" },
  { code: "shrimp", name: "새우", emoji: "🦐" },
  { code: "crab", name: "게", emoji: "🦀" },
  { code: "walnut", name: "호두", emoji: "🌰" },
  { code: "pine_nut", name: "잣", emoji: "🌲" },
  { code: "mackerel", name: "고등어", emoji: "🐟" },
  { code: "clam", name: "조개류", emoji: "🦪" },
  { code: "peach", name: "복숭아", emoji: "🍑" },
  { code: "tomato", name: "토마토", emoji: "🍅" },
  { code: "pork", name: "돼지고기", emoji: "🥩" },
  { code: "beef", name: "쇠고기", emoji: "🥩" },
  { code: "chicken", name: "닭고기", emoji: "🍗" },
  { code: "squid", name: "오징어", emoji: "🦑" },
  { code: "shellfish", name: "조개", emoji: "🐚" },
  { code: "sesame", name: "참깨", emoji: "🌿" },
  { code: "sulfite", name: "아황산류", emoji: "⚗️" },
];

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  avatar_emoji: string;
  family_member_allergies: {
    allergen_code: string;
    allergen_name: string;
    severity: string;
  }[];
}

interface MemberForm {
  name: string;
  relation: string;
  avatar_emoji: string;
  allergies: { code: string; name: string; severity: string }[];
}

const DEFAULT_FORM: MemberForm = {
  name: "",
  relation: "자녀",
  avatar_emoji: "👦",
  allergies: [],
};

export default function FamilyPage() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setIsLoading(true);
    const res = await fetch("/api/family");
    const data = await res.json();
    if (data.success) setMembers(data.members);
    else if (res.status === 401) router.push("/login");
    setIsLoading(false);
  };

  const openAdd = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (m: FamilyMember) => {
    setForm({
      name: m.name,
      relation: m.relation,
      avatar_emoji: m.avatar_emoji,
      allergies: m.family_member_allergies.map((a) => ({
        code: a.allergen_code,
        name: a.allergen_name,
        severity: a.severity,
      })),
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const toggleAllergen = (code: string, name: string) => {
    setForm((prev) => {
      const exists = prev.allergies.find((a) => a.code === code);
      if (exists) {
        return {
          ...prev,
          allergies: prev.allergies.filter((a) => a.code !== code),
        };
      }
      return {
        ...prev,
        allergies: [...prev.allergies, { code, name, severity: "medium" }],
      };
    });
  };

  const updateSeverity = (code: string, severity: string) => {
    setForm((prev) => ({
      ...prev,
      allergies: prev.allergies.map((a) =>
        a.code === code ? { ...a, severity } : a,
      ),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("이름을 입력해주세요");
      return;
    }
    setIsSaving(true);
    try {
      const body = { ...form, id: editingId };
      const res = await fetch("/api/family", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "수정 완료!" : "구성원 추가 완료!");
        setShowForm(false);
        loadMembers();
      } else {
        toast.error(data.error || "저장 실패");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name}님을 삭제하시겠습니까?`)) return;
    const res = await fetch("/api/family", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if ((await res.json()).success) {
      toast.success("삭제 완료");
      loadMembers();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto max-w-2xl px-4 py-6">
          {/* 헤더 */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">가족 프로필</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                가족 구성원별 알레르기를 관리하세요
              </p>
            </div>
            <Button onClick={openAdd} size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> 추가
            </Button>
          </div>

          {/* 비어있을 때 */}
          {!isLoading && members.length === 0 && !showForm && (
            <div className="py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3 font-medium text-gray-700">
                아직 가족 구성원이 없어요
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                가족 구성원을 추가하면 각자의 알레르기를 관리할 수 있어요
              </p>
              <Button onClick={openAdd} className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" /> 첫 구성원 추가
              </Button>
            </div>
          )}

          {/* 구성원 목록 */}
          {!showForm && (
            <div className="space-y-3">
              {members.map((m) => (
                <Card key={m.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* 아바타 */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
                        {m.avatar_emoji}
                      </div>

                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{m.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {m.relation}
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {m.family_member_allergies.length === 0 ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-green-500" />
                              등록된 알레르기 없음
                            </span>
                          ) : (
                            m.family_member_allergies.slice(0, 5).map((a) => (
                              <span
                                key={a.allergen_code}
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  a.severity === "high"
                                    ? "bg-red-100 text-red-700"
                                    : a.severity === "medium"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {a.allergen_name}
                              </span>
                            ))
                          )}
                          {m.family_member_allergies.length > 5 && (
                            <span className="text-xs text-muted-foreground">
                              +{m.family_member_allergies.length - 5}개
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 버튼 */}
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(m.id, m.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 추가/수정 폼 */}
          {showForm && (
            <Card>
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">
                    {editingId ? "구성원 수정" : "구성원 추가"}
                  </h2>
                  <button onClick={() => setShowForm(false)}>
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                {/* 아바타 선택 */}
                <div>
                  <p className="mb-2 text-sm font-medium">아바타</p>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() =>
                          setForm((f) => ({ ...f, avatar_emoji: emoji }))
                        }
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all ${
                          form.avatar_emoji === emoji
                            ? "bg-primary/20 ring-2 ring-primary"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 이름 */}
                <div>
                  <p className="mb-2 text-sm font-medium">이름</p>
                  <Input
                    placeholder="예: 민준, 엄마"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    maxLength={10}
                  />
                </div>

                {/* 관계 */}
                <div>
                  <p className="mb-2 text-sm font-medium">관계</p>
                  <div className="flex flex-wrap gap-2">
                    {RELATIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setForm((f) => ({ ...f, relation: r }))}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                          form.relation === r
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-gray-200 bg-white hover:border-primary/50"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 알레르기 선택 */}
                <div>
                  <p className="mb-2 text-sm font-medium">
                    알레르기{" "}
                    {form.allergies.length > 0 && (
                      <span className="text-primary">
                        {form.allergies.length}개 선택됨
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ALLERGENS.map((a) => {
                      const selected = form.allergies.find(
                        (fa) => fa.code === a.code,
                      );
                      return (
                        <button
                          key={a.code}
                          onClick={() => toggleAllergen(a.code, a.name)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                            selected
                              ? "border-red-300 bg-red-50 text-red-700"
                              : "border-gray-200 bg-white hover:border-red-200"
                          }`}
                        >
                          {a.emoji} {a.name}
                          {selected && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 선택된 알레르기 심각도 */}
                {form.allergies.length > 0 && (
                  <div className="rounded-xl bg-gray-50 p-4 space-y-3">
                    <p className="text-sm font-medium">심각도 설정</p>
                    {form.allergies.map((a) => (
                      <div
                        key={a.code}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-sm">{a.name}</span>
                        <div className="flex gap-1.5">
                          {SEVERITIES.map((s) => (
                            <button
                              key={s.value}
                              onClick={() => updateSeverity(a.code, s.value)}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
                                a.severity === s.value
                                  ? s.color + " border-current"
                                  : "border-gray-200 bg-white text-gray-500"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 저장 버튼 */}
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving
                    ? "저장 중..."
                    : editingId
                      ? "수정 완료"
                      : "추가 완료"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
