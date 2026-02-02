"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Allergen {
  code: string;
  name: string;
  emoji: string;
  description: string;
}

const ALLERGENS: Allergen[] = [
  {
    code: "milk",
    name: "우유/유제품",
    emoji: "🥛",
    description: "우유, 치즈, 버터, 요구르트",
  },
  {
    code: "egg",
    name: "계란",
    emoji: "🥚",
    description: "계란 및 계란 가공품",
  },
  {
    code: "wheat",
    name: "밀",
    emoji: "🌾",
    description: "밀가루 및 글루텐 함유 제품",
  },
  { code: "peanut", name: "땅콩", emoji: "🥜", description: "땅콩, 땅콩버터" },
  {
    code: "nut",
    name: "견과류",
    emoji: "🌰",
    description: "호두, 아몬드, 캐슈넛",
  },
  {
    code: "shellfish",
    name: "갑각류",
    emoji: "🦐",
    description: "새우, 게, 랍스터 등",
  },
  {
    code: "fish",
    name: "생선",
    emoji: "🐟",
    description: "고등어, 참치, 연어 등",
  },
  { code: "soy", name: "대두", emoji: "🌿", description: "두부, 된장, 간장" },
];

export default function AllergyProfilePage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [severity, setSeverity] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadUserAllergens();
  }, []);

  const loadUserAllergens = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_allergies")
      .select("*")
      .eq("user_id", user.id);

    if (data) {
      const codes = new Set(data.map((item) => item.allergen_code));
      setSelected(codes);

      const severityMap: Record<string, string> = {};
      data.forEach((item) => {
        severityMap[item.allergen_code] = item.severity || "medium";
      });
      setSeverity(severityMap);
    }
  };

  const handleToggle = (code: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(code)) {
      newSelected.delete(code);
      const newSeverity = { ...severity };
      delete newSeverity[code];
      setSeverity(newSeverity);
    } else {
      newSelected.add(code);
      setSeverity({ ...severity, [code]: "medium" });
    }
    setSelected(newSelected);
  };

  const handleSeverityChange = (code: string, value: string) => {
    setSeverity({ ...severity, [code]: value });
  };

  const handleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("알레르기 정보를 저장하려면 로그인해주세요");
      return;
    }

    setIsLoading(true);

    try {
      // 기존 데이터 삭제
      await supabase.from("user_allergies").delete().eq("user_id", user.id);

      // 새 데이터 삽입
      if (selected.size > 0) {
        const insertData = Array.from(selected).map((code) => {
          const allergen = ALLERGENS.find((a) => a.code === code);
          return {
            user_id: user.id,
            allergen_code: code,
            allergen_name: allergen?.name || "",
            severity: severity[code] || "medium",
          };
        });

        await supabase.from("user_allergies").insert(insertData);
      }

      toast.success("알레르기 정보가 저장되었습니다");

      router.push("/food");
    } catch (error) {
      console.error(error);
      toast.error("알레르기 정보 저장 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">내 알레르기 정보</h1>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "저장 중..." : "저장"}
              </Button>
            </div>

            {/* Info Banner */}
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center">
                <div className="mb-2 text-3xl">😊</div>
                <p className="text-sm text-primary">
                  안전한 식사를 위해
                  <br />
                  알레르기 정보를 등록해주세요
                </p>
              </CardContent>
            </Card>

            {/* Allergen List */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold">주요 알레르기 유발 성분</h2>
            </div>

            <div className="space-y-3">
              {ALLERGENS.map((allergen) => {
                const isSelected = selected.has(allergen.code);

                return (
                  <Card
                    key={allergen.code}
                    className={
                      isSelected ? "border-orange-200 bg-orange-50" : ""
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{allergen.emoji}</span>
                          <div>
                            <p className="font-medium">{allergen.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {allergen.description}
                            </p>
                          </div>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(allergen.code)}
                        />
                      </div>

                      {/* Severity Selection */}
                      {isSelected && (
                        <div className="mt-4 border-t pt-4">
                          <p className="mb-2 text-sm font-medium">심각도</p>
                          <RadioGroup
                            value={severity[allergen.code] || "medium"}
                            onValueChange={(value: string) =>
                              handleSeverityChange(allergen.code, value)
                            }
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="high"
                                id={`${allergen.code}-high`}
                              />
                              <Label
                                htmlFor={`${allergen.code}-high`}
                                className="text-sm"
                              >
                                ⚠️ 높음
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="medium"
                                id={`${allergen.code}-medium`}
                              />
                              <Label
                                htmlFor={`${allergen.code}-medium`}
                                className="text-sm"
                              >
                                ○ 중간
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="low"
                                id={`${allergen.code}-low`}
                              />
                              <Label
                                htmlFor={`${allergen.code}-low`}
                                className="text-sm"
                              >
                                ○ 낮음
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
