"use client";

import {
  FileCode2,
  FolderOpen,
  Layout,
  Server,
  Palette,
  Columns3,
  Layers,
  Component,
  Library,
  Anchor,
  FileType,
  Settings,
  Terminal,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PortfolioCategory } from "@/lib/utils/portfolio-scanner";

interface FileTreeSidebarProps {
  categories: PortfolioCategory[];
  selectedFilePath: string | null;
  searchQuery: string;
  onFileSelect: (filePath: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "app-pages": Layout,
  "app-api": Server,
  "components-ui": Palette,
  "components-layout": Columns3,
  "components-tabs": Layers,
  "components-other": Component,
  lib: Library,
  hooks: Anchor,
  types: FileType,
  config: Settings,
  scripts: Terminal,
};

export function FileTreeSidebar({
  categories,
  selectedFilePath,
  searchQuery,
  onFileSelect,
}: FileTreeSidebarProps) {
  const query = searchQuery.toLowerCase();

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      files: query
        ? cat.files.filter(
            (f) =>
              f.path.toLowerCase().includes(query) ||
              f.name.toLowerCase().includes(query),
          )
        : cat.files,
    }))
    .filter((cat) => cat.files.length > 0);

  const defaultOpenValues = query
    ? filteredCategories.map((c) => c.id)
    : [];

  return (
    <ScrollArea className="h-full">
      <Accordion
        type="multiple"
        defaultValue={defaultOpenValues}
        key={query ? "filtered" : "default"}
        className="px-2"
      >
        {filteredCategories.map((category) => {
          const Icon = CATEGORY_ICONS[category.id] || FolderOpen;
          return (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger className="py-2.5 text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{category.label}</span>
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-[10px]"
                  >
                    {category.files.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="space-y-0.5 pl-2">
                  {category.files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => onFileSelect(file.path)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                        selectedFilePath === file.path
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      title={file.path}
                    >
                      <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      {filteredCategories.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          검색 결과가 없습니다
        </div>
      )}
    </ScrollArea>
  );
}
