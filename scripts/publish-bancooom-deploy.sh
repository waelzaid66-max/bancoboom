#!/usr/bin/env bash
# Publish full production main to waelzaid66-max/bancooom (GCP deploy canonical repo).
# Requires owner PAT: BANCOOOM_SYNC_TOKEN or GITHUB_TOKEN with push to bancooom.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git remote get-url origin &>/dev/null; then
  echo "Run from the BANCO monorepo root." >&2
  exit 1
fi

ORIGIN_URL="$(git remote get-url origin)"
BANCOOOM_URL="https://github.com/waelzaid66-max/bancooom.git"

TOKEN="${BANCOOOM_SYNC_TOKEN:-${GITHUB_TOKEN:-}}"
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
TAG="${1:-deploy-$(date +%Y%m%d)}"

echo "[bancooom] verify GCP docker config"
node scripts/verify-gcp-docker-build-config.mjs

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

CLONE_URL="$(auth_url "$BANCOOOM_URL")"
echo "[bancooom] clone $(strip_git_credentials "$BANCOOOM_URL")"
if git clone "$CLONE_URL" "$WORKDIR/repo" 2>/dev/null; then
  :
else
  echo "[bancooom] empty or new remote — initializing"
  mkdir -p "$WORKDIR/repo"
  git -C "$WORKDIR/repo" init -b main
  git -C "$WORKDIR/repo" remote add origin "$CLONE_URL"
fi

cd "$WORKDIR/repo"
BANCO_FETCH="$(auth_url "$ORIGIN_URL")"
git remote remove banco 2>/dev/null || true
git remote add banco "$BANCO_FETCH"
git fetch banco main

if git rev-parse HEAD >/dev/null 2>&1 && [ -n "$(git rev-list -n 1 HEAD 2>/dev/null || true)" ]; then
  echo "[bancooom] reset to banco/main ($SHA)"
  git reset --hard banco/main
else
  echo "[bancooom] first push from banco/main ($SHA)"
  git reset --hard banco/main
fi

git tag -a "$TAG" -m "BANCO GCP deploy snapshot ($TAG)" 2>/dev/null || git tag -f -a "$TAG" -m "BANCO GCP deploy snapshot ($TAG)"

PUSH_URL="$(auth_url "$BANCOOOM_URL")"
git remote set-url origin "$PUSH_URL"

echo "[bancooom] push main + tag $TAG"
git push -u origin main --force
git push origin "$TAG" --force

echo "[bancooom] done at $(git rev-parse HEAD)"
