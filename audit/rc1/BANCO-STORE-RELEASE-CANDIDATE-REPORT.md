# BANCO STORE RELEASE CANDIDATE REPORT

**Version:** RC-1  
**Date:** 2026-07-07  
**Branch:** `main` @ `cdf90b9` (waves 1–3 committed locally; reports in follow-up commit)  
**Commit under test (remote CI):** `e24014b` — re-run CI after merge of `maintenance/wave-1-3-upload-search-eas`  
**Validation scope:** 29-point Release Validation (no AWS deploy, no Google Play/App Store submission, no deep-link changes)

---

## Executive summary

RC-1 is **functionally strong on the backend** (280+ integration tests pass on Linux CI; API production bundle builds). **CI typecheck regression** on remote `main` (`e24014b`) is **fixed locally** in `3607c0a` — merge maintenance branch to clear the build job. **Local Windows validation is intentionally limited** (pnpm prunes win32 Rollup binaries; Drizzle `push` path quirk on Windows). **Google Cloud deploy artifacts do not exist yet** — only Replit (default) + AWS (`deploy/aws/`).

**Decision: GO WITH FIXES**

---

## Severity tally

| Severity | Count | Examples |
|----------|------:|----------|
| **Critical** | **2** | CI typecheck failure on `main` (`like()` 3-arg); `upload_claims` table must be migrated before any environment using C-01 upload security |
| **High** | **6** | No mobile full listing-edit screen; health probes hit Clerk middleware (500 without `CLERK_SECRET_KEY`); no GCP deploy folder; `google-adk` not integrated; Windows cannot run full vite/vitest without optional Rollup workaround; production smoke blocked without secrets |
| **Medium** | **5** | `PaymentConfigService` test `afterAll` timeout (flake); `preinstall` requires `sh` (breaks native Windows `pnpm install`); deep links still `https://replit.com/`; landing vite build flaky after rollup prune cycle; no ESLint in monorepo |
| **Low** | **4** | Web bundle chunks >500 kB warnings; local `gh` needs `GH_TOKEN`; API cold start slow when backfill jobs run; `STATUS_REPORT.md` test counts slightly stale vs current suite |

**Readiness score: 68%** (weighted: automated gates 72%, product journeys 65%, multi-cloud deploy 55%)

---

## Publish gates

| Target | Ready? | Notes |
|--------|--------|-------|
| **AWS** | **Conditional — GO WITH FIXES** | `deploy/aws/` complete (Docker, compose, EB, SSM env templates, S3 adapter). Requires secrets, RDS migrate (`upload_claims`), TLS, smoke on staging. **Do not deploy until CI green.** |
| **Google Cloud** | **No** | No `deploy/gcp/` (or equivalent). GCS client exists for Replit sidecar + S3 adapter for AWS — **no Cloud Run / GKE / ADK pipeline in repo.** User note: `pip install google-adk` is **not** wired into this codebase. |
| **Google Play** | **GO WITH FIXES** | `com.bancooom.app`, Expo 54, typecheck passes; needs EAS production build, signing, Clerk/OAuth env, store listing assets, device QA. |
| **Apple App Store** | **GO WITH FIXES** | `com.bancooom.app` bundle id; needs Apple Developer setup, Sign in with Apple config, TestFlight QA. |

---

## 1–29 Validation matrix

