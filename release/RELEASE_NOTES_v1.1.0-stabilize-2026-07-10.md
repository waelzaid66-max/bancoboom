# Release Notes — v1.1.0-stabilize-2026-07-10

**Type:** Stabilization release (mobile master + audit bundle)  
**Primary:** https://github.com/waelzaid66-max/-BANCO-CA-OOM-  
**AWS mirror:** https://github.com/waelzaid66-max/aws-virgen  

## Highlights

- Mobile profile overflow menu touch fix (dead menu rows on device)
- Auth gate, home menus, PromoteButton — touch-safe modal pattern
- Search map visible in results without page-level pins (cluster API)
- Language hydration gate (RTL/LTR flash on home)
- API: `contact_phones` priority in leads; richer message notifications
- Live Replit API probe: **FRESH** (market_country ISO reject + map bookable/price)
- Full Arabic audit bundle + operational runbooks

## Verification

- `production-confidence-check.mjs`: 19/19
- `lib-hardening.test.mjs`: 34/34
- `pre-redeploy-code-gate.mjs`: PASS
- `ops-next-step.mjs`: LIVE FRESH

## Not included / open

- Device QA checklists not executed on physical device
- Multi-phone on profile (product decision) — listing create only today
- `staging-p0-smoke` requires `CLERK_BEARER_TOKEN`
- `artifacts/banco-web` scaffold — WIP, not store-ready

## Sync to aws-virgen

```bash
./scripts/publish-aws-virgen-rc.sh v1.1.0-stabilize-2026-07-10
```

See `release/FULL-STABLE-SNAPSHOT-2026-07-10.md` for full operational data.
