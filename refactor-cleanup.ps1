# refactor-cleanup.ps1
# 프로젝트 루트(pyeonharu/)에서 실행
# git으로 되돌릴 수 있으니 안심하세요

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$deleted = 0
$modified = 0

Write-Host '' 
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  편하루 리팩토링 정리 스크립트' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# ═══════════════════════════════════════════
# Phase 1: 임시 파일 삭제
# ═══════════════════════════════════════════
Write-Host '--- Phase 1: 임시 파일 삭제 ---' -ForegroundColor Yellow

$tempFiles = @(
    'extracted-files.txt',
    'extract-files2.js',
    'add-back-handler.ps1',
    'file-tree.txt',
    'knip-report.txt',
    'apply-phase0.sh',
    'pyeonharu-icon.svg',
    'pyeonharu-logo.svg',
    'package-lock.json',
    'proxy.ts',
    'refs-check.txt'
)

foreach ($f in $tempFiles) {
    if (Test-Path $f) {
        Remove-Item $f -Force
        Write-Host ('  DEL: ' + $f) -ForegroundColor Red
        $deleted++
    }
}

# styles/globals.css (app/globals.css와 중복)
if (Test-Path 'styles/globals.css') {
    Remove-Item 'styles' -Recurse -Force
    Write-Host '  DEL: styles/ (중복)' -ForegroundColor Red
    $deleted++
}

# ═══════════════════════════════════════════
# Phase 2: 레거시 홈 컴포넌트 삭제
# ═══════════════════════════════════════════
Write-Host ''
Write-Host '--- Phase 2: 레거시 컴포넌트 삭제 ---' -ForegroundColor Yellow

# components/home/ 전체 삭제
if (Test-Path 'components/home') {
    $homeFiles = Get-ChildItem 'components/home' -File
    foreach ($f in $homeFiles) {
        Write-Host ('  DEL: components/home/' + $f.Name) -ForegroundColor Red
        $deleted++
    }
    Remove-Item 'components/home' -Recurse -Force
}

# disease-stats API (홈 컴포넌트와 함께 삭제)
if (Test-Path 'app/api/disease-stats') {
    Remove-Item 'app/api/disease-stats' -Recurse -Force
    Write-Host '  DEL: app/api/disease-stats/' -ForegroundColor Red
    $deleted++
}

# theme-provider (layout.tsx에서 미사용)
if (Test-Path 'components/theme-provider.tsx') {
    # 실제 사용 여부 확인
    $usage = Get-ChildItem -Recurse -Include *.tsx,*.ts -File | Where-Object { $_.FullName -notmatch '(node_modules|\.next|\.git|theme-provider)' } | Select-String 'ThemeProvider' -SimpleMatch
    if (!$usage) {
        Remove-Item 'components/theme-provider.tsx' -Force
        Write-Host '  DEL: components/theme-provider.tsx (미사용)' -ForegroundColor Red
        $deleted++
    } else {
        Write-Host '  KEEP: components/theme-provider.tsx (사용 중)' -ForegroundColor DarkGray
    }
}

# ═══════════════════════════════════════════
# Phase 3: 탭 통합된 독립 페이지 → 리다이렉트
# ═══════════════════════════════════════════
Write-Host ''
Write-Host '--- Phase 3: 독립 페이지 리다이렉트 처리 ---' -ForegroundColor Yellow

# 리다이렉트 페이지 템플릿 생성 함수
function Make-Redirect {
    param([string]$Dir, [string]$Target)
    
    # 기존 파일 모두 삭제하고 리다이렉트 page.tsx만 남김
    if (Test-Path $Dir) {
        # 하위 폴더가 있으면 건드리지 않음 (result/[id] 등)
        $pageFile = Join-Path $Dir 'page.tsx'
        $loadingFile = Join-Path $Dir 'loading.tsx'
        $errorFile = Join-Path $Dir 'error.tsx'
        
        # loading, error 파일 삭제
        if (Test-Path $loadingFile) { Remove-Item $loadingFile -Force; $script:deleted++ }
        if (Test-Path $errorFile) { Remove-Item $errorFile -Force; $script:deleted++ }
        
        # page.tsx를 리다이렉트로 교체
        $content = @"
import { redirect } from "next/navigation";
export default function Page() { redirect("$Target"); }
"@
        [System.IO.File]::WriteAllText($pageFile, $content, $utf8)
        Write-Host ('  REDIRECT: ' + $Dir + ' -> ' + $Target) -ForegroundColor Magenta
        $script:modified++
    }
}

