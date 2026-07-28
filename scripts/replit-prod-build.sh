#!/usr/bin/env bash
# =============================================================================
# BANCO — Replit production build script
# Runs ONCE during deployment build phase.
# Builds all artifacts in the correct order.
# DO NOT add interactive prompts or watch modes here.
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== BANCO Production Build ==="
echo "Node: $(node --version)  pnpm: $(pnpm --version)"

# --- 1. Install dependencies (frozen for reproducibility) ---
echo "[1/6] Installing dependencies..."
pnpm install --frozen-lockfile --verify-store-integrity=false

# --- 2. API server ---
echo "[2/6] Building API server..."
pnpm --filter @workspace/api-server run build

# --- 3. Next.js web app ---
echo "[3/6] Building banco-web (Next.js)..."
pnpm --filter @workspace/banco-web run build

# --- 4. Static Vite apps (parallel — they don't share state) ---
echo "[4/6] Building admin-os / dealer-os / landing (parallel)..."
pnpm --filter @workspace/admin-os   run build &
pnpm --filter @workspace/dealer-os  run build &
pnpm --filter @workspace/landing    run build &
wait

# --- 5. Expo mobile (builds static-build/ + bundles iOS/Android/Web) ---
echo "[5/6] Building banco-mobile (Expo)..."
# build.js needs the deployment domain to bake into manifests.
# REPLIT_INTERNAL_APP_DOMAIN is injected by Replit's build container.
pnpm --filter @workspace/banco-mobile run build

# --- 6. Post-build: prune pnpm store to reduce image size ---
echo "[6/6] Pruning pnpm store..."
pnpm store prune || true

echo "=== Build complete ==="
