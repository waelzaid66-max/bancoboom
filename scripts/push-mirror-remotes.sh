#!/usr/bin/env bash
# Push main to all BANCO production mirrors (run from Replit or a machine with push access).
set -euo pipefail
cd "$(dirname "$0")/.."

SHA="$(git rev-parse HEAD)"
echo "[sync] HEAD = $SHA"

TOKEN="${MIRROR_PUSH_TOKEN:-${AWS_VIRGEN_SYNC_TOKEN:-${GITHUB_TOKEN:-}}}"

strip_git_credentials() {
  echo "$1" | sed -E 's#https://[^@]+@#https://#; s#git@[^:]+:([^ ]+)#https://github.com/\1#'
}

auth_url() {
  local url
  url="$(strip_git_credentials "$1")"
  if [[ -n "$TOKEN" && "$url" == https://* ]]; then
    echo "https://x-access-token:${TOKEN}@${url#https://}"
  else
    echo "$url"
  fi
}

add_remote() {
  local name="$1"
  local repo="$2"
  local url="https://github.com/waelzaid66-max/$repo.git"
  url="$(auth_url "$url")"
  if git remote get-url "$name" &>/dev/null; then
    git remote set-url "$name" "$url"
  else
    git remote add "$name" "$url"
  fi
}

add_remote bbanco b-banco
add_remote bdeals b.deals
add_remote boom B-OOM

ORIGIN_PUSH="$(auth_url "$(strip_git_credentials "$(git remote get-url origin)")")"
git -c credential.helper= push "$ORIGIN_PUSH" HEAD:main

for r in bbanco bdeals boom; do
  echo "[sync] pushing main -> $r"
  git -c credential.helper= push "$r" HEAD:main
done

echo "[sync] verify:"
git fetch origin bbanco bdeals boom 2>/dev/null || true
git rev-parse HEAD
git ls-remote origin refs/heads/main | awk '{print "origin/main", $1}'
for r in bbanco bdeals boom; do
  git ls-remote "$r" refs/heads/main | awk -v r="$r" '{print r"/main", $1}'
done
