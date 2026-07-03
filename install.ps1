#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$InstallDir = if ($env:CLAUDE_CODE_PET_HOME) { $env:CLAUDE_CODE_PET_HOME } else { "$env:LOCALAPPDATA\claude-code-pet" }
$SourceBin = if ($args.Count -gt 0) { $args[0] } else { "src-tauri\target\release\claude-code-pet.exe" }

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Err($msg) { Write-Host "Error: $msg" -ForegroundColor Red; exit 1 }

Write-Info 'Claude Code Pet local installer'

if (!(Test-Path $SourceBin)) {
    Write-Err "Built binary not found at $SourceBin. Run: npm run build"
}

if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$ExePath = Join-Path $InstallDir 'claude-code-pet.exe'
Copy-Item -Path $SourceBin -Destination $ExePath -Force

# Built-in pets live next to the binary (see themes.rs lookup order).
if (Test-Path 'src\themes') {
    $ThemesDest = Join-Path $InstallDir 'themes'
    if (Test-Path $ThemesDest) { Remove-Item -Recurse -Force $ThemesDest }
    Copy-Item -Path 'src\themes' -Destination $ThemesDest -Recurse -Force
    Write-Info "Installed built-in pets to $ThemesDest"
}

Write-Info "Installed to $ExePath"
Write-Info ''
Write-Info 'Run the app:'
Write-Info "  $ExePath"
Write-Info ''
Write-Info 'Install Claude Code hooks only when you want them:'
Write-Info "  $ExePath install-claude-hooks"
Write-Info ''
Write-Info 'Remove those hooks later:'
Write-Info "  $ExePath uninstall-claude-hooks"
