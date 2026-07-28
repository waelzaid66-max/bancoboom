# BANCO TURBO — one-command local boot (Windows).
#   .\turbo.ps1            → DB + API server
#   .\turbo.ps1 -All       → DB + API + Admin + Market + Landing
#   .\turbo.ps1 -Check     → typecheck everything + run backend tests
# Servers open in their own windows; close a window to stop that server.

param(
  [switch]$All,
  [switch]$Check
)

$Root = $PSScriptRoot
$env:Path = "C:\Users\waelz\tools\node;$env:Path"
$env:ESBUILD_BINARY_PATH = "C:\Users\waelz\tools\esbuild-win32\package\esbuild.exe"
if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/banco_test"
}

function Start-Db {
  $up = Get-NetTCPConnection -State Listen -LocalPort 5433 -ErrorAction SilentlyContinue
  if ($up) { Write-Host "[turbo] DB already up on 5433" -ForegroundColor Green; return }
  Write-Host "[turbo] starting Postgres on 5433 (detached)..." -ForegroundColor Cyan
  Start-Process -FilePath "C:\Users\waelz\tools\pgsql\bin\pg_ctl.exe" `
    -ArgumentList '-D',"C:\Users\waelz\tools\pgdata",'-o','"-p 5433"','-l',"C:\Users\waelz\tools\pgdata\server.log",'start' `
    -WindowStyle Hidden
  Start-Sleep -Seconds 4
}

function Start-Surface([string]$Name, [string]$Cmd) {
  Write-Host "[turbo] launching $Name..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList '-NoExit','-Command',
    "`$env:Path='C:\Users\waelz\tools\node;'+`$env:Path; `$env:ESBUILD_BINARY_PATH='C:\Users\waelz\tools\esbuild-win32\package\esbuild.exe'; `$env:DATABASE_URL='$($env:DATABASE_URL)'; Set-Location '$Root'; $Cmd"
}

Start-Db

if ($Check) {
  Write-Host "[turbo] typecheck (all packages)..." -ForegroundColor Cyan
  pnpm -r --if-present run typecheck
  Write-Host "[turbo] backend tests (real Postgres)..." -ForegroundColor Cyan
  $env:TZ = "UTC"
  pnpm --filter "@workspace/api-server" run test
  exit $LASTEXITCODE
}

Start-Surface "API Server (3000)" "`$env:PORT='3000'; pnpm --filter @workspace/api-server run dev"

if ($All) {
  Start-Surface "Banco Admin (5173)" "pnpm --filter admin-os run dev -- --port 5173"
  Start-Surface "Banco Market (5174)" "pnpm --filter dealer-os run dev -- --port 5174"
  Start-Surface "Landing (5175)" "pnpm --filter landing run dev -- --port 5175"
}

Write-Host ""
Write-Host "[turbo] READY:" -ForegroundColor Green
Write-Host "  API     http://localhost:3000/api/v1/health"
if ($All) {
  Write-Host "  Admin   http://localhost:5173"
  Write-Host "  Market  http://localhost:5174"
  Write-Host "  Landing http://localhost:5175"
}
Write-Host "  Mobile  cd artifacts/banco-mobile; npx expo start"
