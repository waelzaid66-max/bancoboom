# Release Notes — v1.0.0-rc.2

**Date:** 2026-07-08  
**Tag:** `v1.0.0-rc.2`  
**Primary `main`:** `30dcb2a` (CI green — ESLint/globals lockfile, SEO publish, map viewport)  
**Target:** full sync into `waelzaid66-max/aws-virgen`

## What this RC adds over v1.0.0-rc.1

- Merged PR #1: SEO visibility after SELL publish (spam UUID + seller join)
- Merged PR #2 + lockfile: ESLint `globals.node` for `scripts/staging-p0-smoke.mjs` (`URL`)
- `SearchResultsMap` cluster cache uses `MapViewport` (`min_lat` / `max_lat` / …)
- GCP deploy hardening + `verify-gcp-docker-build-config.mjs`
- Full production-readiness and maintenance audit tree on `main`

## Full tree on aws-virgen (same as primary after merge)

- All packages under `artifacts/`, `lib/`, `deploy/aws`, `deploy/gcp`
- Reports: `audit/production-readiness/`, `audit/maintenance/`, `deploy/aws/reports/`, `reports/`
- Manifest: `release/AWS_VIRGEN_SYNC_MANIFEST.json` (file inventory at publish time)

## Publish command (owner token)

```bash
./scripts/publish-aws-virgen-rc.sh v1.0.0-rc.2
```

Or: Actions → **Sync aws-virgen (full main)** with secret `AWS_VIRGEN_SYNC_TOKEN`.

See [docs/AWS_VIRGEN_FULL_PUBLISH.md](../docs/AWS_VIRGEN_FULL_PUBLISH.md).

## Verification

- GitHub CI on primary `main`: typecheck, build, API tests (Postgres), ESLint, mobile regression
- Local static gates: `node scripts/production-confidence-check.mjs`

## OPS (unchanged)

Staging smoke, EAS signing, AWS OIDC/ECR/SSM — see `audit/production-readiness/STAGING-REQUIRED-SECRETS.md`.
