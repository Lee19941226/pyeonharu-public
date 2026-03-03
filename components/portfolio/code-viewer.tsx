"use client";

import { useState } from "react";
import { Copy, Check, FileCode2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PortfolioFile } from "@/lib/utils/portfolio-scanner";

interface CodeViewerProps {
  file: PortfolioFile | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function CodeViewer({ file }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!file) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
        <FileCode2 className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            파일을 선택하세요
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            왼쪽 사이드바에서 카테고리를 열고 파일을 클릭하면 소스코드를 볼 수
            있습니다
          </p>
        </div>
      </div>
    );
  }

  const lines = file.content.split("\n");

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
      {/* File header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{file.path}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge variant="secondary" className="text-[10px]">
            {file.language}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {file.lineCount}줄 · {formatSize(file.size)}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="클립보드에 복사"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-500">복사됨</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">복사</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code block */}
      <div className="flex-1 overflow-auto bg-zinc-950">
        <pre className="text-[13px] leading-[1.6]">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex hover:bg-zinc-800/50">
                <span className="inline-block w-[3.5rem] shrink-0 select-none pr-4 text-right text-zinc-500">
                  {i + 1}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-all text-zinc-200 pr-4">
                  {line || " "}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