| # | Area | Result | Evidence |
|---|------|--------|----------|
| 1 | **Build verification** | **PARTIAL** | ✅ `pnpm run typecheck` — PASS locally (7 packages). ✅ API `build.mjs` — PASS (~16.7 MB dist). ✅ `dealer-os` + `admin-os` vite build — PASS (npx). ❌ `landing` — FAIL on Windows when `@rollup/rollup-win32-x64-msvc` pruned. ❌ CI job **Typecheck & build** — FAIL on `e24014b`. Logs: `audit/rc1/01-typecheck.log`, `02-api-build.log`, GitHub Actions run `28865404906`. |
| 2 | **Runtime verification** | **PARTIAL** | API process listens on `:3000` (`audit/rc1/12-api-runtime.log`). Health routes return **500** without `CLERK_SECRET_KEY` (Clerk middleware is global in `app.ts`). |
| 3 | **Mobile navigation** | **STATIC PASS** | Routes: create listing, mine, search, messages, notifications, profile, plans, wallet, business flows. **No `listings/edit` route** — edit limited to `status: sold` via `updateListing`. |
| 4 | **API integration** | **PASS (CI)** | GitHub CI job **API tests (Postgres)** — **success** on `e24014b`. Local: **280 passed / 3 failed / 3 skipped** (failures = missing `upload_claims` table after failed local push). Log: `audit/rc1/10-api-tests.log`. |
| 5 | **Database integrity** | **PARTIAL** | CI: `push-force` + seed + tests ✅. Local: `push-force` **FAIL** — Drizzle “No schema files found” for `lib/db/src/schema/index.ts` (Windows path). Seed **PASS** on existing schema. |
| 6 | **Authentication** | **CODE PASS / RUNTIME BLOCKED** | Clerk integrated (`app.ts`, mobile `@clerk/expo`). Runtime requires `CLERK_SECRET_KEY` + publishable key. |
| 7 | **Authorization** | **PASS** | P0 upload IDOR fix (`uploadClaims`), feed visibility excludes deleted users; role guards + admin routes covered in test suite. |
| 8 | **Media upload** | **PARTIAL** | C-01 code present; **3 `uploadClaims` tests FAIL locally** (`relation "upload_claims" does not exist`). CI passed full suite (table created on Linux push). |
| 9 | **Search** | **PASS** | Map/search/rental/trigram tests in api-server suite (CI green). |
| 10 | **Listing creation** | **PASS** | Lifecycle E2E tests + mobile `listings/create.tsx`. |
| 11 | **Edit / delete** | **PARTIAL** | Archive/delete/republish tested; **full field edit UI missing** on mobile. |
| 12 | **Notifications** | **CODE PASS** | In-app + push fan-out; push requires FCM/APNs env (Replit checklist). |
| 13 | **Chat** | **PASS** | Conversations routes + tests; mobile `messages/[id].tsx`. |
| 14 | **Profile** | **PASS** | `(tabs)/profile.tsx`, settings, wallet routes; typecheck clean. |
| 15 | **Subscription** | **PASS** | Plans/admin APIs + `plans.tsx`; PlanService tests in suite. |
| 16 | **Payment integration** | **PARTIAL** | Paymob + webhook tests; `PaymentConfigService.test.ts` **hook timeout** locally (flake, not logic failure). |
| 17 | **Offline handling** | **NOT E2E TESTED** | AsyncStorage / React Query patterns present; no automated offline suite. |
| 18 | **Error handling** | **PASS** | Central `errorHandler`, structured codes, mobile crash capture (per `STATUS_REPORT.md`). |
| 19 | **Crash recovery** | **NOT E2E TESTED** | Global error boundaries documented; no automated crash-injection run. |
| 20 | **Memory leak detection** | **NOT RUN** | No profiler/LeakCanary session in this validation. |
| 21 | **Performance profiling** | **NOT RUN** | No Lighthouse/k6/Artillery run in this validation. |
| 22 | **Bundle size analysis** | **PARTIAL** | API dist **16,696,447 B**; admin **1,008,384 B**; dealer **1,543,820 B**. Vite warns main JS **>500 kB** (dealer/admin). |
| 23 | **Startup time** | **OBSERVED** | API listen ~3–4 min wall clock in local run (backfill-staff-roles job ~128 s during startup window). |
| 24 | **Security validation** | **PASS WITH FIXES PENDING PUSH** | C-01/C-02/C-03/H-03 implemented; C-02 typecheck fix applied locally (`sql` LIKE ESCAPE). |
| 25 | **Logging validation** | **PASS** | Pino JSON logs with request_id, job completion (`audit/rc1/12-api-runtime.log`). |
| 26 | **Environment variables** | **PASS** | Templates: `deploy/aws/env/.env.{development,staging,production}.example`, `deploy/aws/reports/04-ENVIRONMENT_VARIABLES.md`. |
| 27 | **Production build validation** | **PARTIAL** | API + 2/3 web apps built locally; landing + CI build job blocked. |
| 28 | **Production smoke test** | **FAIL (local)** | `/api/v1/health`, `/healthz`, `/livez`, `/readyz` → **500** without Clerk secret (not env-configured on validator machine). |
| 29 | **Production readiness report** | **THIS DOCUMENT** | — |

