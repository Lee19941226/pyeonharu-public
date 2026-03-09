"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  FileSearch,
  ScrollText,
  Shield,
  Regex,
  Server,
  Users,
  Key,
  ChevronDown,
  ChevronUp,
  Monitor,
  ArrowRight,
  Database,
  Globe,
} from "lucide-react";
import PSDashboard from "./PSDashboard";
import PSScanResults from "./PSScanResults";
import PSPolicyManager from "./PSPolicyManager";
import PSDetectionRules from "./PSDetectionRules";
import PSPatternManager from "./PSPatternManager";
import PSDeviceManager from "./PSDeviceManager";
import PSAdminManager from "./PSAdminManager";
import PSLicenseManager from "./PSLicenseManager";

type SubTab =
  | "dashboard"
  | "scanResults"
  | "policies"
  | "rules"
  | "patterns"
  | "devices"
  | "admins"
  | "licenses";

const SUB_TABS: { key: SubTab; label: string; icon: typeof LayoutDashboard }[] =
  [
    { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { key: "scanResults", label: "검사결과", icon: FileSearch },
    { key: "policies", label: "정책 관리", icon: ScrollText },
    { key: "rules", label: "검출 규칙", icon: Shield },
    { key: "patterns", label: "패턴 관리", icon: Regex },
    { key: "devices", label: "장치 관리", icon: Server },
    { key: "admins", label: "관리자", icon: Users },
    { key: "licenses", label: "라이선스", icon: Key },
  ];

export default function PrivacyScanContainer() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("dashboard");
  const [overviewOpen, setOverviewOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <button
          onClick={() => setOverviewOpen(!overviewOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/30">
              <Shield className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">PrivacyScan</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">서버 내 개인식별정보(PII) 검출 및 관리 솔루션</p>
            </div>
          </div>
          {overviewOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {overviewOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            {/* 개요 */}
            <div>
              <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">개요</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                대상 서버에 설치된 Agent가 로그·텍스트 파일을 스캔하여 주민등록번호, 여권번호, 운전면허번호, 외국인등록번호 등 개인식별정보를 정규식으로 검출합니다.
                검출 결과는 이 관리 콘솔로 수집되어 서버별·파일별 현황을 모니터링하고, 정책·규칙·패턴을 중앙에서 관리할 수 있습니다.
              </p>
            </div>

            {/* 아키텍처 다이어그램 */}
            <div>
              <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2.5">작동 구조</h4>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-3">
                {/* Agent */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
                  <Monitor className="h-5 w-5 text-blue-500 mx-auto mb-1.5" />
                  <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200">Agent</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">대상 서버에 설치</p>
                  <div className="mt-2 space-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <p>파일 스캔 실행</p>
                    <p>PII 정규식 검출</p>
                    <p>결과 업로드</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden sm:flex flex-col items-center gap-0.5 text-gray-300 dark:text-gray-600">
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-[9px] text-gray-400">HTTP</span>
                </div>
                <div className="flex sm:hidden justify-center text-gray-300 dark:text-gray-600 rotate-90">
                  <ArrowRight className="h-4 w-4" />
                </div>

                {/* API */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
                  <Globe className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200">편하루 API</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">관리 서버 역할</p>
                  <div className="mt-2 space-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <p>에이전트 등록/하트비트</p>
                    <p>검사결과 수집</p>
                    <p>정책 배포</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden sm:flex flex-col items-center gap-0.5 text-gray-300 dark:text-gray-600">
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-[9px] text-gray-400">SQL</span>
                </div>
                <div className="flex sm:hidden justify-center text-gray-300 dark:text-gray-600 rotate-90">
                  <ArrowRight className="h-4 w-4" />
                </div>

                {/* DB + UI */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
                  <Database className="h-5 w-5 text-violet-500 mx-auto mb-1.5" />
                  <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200">Supabase DB + 관리 콘솔</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">데이터 저장 + 모니터링 UI</p>
                  <div className="mt-2 space-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <p>ps_ 테이블 8개</p>
                    <p>대시보드·검사결과 조회</p>
                    <p>정책·규칙·패턴 관리</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 흐름 */}
            <div>
              <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">작동 흐름</h4>
              <ol className="space-y-1 text-xs text-gray-500 dark:text-gray-400 list-none">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-0.5">1</span>
                  <span><strong className="text-gray-600 dark:text-gray-300">Agent 설치</strong> — 대상 서버에 Agent를 설치하면 자동 등록되고 주기적으로 하트비트 전송</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-0.5">2</span>
                  <span><strong className="text-gray-600 dark:text-gray-300">정책 설정</strong> — 관리 콘솔에서 검사 경로, 스케줄, 적용 규칙을 정책으로 생성하여 Agent에 할당</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-0.5">3</span>
                  <span><strong className="text-gray-600 dark:text-gray-300">검사 실행</strong> — Agent가 정책에 따라 파일을 스캔, 정규식 패턴으로 개인식별정보 검출</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-0.5">4</span>
                  <span><strong className="text-gray-600 dark:text-gray-300">결과 수집</strong> — 검출 결과(서버 집계 + 파일별 상세)를 API로 업로드하여 DB에 저장</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-0.5">5</span>
                  <span><strong className="text-gray-600 dark:text-gray-300">모니터링</strong> — 대시보드에서 검출 현황, 위험 서버 TOP5, 고위험 파일을 실시간 확인</span>
                </li>
              </ol>
            </div>

            {/* 인증 구조 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">관리 콘솔 API 인증</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">편하루 관리자 세션 (verifyAdmin) — 기존 admin/super_admin 계정으로 접근</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Agent API 인증</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">PS_AGENT_API_KEY 환경변수 — Bearer 토큰 방식으로 Agent가 직접 호출</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-tab navigation */}
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-0.5 w-fit">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeSubTab === tab.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <span className="flex items-center gap-1">
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeSubTab === "dashboard" && <PSDashboard />}
      {activeSubTab === "scanResults" && <PSScanResults />}
      {activeSubTab === "policies" && <PSPolicyManager />}
      {activeSubTab === "rules" && <PSDetectionRules />}
      {activeSubTab === "patterns" && <PSPatternManager />}
      {activeSubTab === "devices" && <PSDeviceManager />}
      {activeSubTab === "admins" && <PSAdminManager />}
      {activeSubTab === "licenses" && <PSLicenseManager />}
    </div>
  );
}
