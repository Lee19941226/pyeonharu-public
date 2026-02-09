"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailedAllergenInfo } from "@/lib/allergen-info";
import {
  AlertTriangle,
  Activity,
  GitMerge,
  UtensilsCrossed,
  Eye,
  Shield,
  Siren,
  TrendingUp,
  Stethoscope,
  Info,
} from "lucide-react";

interface AllergenDetailModalProps {
  allergen: DetailedAllergenInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllergenDetailModal({
  allergen,
  open,
  onOpenChange,
}: AllergenDetailModalProps) {
  if (!allergen) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <span className="text-4xl">{allergen.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                {allergen.name}
                <Badge
                  variant={
                    allergen.severity === "high"
                      ? "destructive"
                      : allergen.severity === "medium"
                        ? "default"
                        : "secondary"
                  }
                >
                  {allergen.severity === "high"
                    ? "⚠️ 위험"
                    : allergen.severity === "medium"
                      ? "주의"
                      : "낮음"}
                </Badge>
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                {allergen.scientificName}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 개요 */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-sm text-blue-900">{allergen.description}</p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="symptoms" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="symptoms">증상</TabsTrigger>
              <TabsTrigger value="foods">식품</TabsTrigger>
              <TabsTrigger value="management">관리</TabsTrigger>
              <TabsTrigger value="emergency">응급</TabsTrigger>
            </TabsList>

            {/* 증상 탭 */}
            <TabsContent value="symptoms" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Activity className="h-4 w-4" />
                    증상 단계별
                  </h3>

                  <div className="space-y-4">
                    {/* 경미한 증상 */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <p className="font-medium">경미한 증상</p>
                      </div>
                      <div className="ml-5 flex flex-wrap gap-2">
                        {allergen.symptoms.mild.map((symptom, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-green-50"
                          >
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 중간 증상 */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-orange-500" />
                        <p className="font-medium">중간 증상</p>
                      </div>
                      <div className="ml-5 flex flex-wrap gap-2">
                        {allergen.symptoms.moderate.map((symptom, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-orange-50"
                          >
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 심각한 증상 */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <p className="font-medium">⚠️ 심각한 증상 (응급상황)</p>
                      </div>
                      <div className="ml-5 flex flex-wrap gap-2">
                        {allergen.symptoms.severe.map((symptom, idx) => (
                          <Badge
                            key={idx}
                            variant="destructive"
                            className="bg-red-100"
                          >
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 교차반응 */}
              {allergen.crossReactivity.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <GitMerge className="h-4 w-4" />
                      교차반응 가능 식품
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                      이 알레르기가 있으면 아래 식품에도 반응할 수 있습니다
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allergen.crossReactivity.map((item, idx) => (
                        <Badge key={idx} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 통계 */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      발생률
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {allergen.prevalence}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Stethoscope className="h-4 w-4" />
                      예후
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {allergen.prognosis}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 식품 탭 */}
            <TabsContent value="foods" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <UtensilsCrossed className="h-4 w-4" />
                    흔히 들어있는 음식
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allergen.commonFoods.map((food, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-orange-50"
                      >
                        {food}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-amber-900">
                    <Eye className="h-4 w-4" />
                    숨은 재료 주의!
                  </h3>
                  <p className="mb-3 text-sm text-amber-800">
                    성분표에서 이런 이름으로 표시됩니다
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allergen.hiddenSources.map((source, idx) => (
                      <Badge key={idx} className="bg-amber-100 text-amber-900">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 관리 탭 */}
            <TabsContent value="management" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Shield className="h-4 w-4" />
                    일상 관리 방법
                  </h3>
                  <ul className="space-y-2">
                    {allergen.management.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 text-primary">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-900">
                    <Stethoscope className="h-4 w-4" />
                    진단 방법
                  </h3>
                  <p className="text-sm text-blue-800">{allergen.diagnosis}</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 응급 탭 */}
            <TabsContent value="emergency" className="space-y-4">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-900">
                    <AlertTriangle className="h-5 w-5" />
                    응급 상황 징후
                  </h3>
                  <p className="mb-3 text-sm text-red-800">
                    다음 증상이 나타나면 즉시 응급 조치가 필요합니다
                  </p>
                  <ul className="space-y-2">
                    {allergen.emergencyInfo.signs.map((sign, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-red-900"
                      >
                        <span className="text-red-600">⚠️</span>
                        <span className="font-medium">{sign}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-300 bg-red-100">
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-900">
                    <Siren className="h-5 w-5" />
                    응급 대처 방법
                  </h3>
                  <ol className="space-y-3">
                    {allergen.emergencyInfo.actions.map((action, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-red-900"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{action}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-medium text-orange-900">
                    💡 에피네프린 자가주사기는 허벅지 바깥쪽에 주사합니다
                  </p>
                  <p className="mt-1 text-xs text-orange-700">
                    옷 위로 주사해도 됩니다. 망설이지 마세요!
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