---

## Command outputs (summary)

### Install
```
pnpm install --ignore-scripts → Done in 28.7s (Windows; skips sh preinstall)
pnpm install (full) → FAIL: preinstall requires `sh`
```

### Typecheck (local, after critical fix)
```
artifacts/api-server typecheck: Done
artifacts/banco-mobile typecheck: Done
artifacts/admin-os, dealer-os, landing, mockup-sandbox, scripts: Done
Exit: 0 — log: audit/rc1/01-typecheck.log
```

### Builds
```
API build: Done in 29932ms — API_BUILD=0
dealer-os: ✓ built in 2m 6s — 1,115.78 kB JS (gzip 318.80 kB)
admin-os: ✓ built in 1m 34s
landing: FAIL — missing @rollup/rollup-win32-x64-msvc when pruned
```

### Tests (local Postgres :5433)
```
Test Files  2 failed | 53 passed | 1 skipped (56)
Tests       3 failed | 280 passed | 3 skipped (286)
Duration    506.46s
Failures: uploadClaims.test.ts (3) — upload_claims table missing
         PaymentConfigService.test.ts — afterAll hook timeout
Log: audit/rc1/10-api-tests.log
```

### Tests (GitHub CI — Linux, commit e24014b)
```
Job "API tests (Postgres)": success (all steps green)
Job "Typecheck & build": failure at Typecheck step
Run: https://github.com/waelzaid66-max/-BANCO-CA-OOM-/actions/runs/28865404906
```

### Mobile
```
tsc typecheck: PASS — audit/rc1/06-mobile-typecheck.log
icons test: 6/6 pass — audit/rc1/07-mobile-icons.log
```

### Runtime smoke
```
Server listening port 3000 — OK
GET /healthz, /livez, /readyz → 500 (Missing Clerk Secret Key)
```

---

## Critical fix applied during RC-1 (committed locally)

**File:** `artifacts/api-server/src/controllers/uploadController.ts`  
**Issue:** `like(col, pattern, "\\")` — Drizzle `like()` accepts 2 args → **CI typecheck failure**.  
**Fix:** `sql\`${col} LIKE ${pattern} ESCAPE '\\\\'\`` — in commit `3607c0a`.

**Action required:** Merge `maintenance/wave-1-3-upload-search-eas` → `main`, re-run CI, confirm **both** jobs green.

---

## Deploy environments (architecture — unchanged)

| Environment | Status | Path |
|-------------|--------|------|
| **Replit** | Default dev/prod path | GCS sidecar `127.0.0.1:1106`, Expo `origin: replit.com` |
| **AWS** | Documented + Docker/EB | `deploy/aws/` |
| **Google Cloud** | **Planned, not implemented** | No deploy folder; use `@google-cloud/storage` in code only |

---

## Remaining work before AWS / Google / stores

1. Push typecheck fix → **green CI** (build + test jobs).
2. Run `drizzle-kit push` on **staging/production** (creates `upload_claims`).
3. Configure SSM/env: Clerk, Paymob, S3, `DATABASE_URL`, `SESSION_SECRET`, etc.
4. Fix or exempt health routes from Clerk when secret missing (recommended HIGH).
5. Add mobile **listing edit** flow (HIGH product gap).
6. Scaffold **GCP deploy** alongside AWS (user requirement — not started).
7. Device QA on Replit/staging: OTP, Google/Apple sign-in, push, uploads byte-path.

---

## Final decision

# **GO WITH FIXES**

Do **not** start AWS deployment, Google Cloud deployment, or store submission until:
1. CI is fully green on `main` (including typecheck/build), and  
2. `upload_claims` migration is applied on the target database, and  
3. Staging smoke passes with real Clerk + storage credentials.

---

*Logs directory:* `audit/rc1/`  
*Validation script (fixed):* `scripts/rc1-validation.ps1`
