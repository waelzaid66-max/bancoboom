# Publish aws-virgen from the primary monorepo (owner credentials required).
# Usage: .\scripts\publish-aws-virgen-rc.ps1 v1.1.0-stabilize-2026-07-10
param(
  [string]$Tag = "v1.1.0-stabilize-2026-07-10"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$originUrl = (git remote get-url origin).Trim()
$virgenUrl = $originUrl -replace '-BANCO-CA-OOM-', 'aws-virgen' -replace 'https://[^@]+@', 'https://'
$token = $env:AWS_VIRGEN_SYNC_TOKEN
if (-not $token) { $token = $env:GITHUB_TOKEN }

function Get-AuthUrl([string]$url) {
  $clean = $url -replace 'https://[^@]+@', 'https://'
  if ($token -and $clean.StartsWith('https://')) {
    return "https://x-access-token:${token}@$($clean.Substring(8))"
  }
  return $clean
}

git fetch origin main
$sha = (git rev-parse origin/main).Trim()
Write-Host "[aws-virgen] primary main @ $sha"

if (Test-Path "scripts/generate-aws-virgen-sync-manifest.mjs") {
  node scripts/generate-aws-virgen-sync-manifest.mjs --tag $Tag
}

$workDir = Join-Path $env:TEMP ("banco-virgen-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $workDir | Out-Null

try {
  $cloneUrl = Get-AuthUrl $virgenUrl
  Write-Host "[aws-virgen] clone $virgenUrl"
  git clone $cloneUrl (Join-Path $workDir "repo")
  Set-Location (Join-Path $workDir "repo")

  $bancoFetch = Get-AuthUrl $originUrl
  git remote add banco $bancoFetch
  git fetch banco main

  Write-Host "[aws-virgen] merge banco/main"
  git merge banco/main -m "chore(release): sync production main ($Tag) into aws-virgen" -X theirs

  if (Test-Path "$Root/.github/workflows/deploy.yml") {
    New-Item -ItemType Directory -Force -Path ".github/workflows" | Out-Null
    Copy-Item "$Root/.github/workflows/deploy.yml" ".github/workflows/deploy.yml" -Force
    git add .github/workflows/deploy.yml
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
      git commit -m "chore(ci): align deploy workflow with primary monorepo"
    }
  }

  if (Test-Path "$Root/release/AWS_VIRGEN_SYNC_MANIFEST.json") {
    New-Item -ItemType Directory -Force -Path "release" | Out-Null
    Copy-Item "$Root/release/AWS_VIRGEN_SYNC_MANIFEST.json" "release/AWS_VIRGEN_SYNC_MANIFEST.json" -Force
    git add release/AWS_VIRGEN_SYNC_MANIFEST.json
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
      git commit -m "chore(release): aws-virgen sync manifest ($Tag)"
    }
  }

  git tag -a $Tag -m "BANCO Store release candidate ($Tag)" 2>$null
  if ($LASTEXITCODE -ne 0) { git tag -f -a $Tag -m "BANCO Store release candidate ($Tag)" }

  $pushUrl = Get-AuthUrl $virgenUrl
  git remote set-url origin $pushUrl
  Write-Host "[aws-virgen] push main + tag $Tag"
  git push origin main
  git push origin $Tag --force

  $head = (git rev-parse HEAD).Trim()
  Write-Host "[aws-virgen] done at $head"
}
finally {
  Set-Location $Root
  Remove-Item -Recurse -Force $workDir -ErrorAction SilentlyContinue
}
