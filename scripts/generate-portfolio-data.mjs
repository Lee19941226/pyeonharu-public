/**
 * 빌드 전 포트폴리오 소스코드 데이터를 JSON으로 생성하는 스크립트.
 * next build 전에 실행되어 data/portfolio-data.json 을 생성한다.
 * API 라우트가 이 JSON을 import 해서 토큰 검증 후에만 반환한다.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".claude",
  "android",
  ".vercel",
  ".husky",
  "public",
  "data",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".pdf",
]);

const EXCLUDED_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  ".DS_Store", "thumbs.db",
]);

const LANG_MAP = {
  ".ts": "TypeScript", ".tsx": "TypeScript (JSX)",
  ".js": "JavaScript", ".jsx": "JavaScript (JSX)",
  ".json": "JSON", ".css": "CSS", ".html": "HTML",
  ".md": "Markdown", ".mjs": "JavaScript (ESM)", ".cjs": "JavaScript (CJS)",
};

function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return LANG_MAP[ext] || ext.replace(".", "").toUpperCase() || "Text";
}

function shouldExclude(name) {
  if (name.startsWith(".env")) return true;
  if (EXCLUDED_FILES.has(name)) return true;
  return EXCLUDED_EXTENSIONS.has(path.extname(name).toLowerCase());
}

function scanDir(dir, rootDir) {
  const files = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".") && entry.name !== ".eslintrc.json") continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath, rootDir));
    } else if (entry.isFile()) {
      if (shouldExclude(entry.name)) continue;
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 200 * 1024) continue;
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
      } catch { /* skip */ }
    }
  }
  return files;
}

const CATEGORY_META = {
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

function categorizeFile(filePath) {
  if (/^app\/api\//.test(filePath)) return "app-api";
  if (/^app\//.test(filePath)) return "app-pages";
  if (/^components\/ui\//.test(filePath)) return "components-ui";
  if (/^components\/layout\//.test(filePath)) return "components-layout";
  if (/^components\/tabs\//.test(filePath)) return "components-tabs";
  if (/^components\//.test(filePath)) return "components-other";
  if (/^lib\//.test(filePath)) return "lib";
  if (/^hooks\//.test(filePath) || /^contexts\//.test(filePath)) return "hooks";
  if (/^types\//.test(filePath)) return "types";
  if (/^scripts\//.test(filePath)) return "scripts";
  return "config";
}

// ── 실행 ──
const allFiles = scanDir(ROOT, ROOT);
const categoryMap = new Map();

for (const file of allFiles) {
  const catId = categorizeFile(file.path);
  if (!categoryMap.has(catId)) categoryMap.set(catId, []);
  categoryMap.get(catId).push(file);
}

const categories = [];
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

const data = {
  categories,
  totalFiles,
  totalLines,
  generatedAt: new Date().toISOString(),
};

const outDir = path.join(ROOT, "data");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "portfolio-data.json"), JSON.stringify(data));

console.log(`[portfolio] ${totalFiles} files, ${totalLines.toLocaleString()} lines → data/portfolio-data.json`);
