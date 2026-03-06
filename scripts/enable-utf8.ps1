[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

# Force UTF-8 behavior for this PowerShell session.
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$PSDefaultParameterValues["*:Encoding"] = "utf8"

# Python defaults to locale cp949 on some Windows setups.
# These env vars force UTF-8 for read/write and stdio.
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"

# cmd.exe code page (works for child cmd processes).
chcp 65001 > $null

Write-Host "UTF-8 mode enabled for current session." -ForegroundColor Green
Write-Host "PowerShell: $([Console]::InputEncoding.WebName) / $([Console]::OutputEncoding.WebName)" -ForegroundColor Cyan
Write-Host "Python env: PYTHONUTF8=$env:PYTHONUTF8, PYTHONIOENCODING=$env:PYTHONIOENCODING" -ForegroundColor Cyan
