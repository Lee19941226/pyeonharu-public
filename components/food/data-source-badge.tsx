"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type DataSource = "openapi" | "db" | "openfood" | "ai" | string;

interface DataSourceConfig {
  label: string;
  icon: string;
  description: string;
  className: string; // badge 색상
}

const SOURCE_CONFIG: Record<string, DataSourceConfig> = {
  openapi: {
    label: "식약처 공식",
    icon: "🏛️",
    description: "식품의약품안전처 공공 데이터 기반 공식 정보입니다",
    className: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  db: {
    label: "DB 캐시",
    icon: "🗄️",
    description: "편하루 DB에 저장된 식약처 기반 데이터입니다",
    className: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
  },
  openfood: {
    label: "수입식품",
    icon: "🌍",
    description:
      "오픈 커뮤니티(OpenFoodFacts) 데이터입니다. 부정확할 수 있어요",
    className:
      "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100",
  },
  ai: {
    label: "AI 분석",
    icon: "🤖",
    description:
      "AI가 이미지/텍스트를 분석한 추정 정보입니다. 공식 데이터가 아닙니다",
    className: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
};

const FALLBACK_CONFIG: DataSourceConfig = {
  label: "정보 없음",
  icon: "❓",
  description: "데이터 출처를 확인할 수 없습니다",
  className: "border-gray-300 bg-gray-50 text-gray-600",
};

interface DataSourceBadgeProps {
  source: DataSource | undefined;
  /** 크기 변형 */
  size?: "sm" | "md";
  /** 툴팁 비활성화 (목록 등 반복 렌더링 시) */
  withTooltip?: boolean;
  /** 업데이트 날짜 표시 */
  updatedAt?: string;
}

export function DataSourceBadge({
  source,
  size = "sm",
  withTooltip = true,
  updatedAt,
}: DataSourceBadgeProps) {
  const config = SOURCE_CONFIG[source ?? ""] ?? FALLBACK_CONFIG;

  const badge = (
    <Badge
      variant="outline"
      className={`shrink-0 cursor-default font-normal ${config.className} ${
        size === "md" ? "text-sm px-2.5 py-0.5" : "text-xs px-1.5 py-0"
      }`}
    >
      {config.icon} {config.label}
    </Badge>
  );

  if (!withTooltip) return badge;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
          <p>{config.description}</p>
          {updatedAt && (
            <p className="mt-1 text-muted-foreground">업데이트: {updatedAt}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
