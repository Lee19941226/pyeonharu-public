# 편하루 보안 패치 대상 파일 수집 스크립트 (PowerShell)
# 사용법: 프로젝트 루트에서 .\collect_files.ps1

$OUTPUT = "security-patch-files.zip"

$FILES = @(
  "app/api/food/analyze-image/route.ts"
  "app/api/diet/entries/route.ts"
  "app/api/bookmarks/route.ts"
  "app/api/restaurant/reviews/route.ts"
  "components/tabs/FoodTab.tsx"
  "components/medical/naver-map.tsx"
  "app/api/symptom-analyze/route.ts"
  "app/api/food/search/route.ts"
  "app/api/meal-recommend/route.ts"
  "next.config.mjs"
  "lib/supabase/proxy.ts"
  "scripts/001_create_tables.sql"
  "app/api/community/route.ts"
  "app/api/admin/support/route.ts"
  "app/api/community/[id]/comments/route.ts"
  "public/sw.js"
  "app/api/admin/stats/route.ts"
  "app/api/admin/search-logs/route.ts"
  "app/api/admin/update-chosung/route.ts"
  "app/privacy/page.tsx"
  "android/app/src/main/assets/index-Cl0QOmst.js"
)

$found = @()
$missing = @()

foreach ($f in $FILES) {
  if (Test-Path $f) {
    $found += $f
  } else {
    $missing += $f
  }
}

Write-Host ""
Write-Host "OK found: $($found.Count) files" -ForegroundColor Green
Write-Host "XX missing: $($missing.Count) files" -ForegroundColor Yellow

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "missing files:" -ForegroundColor Yellow
  foreach ($m in $missing) {
    Write-Host "   - $m" -ForegroundColor DarkYellow
  }
}

if ($found.Count -eq 0) {
  Write-Host "no files to collect." -ForegroundColor Red
  exit 1
}

# 기존 zip 삭제
if (Test-Path $OUTPUT) { Remove-Item $OUTPUT }

# 임시 폴더에 구조 유지하며 복사 후 압축
$tempDir = "._collect_temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }

foreach ($f in $found) {
  $dest = Join-Path $tempDir $f
  $destDir = Split-Path $dest -Parent
  if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  Copy-Item $f $dest
}

Compress-Archive -Path "$tempDir\*" -DestinationPath $OUTPUT -Force
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "done: $OUTPUT ($($found.Count) files)" -ForegroundColor Cyan
Write-Host ""
