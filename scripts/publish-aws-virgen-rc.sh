#!/usr/bin/env bash
# Publish aws-virgen from the primary monorepo (owner credentials required).
# Cloud agents cannot push to aws-virgen (403). Run on Replit, locally, or
# GitHub Actions workflow sync-aws-virgen.yml with AWS_VIRGEN_SYNC_TOKEN.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git remote get-url origin &>/dev/null; then
  echo "Run from the BANCO monorepo root." >&2
  exit 1
fi

ORIGIN_URL="$(git remote get-url origin)"
VIRGEN_URL="$(echo "$ORIGIN_URL" | sed 's|-BANCO-CA-OOM-|aws-virgen|' | sed -E 's#https://[^@]+@#https://#')"

TOKEN="${AWS_VIRGEN_SYNC_TOKEN:-${GITHUB_TOKEN:-}}"
strip_git_credentials() {
  local url="$1"
  echo "$url" | sed -E 's#https://[^@]+@#https://#; s#git@[^:]+:([^ ]+)#https://github.com/\1#'
}
auth_url() {
  local url
  url="$(strip_git_credentials "$1")"
  if [[ -n "$TOKEN" && "$url" == https://* ]]; then
    local hostpath="${url#https://}"
    echo "https://x-access-token:${TOKEN}@${hostpath}"
  else
    echo "$url"
  fi
}

git fetch origin main
SHA="$(git rev-parse origin/main)"
TAG="${1:-v1.0.0-rc.2}"

if [[ -f scripts/generate-aws-virgen-sync-manifest.mjs ]]; then
  node scripts/generate-aws-virgen-sync-manifest.mjs --tag "$TAG"
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

CLONE_URL="$(auth_url "$VIRGEN_URL")"
echo "[aws-virgen] clone $(strip_git_credentials "$VIRGEN_URL")"
git clone "$CLONE_URL" "$WORKDIR/repo"
cd "$WORKDIR/repo"

BANCO_FETCH="$(auth_url "$ORIGIN_URL")"
git remote add banco "$BANCO_FETCH"
git fetch banco main

echo "[aws-virgen] merge banco/main ($SHA)"
git merge banco/main -m "chore(release): sync production main ($TAG) into aws-virgen" -X theirs

if [[ -f "$ROOT/.github/workflows/deploy.yml" ]]; then
  mkdir -p .github/workflows
  cp "$ROOT/.github/workflows/deploy.yml" .github/workflows/deploy.yml
  git add .github/workflows/deploy.yml
  git diff --cached --quiet || git commit -m "chore(ci): align deploy workflow with primary monorepo"
fi

if [[ -f "$ROOT/release/AWS_VIRGEN_SYNC_MANIFEST.json" ]]; then
  cp "$ROOT/release/AWS_VIRGEN_SYNC_MANIFEST.json" release/AWS_VIRGEN_SYNC_MANIFEST.json
  git add release/AWS_VIRGEN_SYNC_MANIFEST.json
  git diff --cached --quiet || git commit -m "chore(release): aws-virgen sync manifest ($TAG)"
fi

git tag -a "$TAG" -m "BANCO Store release candidate ($TAG)" 2>/dev/null || git tag -f -a "$TAG" -m "BANCO Store release candidate ($TAG)"

PUSH_URL="$(auth_url "$VIRGEN_URL")"
git remote set-url origin "$PUSH_URL"

echo "[aws-virgen] push main + tag $TAG"
git push origin main
git push origin "$TAG" --force

echo "[aws-virgen] done at $(git rev-parse HEAD)"