# 참조 없는 페이지 → 완전 삭제
if (Test-Path 'app/can-i-eat') {
    Remove-Item 'app/can-i-eat' -Recurse -Force
    Write-Host '  DEL: app/can-i-eat/ (미참조)' -ForegroundColor Red
    $deleted++
}

# 참조 있는 페이지 → 리다이렉트
Make-Redirect 'app/food' '/'
Make-Redirect 'app/diet' '/'
Make-Redirect 'app/symptom' '/'
Make-Redirect 'app/restaurant' '/'
Make-Redirect 'app/medicine' '/'
Make-Redirect 'app/search' '/'

# signup → sign-up 리다이렉트 (login에서 /signup 링크)
if (Test-Path 'app/signup/verify') {
    Remove-Item 'app/signup/verify' -Recurse -Force
    Write-Host '  DEL: app/signup/verify/ (미사용)' -ForegroundColor Red
    $deleted++
}
Make-Redirect 'app/signup' '/sign-up'

# sign-up-success → sign-up-complete 리다이렉트
Make-Redirect 'app/sign-up-success' '/sign-up-complete'

# ═══════════════════════════════════════════
# Phase 4: Footer 링크 업데이트 (홈 탭으로)
# ═══════════════════════════════════════════
Write-Host ''
Write-Host '--- Phase 4: Footer/참조 링크 업데이트 ---' -ForegroundColor Yellow

# footer.tsx 링크 수정
$footerFile = 'components/layout/footer.tsx'
if (Test-Path $footerFile) {
    $c = [System.IO.File]::ReadAllText($footerFile, [System.Text.Encoding]::UTF8)
    $original = $c
    $c = $c.Replace('href="/food"', 'href="/"')
    $c = $c.Replace('href="/symptom"', 'href="/"')
    $c = $c.Replace('href="/medicine"', 'href="/"')
    $c = $c.Replace('href="/search"', 'href="/"')
    if ($c -ne $original) {
        [System.IO.File]::WriteAllText($footerFile, $c, $utf8)
        Write-Host '  MOD: footer.tsx (링크 업데이트)' -ForegroundColor Green
        $modified++
    }
}

# not-found.tsx 링크 수정
$notFoundFile = 'app/not-found.tsx'
if (Test-Path $notFoundFile) {
    $c = [System.IO.File]::ReadAllText($notFoundFile, [System.Text.Encoding]::UTF8)
    $original = $c
    $c = $c.Replace('href="/food"', 'href="/"')
    if ($c -ne $original) {
        [System.IO.File]::WriteAllText($notFoundFile, $c, $utf8)
        Write-Host '  MOD: not-found.tsx (링크 업데이트)' -ForegroundColor Green
        $modified++
    }
}

# login 페이지: /signup → /sign-up
$loginFile = 'app/login/page.tsx'
if (Test-Path $loginFile) {
    $c = [System.IO.File]::ReadAllText($loginFile, [System.Text.Encoding]::UTF8)
    $original = $c
    $c = $c.Replace('href="/signup"', 'href="/sign-up"')
    if ($c -ne $original) {
        [System.IO.File]::WriteAllText($loginFile, $c, $utf8)
        Write-Host '  MOD: login/page.tsx (/signup -> /sign-up)' -ForegroundColor Green
        $modified++
    }
}

# sign-up/email: sign-up-success → sign-up-complete
$emailSignup = 'app/sign-up/email/page.tsx'
if (Test-Path $emailSignup) {
    $c = [System.IO.File]::ReadAllText($emailSignup, [System.Text.Encoding]::UTF8)
    $original = $c
    $c = $c.Replace('sign-up-success', 'sign-up-complete')
    if ($c -ne $original) {
        [System.IO.File]::WriteAllText($emailSignup, $c, $utf8)
        Write-Host '  MOD: sign-up/email/page.tsx (success -> complete)' -ForegroundColor Green
        $modified++
    }
}

# ═══════════════════════════════════════════
# 결과 요약
# ═══════════════════════════════════════════
Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ('  삭제: ' + $deleted + '개 파일/폴더') -ForegroundColor Red
Write-Host ('  수정: ' + $modified + '개 파일') -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '다음 단계:' -ForegroundColor Yellow
Write-Host '  git add -A'
Write-Host '  git diff --cached --stat    # 변경 내용 확인'
Write-Host '  git commit -m "refactor: 미사용 파일 정리 및 레거시 페이지 리다이렉트"'
Write-Host '  git push'
Write-Host ''
Write-Host '문제 발생시 되돌리기:' -ForegroundColor DarkGray
Write-Host '  git reset --hard HEAD~1' -ForegroundColor DarkGray
Write-Host '  git push --force' -ForegroundColor DarkGray
Write-Host ''
