"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, FileCode2, Hash, Clock, PanelLeftClose, PanelLeft, Layers, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileTreeSidebar } from "./file-tree-sidebar";
import { CodeViewer } from "./code-viewer";
import { ArchitectureOverview } from "./architecture-overview";
import type { PortfolioData } from "@/lib/utils/portfolio-scanner";

const STORAGE_KEY = "portfolio_token";

export function PortfolioBrowser() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"source" | "architecture">("source");

  // 토큰으로 데이터 fetch
  useEffect(() => {
    const token = sessionStorage.getItem(STORAGE_KEY);
    if (!token) {
      setError("인증 토큰이 없습니다.");
      setLoading(false);
      return;
    }

    fetch("/api/portfolio/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "데이터를 불러올 수 없습니다.");
        }
        return res.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleNavigateToFile = useCallback((filePath: string) => {
    setActiveTab("source");
    setSelectedFilePath(filePath);
    setSidebarOpen(true);
  }, []);

  const fileMap = useMemo(() => {
    if (!data) return new Map();
    const map = new Map<string, (typeof data.categories)[0]["files"][0]>();
    for (const cat of data.categories) {
      for (const file of cat.files) {
        map.set(file.path, file);
      }
    }
    return map;
  }, [data]);

  const selectedFile = selectedFilePath ? fileMap.get(selectedFilePath) ?? null : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">{error || "데이터를 불러올 수 없습니다."}</p>
      </div>
    );
  }

  const generatedDate = new Date(data.generatedAt);
  const formattedDate = `${generatedDate.getFullYear()}.${String(generatedDate.getMonth() + 1).padStart(2, "0")}.${String(generatedDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm">
          <FileCode2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">총 파일:</span>
          <span className="font-semibold">{data.totalFiles}개</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">총 라인:</span>
          <span className="font-semibold">
            {data.totalLines.toLocaleString()}줄
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">빌드:</span>
          <span className="font-semibold">{formattedDate}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "source" | "architecture")}>
        <TabsList>
          <TabsTrigger value="source">
            <FileCode2 className="h-4 w-4" />
            소스코드
          </TabsTrigger>
          <TabsTrigger value="architecture">
            <Layers className="h-4 w-4" />
            아키텍처
          </TabsTrigger>
        </TabsList>

        <TabsContent value="source">
          <div className="flex gap-4" style={{ height: "calc(100vh - 16rem)" }}>
            {/* Sidebar */}
            <div
              className={`shrink-0 flex flex-col border rounded-lg bg-background overflow-hidden transition-all ${
                sidebarOpen ? "w-72 lg:w-80" : "w-0 border-0"
              }`}
            >
              {sidebarOpen && (
                <>
                  {/* Search */}
                  <div className="border-b p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="파일 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 text-sm"
                      />
                    </div>
                  </div>
                  {/* File tree */}
                  <div className="flex-1 overflow-hidden">
                    <FileTreeSidebar
                      categories={data.categories}
                      selectedFilePath={selectedFilePath}
                      searchQuery={searchQuery}
                      onFileSelect={(path) => {
                        setSelectedFilePath(path);
                        if (window.innerWidth < 768) {
                          setSidebarOpen(false);
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Code viewer area */}
            <div className="flex flex-1 flex-col min-w-0">
              {/* Toggle button */}
              <div className="mb-2 flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {sidebarOpen ? (
                    <>
                      <PanelLeftClose className="h-4 w-4" />
                      <span className="hidden sm:inline">사이드바 닫기</span>
                    </>
                  ) : (
                    <>
                      <PanelLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">사이드바 열기</span>
                    </>
                  )}
                </button>
                {selectedFile && (
                  <span className="truncate text-xs text-muted-foreground">
                    {selectedFile.path}
                  </span>
                )}
              </div>

              {/* Code viewer */}
              <CodeViewer file={selectedFile} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="architecture">
          <ArchitectureOverview onNavigateToFile={handleNavigateToFile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
