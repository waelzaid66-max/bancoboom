# Release Candidate — Final (Release Freeze)

**Date:** 2026-07-08 (closure wave)  
**Branch:** `main`  
**Mode:** **RELEASE FREEZE** — no new features; root-cause fixes only.

---

## Decision

| Environment | Verdict | Why |
|-------------|---------|-----|
| **Code base / local gates** | **GO WITH FIXES** | Full validation: confidence 12/12, typecheck, lint, mobile build, **25** mobile tests — all exit 0 |
| **Staging** | **NO GO** | Smoke `0/2` (API sleeping on Replit); `CLERK_BEARER_TOKEN` absent; DB DNS fail |
| **EAS preview** | **IN PROGRESS** | Android preview submitted — build `2b030ca4-b001-43a5-9723-00128f471d07` |
| **Global production (stores)** | **NO GO** | No EAS production on device; no device QA matrix; staging red |

**Overall:** **GO WITH FIXES** for merging code. **NO GO** for production release until ops blockers close.

---

## What completed (this wave)

- Cross-platform `preinstall` (Windows pnpm stability)
- Secrets auto-load for staging/schema scripts + `run-with-local-secrets.mjs`
- Env-driven Universal/App Links in `app.config.ts` (no hardcoded prod domain)
- +2 universal-link regression tests (25 total)
- EAS authenticated (`EXPO_TOKEN`); preview build queued with `EXPO_PUBLIC_DOMAIN` + Clerk key from EAS production env
- Single full production validation — all green

---

## What remains (OPS)

| # | Item | Owner |
|---|------|--------|
| 1 | Start Replit/staging API → re-run `staging-p0-smoke.mjs` | Operator |
| 2 | Provide `CLERK_BEARER_TOKEN` for upload/IDOR smoke | Operator |
| 3 | Fix/reach `DATABASE_URL` → `verify-upload-claims-schema.mjs` | Operator |
| 4 | Complete EAS preview APK → install on device | Operator |
| 5 | Device QA matrix (login, listing, upload, chat, wallet, billing, push, deep links, offline) | Operator |
| 6 | `eas build --profile production` after preview QA | Operator |
| 7 | Host `apple-app-site-association` + `assetlinks.json` on prod domain | Operator |
| 8 | FCM/APNs + store consoles (Play internal / TestFlight) | Operator |
| 9 | `ERROR_ALERT_WEBHOOK` live-fire | Operator |
| 10 | Real `OPENAI_API_KEY` if AI required at launch | Operator |

---

## Related

- [BANCO-STORE-FINAL-PRODUCTION-READINESS-REPORT.md](./BANCO-STORE-FINAL-PRODUCTION-READINESS-REPORT.md)  
- [PRODUCTION-SIGN-OFF-AND-DEPLOYMENT.md](./PRODUCTION-SIGN-OFF-AND-DEPLOYMENT.md)  
- [STAGING-REQUIRED-SECRETS.md](./STAGING-REQUIRED-SECRETS.md)
