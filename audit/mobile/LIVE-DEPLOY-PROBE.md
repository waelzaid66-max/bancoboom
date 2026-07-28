# Live deploy probe — banco-ca-oom.replit.app

**Updated:** 2026-07-10 (22:13 UTC+3)  
**Branch:** `origin/main` @ `23ded32` (Wave 10C)

## Combined probe (recommended)

```bash
node audit/mobile/scripts/probe-full-deploy.mjs
# writes audit/mobile/live-probes/YYYY-MM-DD-full-deploy-proof.json
```

| Exit | Meaning |
|------|---------|
| 0 | Wave 6 + wave 8 **FRESH** |
| 1 | Wave 6 FRESH, wave 8 **STALE** (`seller.social_links` missing) |
| 2 | Wave 6 **STALE** (redeploy required) |

## Latest automated probe (2026-07-10 19:13Z)

**Wave 6 — FRESH**

- `market_country=EGYPT` → HTTP **400**
- Map clusters include `is_bookable` + `price_display`
- `healthz` / `readyz` ok
- EG ≠ SA (market filter observable)

**Wave 8 — STALE on Replit**

- Sample: `20e9df18-d4a5-4df0-b0fc-44213065afd6`
- `GET /v1/listings/{id}` → `seller` keys: `id,name,role,is_verified` only
- Missing `social_links` until api-server redeploys from `main` @ `23ded32+`

**Local code gate:** PASS @ `23ded32` (includes wave 8 + wave 10C signals)

```bash
node audit/mobile/scripts/pre-redeploy-code-gate.mjs   # must PASS before redeploy
node audit/mobile/scripts/probe-live-deploy.mjs          # wave 6 only
node audit/mobile/scripts/probe-wave8-seller-social.mjs
node audit/mobile/scripts/ops-next-step.mjs
node audit/mobile/scripts/post-redeploy-verify.mjs     # after redeploy → exit 0 target
```

## Replit redeploy (blocking for wave 8)

```bash
git fetch origin && git checkout main && git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push-force
# Stop → Run api-server
```

Full runbook: `NEXT-OPS-REPLIT-REDEPLOY.md`

## What this probe does **not** prove

- Device UX (Expo Go / APK only)
- Upload smoke (needs `CLERK_BEARER_TOKEN`)
- Store publish / EAS production

Raw captures: `audit/mobile/live-probes/*.json`
