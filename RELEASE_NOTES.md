# Release Notes — v1.0.0-rc.1

**Date:** 2026-07-08  
**Tag:** `v1.0.0-rc.1`  
**Branch:** `main`  
**Decision:** **GO WITH FIXES** for repository ship; **NO-GO** for unattended public store launch until OPS blockers close.

## Repositories (same RC tag on both)

- `waelzaid66-max/-BANCO-CA-OOM-` — primary production monorepo  
- `waelzaid66-max/aws-virgen` — AWS deploy mirror (includes tag-triggered CD workflow)

## Product scope in this RC

- Multi-vertical marketplace (cars, real estate sale/rent, industrial, B2B) — Egypt + GCC markets  
- Surfaces: mobile (Expo), admin, dealer/market, landing, Express API  
- Search + map clustering, rental terms, billing export, upload claims, production hardening waves  

## Verification (last green wave on `main`)

- Typecheck: 7 packages  
- API integration tests: 295+ (see STATUS_REPORT)  
- Mobile regression: 23 tests  
- `production-confidence-check.mjs`: 12/12 static gates  
- CI: `.github/workflows/ci.yml` (build, test, lint, mobile-regression)

## OPS blockers (not code)

- Staging smoke (`CLERK_BEARER_TOKEN`, `BANCO_API_URL`)  
- EAS preview/production signing and device QA  
- Mirror push if remotes lag (see `scripts/push-mirror-remotes.sh`)  

## Upgrade / rollback

- Rollback: [audit/production-readiness/RELEASE-ROLLBACK-PLAYBOOK.md](audit/production-readiness/RELEASE-ROLLBACK-PLAYBOOK.md)  
- AWS deploy: push tag `v*.*.*` or run `Deploy (AWS)` workflow manually  

## Full changelog

See [release/CHANGELOG.md](release/CHANGELOG.md).
