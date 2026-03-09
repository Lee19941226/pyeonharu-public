"use client";

import { AlertTriangle, Info, ShieldAlert, ExternalLink } from "lucide-react";
import Link from "next/link";

interface AllergenDisclaimerProps {
  /** 데이터 출처 */
  dataSource?: "openapi" | "ai" | "openfood" | "db" | string;
  /** 위험 결과(알레르기 검출)인지 여부 */
  isDangerous?: boolean;
  /** 상단 고정 배너용 (결과 페이지 최상단) */
  variant?: "banner" | "card" | "inline";
}

/** 데이터 출처별 표시 텍스트 */
const SOURCE_LABEL: Record<string, { label: string; icon: string }> = {
  openapi: { label: "식품의약품안전처 공공 DB", icon: "🏛️" },
  db: { label: "편하루 DB 캐시", icon: "🗄️" },
  openfood: { label: "오픈 커뮤니티 DB", icon: "🌐" },
  ai: { label: "AI 이미지 분석 (비공식)", icon: "🤖" },
};

export function AllergenDisclaimer({
  dataSource = "openapi",
  isDangerous = false,
  variant = "card",
}: AllergenDisclaimerProps) {
  const source = SOURCE_LABEL[dataSource] ?? SOURCE_LABEL["openapi"];
  const isAI = dataSource === "ai";
  const isCommunity = dataSource === "openfood";
  const isInline = variant === "inline";

  // ── 상단 배너 (AI 결과 전용 경고) ──
  if (variant === "banner") {
    return (
      <div
        className={`w-full px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${
          isAI
            ? "bg-amber-50 border-b border-amber-200 text-amber-800"
            : "bg-blue-50 border-b border-blue-200 text-blue-800"
        }`}
      >
        {isAI ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        ) : (
          <Info className="h-4 w-4 shrink-0 text-blue-500" />
        )}
        <span>
          {source.icon} 출처: <strong>{source.label}</strong>
          {isAI &&
            " — AI 분석 결과는 참고용이며 실제 성분표를 반드시 확인하세요"}
          {isCommunity && " — 커뮤니티 데이터로 부정확할 수 있습니다"}
        </span>
      </div>
    );
  }

  // ── 하단 카드 (공통 면책 문구) ──
  return (
    <div
      className={`text-sm space-y-3 ${
        isInline
          ? "mt-3 border-t border-amber-200 pt-3"
          : `rounded-xl border p-4 ${isDangerous ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`
      }`}
    >
      {/* ── 주요 면책 ── */}
      <div className="flex items-start gap-2.5">
        <ShieldAlert
          className={`h-5 w-5 shrink-0 mt-0.5 ${
            isDangerous ? "text-red-500" : "text-gray-400"
          }`}
        />
        <div className="space-y-1.5">
          <p className="font-semibold text-gray-800">
            ⚠️ 이 정보는 의료적 판단을 대체하지 않습니다
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            편하루의 알레르기 정보는 참고용입니다.{" "}
            <strong className="text-gray-800">
              구매 전 반드시 제품 포장지의 원재료 및 알레르기 표시를 직접 확인
            </strong>
            하세요. 알레르기 반응은 개인마다 다르며, 본 서비스는 알레르기 사고에
            대한 법적 책임을 지지 않습니다.
          </p>

          {/* AI 전용 추가 경고 */}
          {isAI && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 mt-2">
              <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                AI 분석 결과 주의사항
              </p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                이 결과는 이미지를 AI가 분석한 것으로, 실제 식약처 공식 데이터와
                다를 수 있습니다. 특히 알레르기가 있으신 분은{" "}
                <strong>반드시 실물 제품의 성분표를 확인</strong>하거나 바코드
                스캔으로 공식 정보를 조회하세요.
              </p>
            </div>
          )}

          {/* 커뮤니티 데이터 추가 경고 */}
          {isCommunity && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 mt-2">
              <p className="text-xs text-blue-800 leading-relaxed">
                🌐 이 정보는 오픈 커뮤니티 데이터베이스(OpenFoodFacts)에서
                제공되며, 공식 인증 데이터가 아닙니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 데이터 출처 + 링크 ── */}
      <div
        className={`flex items-center justify-between pt-1 ${
          isInline ? "border-t border-amber-200" : "border-t border-gray-200"
        }`}
      >
        <span className="text-xs text-gray-500">
          {source.icon} 데이터 출처: {source.label}
        </span>
        <Link
          href="https://www.foodsafetykorea.go.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          식품안전나라 바로가기
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
