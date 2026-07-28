#!/usr/bin/env bash
# BANCO TURBO — one-command boot (bash: Replit shell / Linux / macOS).
#   ./turbo.sh          → API server (uses the environment's DATABASE_URL/PORT)
#   ./turbo.sh all      → API + Admin + Market + Landing (background, logs in /tmp)
#   ./turbo.sh check    → typecheck everything + backend tests
# On Replit the workflows normally manage servers — this is the quick manual path.

set -u
cd "$(dirname "$0")"

MODE="${1:-api}"

if [ "$MODE" = "check" ]; then
  echo "[turbo] typecheck (all packages)..."
  pnpm -r --if-present run typecheck || exit 1
  echo "[turbo] backend tests (real Postgres via DATABASE_URL)..."
  TZ=UTC pnpm --filter "@workspace/api-server" run test
  exit $?
fi

: "${PORT:=3000}"
export PORT

echo "[turbo] starting API server on :$PORT ..."
if [ "$MODE" = "all" ]; then
  (pnpm --filter @workspace/api-server run dev >/tmp/banco-api.log 2>&1 &)
  echo "[turbo] starting Admin (5173) / Market (5174) / Landing (5175) ..."
  (pnpm --filter admin-os run dev -- --port 5173 >/tmp/banco-admin.log 2>&1 &)
  (pnpm --filter dealer-os run dev -- --port 5174 >/tmp/banco-market.log 2>&1 &)
  (pnpm --filter landing run dev -- --port 5175 >/tmp/banco-landing.log 2>&1 &)
  echo "[turbo] READY — logs: /tmp/banco-*.log"
  echo "  API     http://localhost:$PORT/api/v1/health"
  echo "  Admin   http://localhost:5173"
  echo "  Market  http://localhost:5174"
  echo "  Landing http://localhost:5175"
else
  exec pnpm --filter @workspace/api-server run dev
fi
