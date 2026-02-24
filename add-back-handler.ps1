# add-back-handler.ps1
# 프로젝트 루트(pyeonharu/)에서 실행

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '=== useBackHandler 자동 삽입 스크립트 ===' -ForegroundColor Cyan
Write-Host ''

$importLine = 'import { useBackHandler } from "@/lib/hooks/use-back-handler";'
$changes = 0

function Insert-AfterLastImport {
    param([string]$Content, [string]$Line)
    $lines = $Content -split [Environment]::NewLine
    $idx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*import\s' -or $lines[$i] -match '^\s*} from\s') {
            $idx = $i
        }
    }
    if ($idx -ge 0) {
        $before = $lines[0..$idx]
        $after = if ($idx + 1 -lt $lines.Count) { $lines[($idx+1)..($lines.Count-1)] } else { @() }
        return ($before + $Line + $after) -join [Environment]::NewLine
    }
    return $Content
}

function Insert-AfterPattern {
    param([string]$Content, [string]$Pattern, [string]$InsertLine)
    $lines = $Content -split [Environment]::NewLine
    $result = @()
    $inserted = $false
    foreach ($line in $lines) {
        $result += $line
        if (!$inserted -and $line -match $Pattern) {
            $result += $InsertLine
            $inserted = $true
        }
    }
    if (!$inserted) {
        Write-Host ('  [WARN] 패턴 못찾음: ' + $Pattern) -ForegroundColor Yellow
    }
    return $result -join [Environment]::NewLine
}

function Insert-BeforePattern {
    param([string]$Content, [string]$Pattern, [string]$InsertLine)
    $lines = $Content -split [Environment]::NewLine
    $result = @()
    $inserted = $false
    foreach ($line in $lines) {
        if (!$inserted -and $line -match $Pattern) {
            $result += $InsertLine
            $inserted = $true
        }
        $result += $line
    }
    if (!$inserted) {
        Write-Host ('  [WARN] 패턴 못찾음: ' + $Pattern) -ForegroundColor Yellow
    }
    return $result -join [Environment]::NewLine
}

# 1. components/layout/mobile-nav.tsx
$file = 'components/layout/mobile-nav.tsx'
if (Test-Path $file) {
    Write-Host ('[1/6] ' + $file) -ForegroundColor Yellow
    $c = Get-Content $file -Raw -Encoding UTF8
    if ($c.Contains('useBackHandler')) {
        Write-Host '  [SKIP] already applied' -ForegroundColor DarkGray
    } else {
        $c = Insert-AfterLastImport $c $importLine
        $c = Insert-AfterPattern $c '\[showSheet, setShowSheet\].*useState' '  useBackHandler(showSheet, () => setShowSheet(false));'
        $c = Insert-AfterPattern $c '\[showRecommendModal, setShowRecommendModal\].*useState' '  useBackHandler(showRecommendModal, () => setShowRecommendModal(false));'
        Set-Content $file -Value $c -Encoding UTF8 -NoNewline
        Write-Host '  [DONE] 2 hooks added' -ForegroundColor Green
        $changes++
    }
} else { Write-Host ('[1/6] ' + $file + ' - not found') -ForegroundColor Red }

# 2. app/page.tsx
$file = 'app/page.tsx'
if (Test-Path $file) {
    Write-Host ('[2/6] ' + $file) -ForegroundColor Yellow
    $c = Get-Content $file -Raw -Encoding UTF8
    if ($c.Contains('useBackHandler')) {
        Write-Host '  [SKIP] already applied' -ForegroundColor DarkGray
    } else {
        $c = Insert-AfterLastImport $c $importLine
        $c = Insert-AfterPattern $c '\[loginModalOpen, setLoginModalOpen\].*useState' '  useBackHandler(loginModalOpen, () => setLoginModalOpen(false));'
        Set-Content $file -Value $c -Encoding UTF8 -NoNewline
        Write-Host '  [DONE] 1 hook added' -ForegroundColor Green
        $changes++
    }
} else { Write-Host ('[2/6] ' + $file + ' - not found') -ForegroundColor Red }

