import fs from "fs";
import path from "path";

export interface PortfolioFile {
  path: string;
  name: string;
  content: string;
  language: string;
  lineCount: number;
  size: number;
}

export interface PortfolioCategory {
  id: string;
  label: string;
  files: PortfolioFile[];
}

export interface PortfolioData {
  categories: PortfolioCategory[];
  totalFiles: number;
  totalLines: number;
  generatedAt: string;
}

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".claude",
  "android",
  ".vercel",
  ".husky",
  "public",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".pdf",
]);

const EXCLUDED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".DS_Store",
  "thumbs.db",
]);

function getLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript (JSX)",
    ".js": "JavaScript",
    ".jsx": "JavaScript (JSX)",
    ".json": "JSON",
    ".css": "CSS",
    ".html": "HTML",
    ".md": "Markdown",
    ".mjs": "JavaScript (ESM)",
    ".cjs": "JavaScript (CJS)",
  };
  return map[ext] || ext.replace(".", "").toUpperCase() || "Text";
}

function shouldExclude(name: string): boolean {
  if (name.startsWith(".env")) return true;
  if (EXCLUDED_FILES.has(name)) return true;
  const ext = path.extname(name).toLowerCase();
  if (EXCLUDED_EXTENSIONS.has(ext)) return true;
  return false;
}

function scanDir(dir: string, rootDir: string): PortfolioFile[] {
  const files: PortfolioFile[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && EXCLUDED_DIRS.has(entry.name)) continue;
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath, rootDir));
    } else if (entry.isFile()) {
      if (shouldExclude(entry.name)) continue;

      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 200 * 1024) continue; // skip files > 200KB

        const content = fs.readFileSync(fullPath, "utf-8");
        const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");

        files.push({
          path: relativePath,
          name: entry.name,
          content,
          language: getLanguage(entry.name),
          lineCount: content.split("\n").length,
          size: stat.size,
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  return files;
}

function categorizeFile(filePath: string): string {
  if (/^app\/api\//.test(filePath)) return "app-api";
  if (/^app\/.*\/(page|layout|error|loading|not-found)\.tsx$/.test(filePath))
    return "app-pages";
  if (/^app\/(page|layout|error|loading|not-found)\.tsx$/.test(filePath))
    return "app-pages";
  if (/^app\//.test(filePath)) return "app-pages";
  if (/^components\/ui\//.test(filePath)) return "components-ui";
  if (/^components\/layout\//.test(filePath)) return "components-layout";
  if (/^components\/tabs\//.test(filePath)) return "components-tabs";
  if (/^components\//.test(filePath)) return "components-other";
  if (/^lib\//.test(filePath)) return "lib";
  if (/^hooks\//.test(filePath)) return "hooks";
  if (/^contexts\//.test(filePath)) return "hooks";
  if (/^types\//.test(filePath)) return "types";
  if (/^scripts\//.test(filePath)) return "scripts";
  return "config";
}

const CATEGORY_META: Record<string, { label: string; order: number }> = {
  "app-pages": { label: "페이지", order: 0 },
  "app-api": { label: "API 라우트", order: 1 },
  "components-ui": { label: "UI 컴포넌트", order: 2 },
  "components-layout": { label: "레이아웃", order: 3 },
  "components-tabs": { label: "탭 컴포넌트", order: 4 },
  "components-other": { label: "기타 컴포넌트", order: 5 },
  lib: { label: "라이브러리", order: 6 },
  hooks: { label: "훅", order: 7 },
  types: { label: "타입", order: 8 },
  config: { label: "설정", order: 9 },
  scripts: { label: "스크립트", order: 10 },
};

export function scanProject(projectRoot: string): PortfolioData {
  const allFiles = scanDir(projectRoot, projectRoot);

  const categoryMap = new Map<string, PortfolioFile[]>();

  for (const file of allFiles) {
    const catId = categorizeFile(file.path);
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, []);
    }
    categoryMap.get(catId)!.push(file);
  }

  const categories: PortfolioCategory[] = [];

  for (const [id, files] of categoryMap) {
    const meta = CATEGORY_META[id] || { label: id, order: 99 };
    files.sort((a, b) => a.path.localeCompare(b.path));
    categories.push({ id, label: meta.label, files });
  }

  categories.sort((a, b) => {
    const orderA = CATEGORY_META[a.id]?.order ?? 99;
    const orderB = CATEGORY_META[b.id]?.order ?? 99;
    return orderA - orderB;
  });

  const totalFiles = allFiles.length;
  const totalLines = allFiles.reduce((sum, f) => sum + f.lineCount, 0);

  return {
    categories,
    totalFiles,
    totalLines,
    generatedAt: new Date().toISOString(),
  };
}
