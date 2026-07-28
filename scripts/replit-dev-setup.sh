#!/bin/bash
# Replit dev environment setup — idempotent, safe to re-run.
# Run this after importing the repo on a fresh Replit repl.
#
# Prerequisites (set in Replit Secrets before running):
#   CLERK_SECRET_KEY, SESSION_SECRET, RESEND_API_KEY (optional), EXPO_TOKEN (optional)
# Runtime-managed by Replit (do NOT set manually):
#   DATABASE_URL, PORT
set -euo pipefail

echo "=== BANCO Replit dev setup ==="

# 1. Ensure pnpm is available (Replit may not pre-install it)
if ! command -v pnpm &>/dev/null; then
  echo "[1/5] Installing pnpm..."
  npm install -g pnpm@11
else
  echo "[1/5] pnpm $(pnpm --version) already available"
fi

# 2. Install workspace dependencies
echo "[2/5] Installing workspace dependencies..."
pnpm install --verify-store-integrity=false

# 3. Ensure pg_trgm extension exists (required for full-text search)
echo "[3/5] Ensuring PostgreSQL pg_trgm extension..."
if [ -n "${DATABASE_URL:-}" ]; then
  psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null \
    && echo "  pg_trgm: ok" \
    || echo "  pg_trgm: already exists or skipped"
else
  echo "  DATABASE_URL not set — skipping extension setup"
fi

# 4. Push Drizzle schema to the database (force to skip interactive prompts)
echo "[4/5] Pushing database schema..."
pnpm --filter @workspace/db run push-force

# 5. Seed the database with reference + sample data
echo "[5/5] Seeding database..."
pnpm --filter @workspace/api-server run seed
pnpm --filter @workspace/api-server run seed:reference
pnpm --filter @workspace/api-server run seed:admin

echo ""
echo "=== Setup complete ==="
echo "Start services:"
echo "  API server : pnpm --filter @workspace/api-server run dev"
echo "  Admin UI   : pnpm --filter admin-os run dev"
echo "  Market UI  : pnpm --filter dealer-os run dev"
echo "  Landing    : pnpm --filter @workspace/landing run dev"
echo "  Mobile     : cd artifacts/banco-mobile && npx expo start"
echo ""
echo "Or use: ./turbo.sh       (API only)"
echo "        ./turbo.sh all   (API + web surfaces)"
