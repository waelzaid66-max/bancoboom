#!/usr/bin/env bash
# =============================================================================
# BANCO — Replit production startup script
# Starts all services; port 5000 is the main webview (Next.js).
# All processes run in background; this script waits on pid file so
# Replit keeps it alive. SIGTERM/SIGINT propagates to all children.
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== BANCO Production Start ==="

# Propagate SIGTERM/SIGINT to all child processes
_PIDS=()
_cleanup() {
  echo "[BANCO] Shutting down all services..."
  for pid in "${_PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  exit 0
}
trap _cleanup SIGTERM SIGINT

# --- API server (port 8080) ---
echo "[api] Starting API server on port 8080..."
PORT=8080 node --enable-source-maps \
  "$ROOT/artifacts/api-server/dist/index.mjs" &
_PIDS+=($!)

# --- Next.js web (port 5000 → external port 80, main webview) ---
echo "[web] Starting Next.js on port 5000..."
pnpm --filter @workspace/banco-web exec \
  next start --hostname 0.0.0.0 --port 5000 &
_PIDS+=($!)

# --- Admin OS (port 3001) ---
echo "[admin] Starting admin-os on port 3001..."
PORT=3001 BASE_PATH=/admin-os pnpm --filter @workspace/admin-os run serve \
  -- --port 3001 &
_PIDS+=($!)

# --- Dealer OS / BANCO Market (port 3002) ---
echo "[dealer] Starting dealer-os on port 3002..."
PORT=3002 BASE_PATH=/dealer-os pnpm --filter @workspace/dealer-os run serve \
  -- --port 3002 &
_PIDS+=($!)

# --- Landing page (port 3003) ---
echo "[landing] Starting landing on port 3003..."
PORT=3003 pnpm --filter @workspace/landing run serve \
  -- --port 3003 &
_PIDS+=($!)

# --- Expo mobile (port 8081) ---
echo "[mobile] Starting Expo static server on port 8081..."
PORT=8081 BASE_PATH=/banco-mobile \
  node "$ROOT/artifacts/banco-mobile/server/serve.js" &
_PIDS+=($!)

echo "=== All services started. PIDs: ${_PIDS[*]} ==="
echo "  web        → http://0.0.0.0:5000"
echo "  api        → http://0.0.0.0:8080"
echo "  admin      → http://0.0.0.0:3001"
echo "  dealer     → http://0.0.0.0:3002"
echo "  landing    → http://0.0.0.0:3003"
echo "  mobile     → http://0.0.0.0:8081"

# Wait for all children; exit with first non-zero code
wait "${_PIDS[@]}"
