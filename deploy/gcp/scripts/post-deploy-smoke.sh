#!/usr/bin/env bash
# Post-deploy HTTP checks (no Clerk JWT). Requires curl.
# Usage: BANCO_API_URL=https://your-run-url bash deploy/gcp/scripts/post-deploy-smoke.sh
set -euo pipefail

BASE="${BANCO_API_URL:-}"
if [[ -z "$BASE" ]]; then
  echo "Set BANCO_API_URL" >&2
  exit 1
fi

BASE="${BASE%/}"

echo "[smoke] healthz"
curl -fsS "$BASE/api/healthz" >/dev/null

echo "[smoke] readyz"
code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/readyz")"
if [[ "$code" != "200" ]]; then
  echo "readyz returned $code (DB may be down)" >&2
  exit 1
fi

echo "[smoke] OK — run scripts/staging-p0-smoke.mjs with CLERK_BEARER_TOKEN for full P0"
