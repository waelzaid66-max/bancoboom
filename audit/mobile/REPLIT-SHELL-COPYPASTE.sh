#!/usr/bin/env bash
# Run on Replit Shell — one shot redeploy for wave 8 + 10C on main.
# After this: Stop → Run api-server workflow in Replit UI.
set -euo pipefail

echo "=== BANCO api-server redeploy ==="
git fetch origin
git checkout main
git pull --ff-only origin main
echo "HEAD: $(git log -1 --oneline)"
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push-force
echo ""
echo "Done. Now in Replit UI: Stop → Run api-server."
echo "On your PC: node audit/mobile/scripts/replit-redeploy-watch.mjs"
