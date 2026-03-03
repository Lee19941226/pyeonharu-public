"use client";

import { useState, useMemo } from "react";
import { Search, FileCode2, Hash, Clock, PanelLeftClose, PanelLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FileTreeSidebar } from "./file-tree-sidebar";
import { CodeViewer } from "./code-viewer";
import type { PortfolioData } from "@/lib/utils/portfolio-scanner";

interface PortfolioBrowserProps {
  data: PortfolioData;
}

export function PortfolioBrowser({ data }: PortfolioBrowserProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fileMap = useMemo(() => {
    const map = new Map<string, (typeof data.categories)[0]["files"][0]>();
    for (const cat of data.categories) {
      for (const file of cat.files) {
        map.set(file.path, file);
      }
    }
    return map;
  }, [data.categories]);

  const selectedFile = selectedFilePath ? fileMap.get(selectedFilePath) ?? null : null;

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

      {/* Main layout */}
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
                    // on mobile, auto-close sidebar
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
    </div>
  );
}
