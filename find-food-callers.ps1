# ============================================
# /food API 호출 페이지 검색 스크립트
# 편하루 프로젝트 루트에서 실행하세요
# ============================================

Write-Host "`n🔍 /food API를 호출하는 페이지 검색 중...`n" -ForegroundColor Cyan

# 검색 대상 확장자
$extensions = @("*.tsx", "*.ts", "*.jsx", "*.js")

# /api/food 를 제외한 소스 파일에서 /food 관련 호출 패턴 검색
$patterns = @(
    "/api/food",
    "/food/",
    "href.*[`"']/food",
    "push\([`"']/food",
    "replace\([`"']/food",
    "router\..*food",
    "fetch.*food"
)

$combinedPattern = ($patterns -join "|")

# 결과 저장용
$results = @{}

foreach ($ext in $extensions) {
    # app/api/food 디렉토리는 제외 (API 라우트 자체이므로)
    $files = Get-ChildItem -Path . -Filter $ext -Recurse -File |
        Where-Object { $_.FullName -notmatch "node_modules|\.next|android|\.git|app[\\/]api[\\/]food" }

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }

        $lines = Get-Content $file.FullName -ErrorAction SilentlyContinue
        $matchedLines = @()

        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match $combinedPattern) {
                $matchedLines += [PSCustomObject]@{
                    Line    = $i + 1
                    Content = $lines[$i].Trim()
                }
            }
        }

        if ($matchedLines.Count -gt 0) {
            $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
            $results[$relativePath] = $matchedLines
        }
    }
}

# 결과 출력
if ($results.Count -eq 0) {
    Write-Host "❌ /food 관련 호출을 찾지 못했습니다." -ForegroundColor Red
} else {
    Write-Host "✅ 총 $($results.Count)개 파일에서 /food 호출 발견`n" -ForegroundColor Green

    # 카테고리별 분류
    $apiCallers = @{}    # fetch("/api/food/...") 호출
    $linkPages = @{}     # href="/food/..." 링크
    $routerPages = @{}   # router.push("/food/...") 네비게이션

    foreach ($key in $results.Keys) {
        foreach ($match in $results[$key]) {
            if ($match.Content -match "/api/food") {
                if (-not $apiCallers[$key]) { $apiCallers[$key] = @() }
                $apiCallers[$key] += $match
            }
            elseif ($match.Content -match "href.*food|Link.*food") {
                if (-not $linkPages[$key]) { $linkPages[$key] = @() }
                $linkPages[$key] += $match
            }
            elseif ($match.Content -match "push|replace|router") {
                if (-not $routerPages[$key]) { $routerPages[$key] = @() }
                $routerPages[$key] += $match
            }
            else {
                if (-not $apiCallers[$key]) { $apiCallers[$key] = @() }
                $apiCallers[$key] += $match
            }
        }
    }

    # --- API 호출 ---
    if ($apiCallers.Count -gt 0) {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
        Write-Host "📡 /api/food/* API 호출 ($($apiCallers.Count)개 파일)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
        foreach ($key in ($apiCallers.Keys | Sort-Object)) {
            Write-Host "`n  📄 $key" -ForegroundColor White
            foreach ($m in $apiCallers[$key]) {
                Write-Host "     L$($m.Line): $($m.Content)" -ForegroundColor Gray
            }
        }
    }

    # --- 링크/네비게이션 ---
    if ($linkPages.Count -gt 0) {
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
        Write-Host "🔗 /food/* 링크 참조 ($($linkPages.Count)개 파일)" -ForegroundColor Magenta
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
        foreach ($key in ($linkPages.Keys | Sort-Object)) {
            Write-Host "`n  📄 $key" -ForegroundColor White
            foreach ($m in $linkPages[$key]) {
                Write-Host "     L$($m.Line): $($m.Content)" -ForegroundColor Gray
            }
        }
    }

    # --- 라우터 네비게이션 ---
    if ($routerPages.Count -gt 0) {
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
        Write-Host "🧭 router로 /food 이동 ($($routerPages.Count)개 파일)" -ForegroundColor Blue
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
        foreach ($key in ($routerPages.Keys | Sort-Object)) {
            Write-Host "`n  📄 $key" -ForegroundColor White
            foreach ($m in $routerPages[$key]) {
                Write-Host "     L$($m.Line): $($m.Content)" -ForegroundColor Gray
            }
        }
    }

    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📊 요약: API호출 $($apiCallers.Count) | 링크 $($linkPages.Count) | 라우터 $($routerPages.Count)" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
}
