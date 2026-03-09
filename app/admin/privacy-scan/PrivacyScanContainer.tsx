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

  return (
    <div className="space-y-5">
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