# 3. components/auth/login-modal.tsx
$file = 'components/auth/login-modal.tsx'
if (Test-Path $file) {
    Write-Host ('[3/6] ' + $file) -ForegroundColor Yellow
    $c = Get-Content $file -Raw -Encoding UTF8
    if ($c.Contains('useBackHandler')) {
        Write-Host '  [SKIP] already applied' -ForegroundColor DarkGray
    } else {
        $c = Insert-AfterLastImport $c $importLine
        $c = Insert-BeforePattern $c '\[view, setView\].*useState' '  useBackHandler(open, () => onOpenChange(false));'
        Set-Content $file -Value $c -Encoding UTF8 -NoNewline
        Write-Host '  [DONE] 1 hook added' -ForegroundColor Green
        $changes++
    }
} else { Write-Host ('[3/6] ' + $file + ' - not found') -ForegroundColor Red }

# 4. components/onboarding/onboarding-modal.tsx
$file = 'components/onboarding/onboarding-modal.tsx'
if (Test-Path $file) {
    Write-Host ('[4/6] ' + $file) -ForegroundColor Yellow
    $c = Get-Content $file -Raw -Encoding UTF8
    if ($c.Contains('useBackHandler')) {
        Write-Host '  [SKIP] already applied' -ForegroundColor DarkGray
    } else {
        $c = Insert-AfterLastImport $c $importLine
        $c = Insert-BeforePattern $c '\[step, setStep\].*useState' '  useBackHandler(open, () => onOpenChange(false));'
        Set-Content $file -Value $c -Encoding UTF8 -NoNewline
        Write-Host '  [DONE] 1 hook added' -ForegroundColor Green
        $changes++
    }
} else { Write-Host ('[4/6] ' + $file + ' - not found') -ForegroundColor Red }

# 5. components/delete-account-dialog.tsx
$file = 'components/delete-account-dialog.tsx'
if (Test-Path $file) {
    Write-Host ('[5/6] ' + $file) -ForegroundColor Yellow
    $c = Get-Content $file -Raw -Encoding UTF8
    if ($c.Contains('useBackHandler')) {
        Write-Host '  [SKIP] already applied' -ForegroundColor DarkGray
    } else {
        $c = Insert-AfterLastImport $c $importLine
        $c = Insert-BeforePattern $c 'const router = useRouter' '  useBackHandler(isOpen, () => onOpenChange(false));'
        Set-Content $file -Value $c -Encoding UTF8 -NoNewline
        Write-Host '  [DONE] 1 hook added' -ForegroundColor Green
        $changes++
    }
} else { Write-Host ('[5/6] ' + $file + ' - not found') -ForegroundColor Red }

# 6. components/tabs/RestaurantTab.tsx
$file = 'components/tabs/RestaurantTab.tsx'
if (Test-Path $file) {
    Write-Host ('[6/6] ' + $file) -ForegroundColor Yellow
    $c = Get-Content $file -Raw -Encoding UTF8
    if ($c.Contains('useBackHandler')) {
        Write-Host '  [SKIP] already applied' -ForegroundColor DarkGray
    } else {
        $c = Insert-AfterLastImport $c $importLine
        $c = Insert-AfterPattern $c '\[aiModalOpen, setAiModalOpen\].*useState' '  useBackHandler(aiModalOpen, () => setAiModalOpen(false));'
        Set-Content $file -Value $c -Encoding UTF8 -NoNewline
        Write-Host '  [DONE] 1 hook added' -ForegroundColor Green
        $changes++
    }
} else { Write-Host ('[6/6] ' + $file + ' - not found') -ForegroundColor Red }

Write-Host ''
Write-Host ('=== Done! ' + $changes + ' files modified ===') -ForegroundColor Cyan
Write-Host ''
