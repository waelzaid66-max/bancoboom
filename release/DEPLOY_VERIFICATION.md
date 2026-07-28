# BANCO / B‑OOM — Deploy Verification & Assembly Guide

**For the Replit agent.** Companion to `REPLIT_HANDOFF.md`. Use this to assemble
the full version and verify each step, with the exact expected results so success
vs failure is unambiguous. Reference commit: **`c3ca67b`** (GitHub `main`, both
remotes).

> The GitHub update was DIVERGENT from the Replit repo and has been merged in.
> Everything below is **additive** — no table renamed, no data deleted, no API or
> business logic changed. If any step deviates from the expected result, STOP and
> report it; do NOT force / reset / delete / recreate.

---

## What was assembled (all additive)
1. Admin Control i18n — AR/EN + RTL, all 17 pages.
2. AI assistant fix — auto‑selects a real model (`gpt-4o-mini`) for a direct
   `OPENAI_API_KEY`; still prefers a direct key over the managed AI.
3. Deal‑Rating engine (A2) — `price_observations` table + `GET /v1/listings/{id}/insights` + a rating chip on the listing detail.
4. Geo/real‑estate reference — `reference_places` / `reference_developers` /
   `pending_locations` tables + `GET /v1/reference/places` + mobile location
   autocomplete. Egypt + 7 Middle‑East countries.
5. Cars reference — enriched `brands` table (111 global brands) + 327 real models.
6. CI pnpm‑version fix + full `/release` report set.

---

## Run order + EXPECTED RESULTS (stop if any differs)

### 1) Typecheck first (before touching the DB)
```bash
pnpm run typecheck
```
**Expected:** `0 errors` across all packages. If it errors, it is almost
certainly the merged AI file — send it to me.

### 2) Apply schema — **the one step to watch**
```bash
pnpm --filter @workspace/db run push-force
```
**Expected: ADDITIVE ONLY.** It should ADD the new tables (`reference_places`,
`reference_developers`, `pending_locations`, `price_observations`) and new
columns on `brands` (name_ar, country, parent_company, founded_year, logo_url,
is_active, is_premium, is_electric, is_commercial, popularity, search_keywords,
updated_at).
⚠️ **If the plan shows any `DROP TABLE`, `DROP COLUMN`, or a data‑loss warning →
STOP immediately and show me. Do not apply.** (Replit's DB was built on an older
schema, so the first run only ADDs — that is correct.)

### 3) Load the correct data (all idempotent — upsert, never duplicate)
```bash
pnpm --filter @workspace/api-server run seed
pnpm --filter @workspace/api-server run seed:reference          # → developers: 27 · places: 257
pnpm --filter @workspace/api-server run seed:car-brands         # → upserted 111 brands
pnpm --filter @workspace/api-server run seed:car-models         # → upserted 327 models across 26 brands
pnpm --filter @workspace/api-server run backfill:observations   # → records price points from existing listings
```
**Expected numbers:** reference **257 places / 27 developers / 8 countries**
(EG 169, AE 25, SA 24, JO 10, QA 9, KW 7, BH 7, OM 6); **111** car brands; **327**
car models. Re‑running any seed yields the same counts (no duplicates).

### 4) Build all apps (Linux)
```bash
pnpm --filter @workspace/api-server --filter @workspace/dealer-os --filter @workspace/admin-os --filter @workspace/landing run build
```
**Expected:** all four build successfully.

### 5) Tests
```bash
pnpm --filter @workspace/api-server run test
```
**Expected:** **257 passed / 3 skipped / 0 failed.**
The **3 skipped are intentional** (environment‑gated) — that is success, not a
failure. Tests pin `TZ=UTC` (matches Replit/production).

---

## After all green — reconverge the histories
Push the merged, verified result back to GitHub so the two never split again:
```bash
git push boom main
git push origin main
```
Then confirm Replit == GitHub.

---

## Remaining for a full production launch (environment / dashboards — not code)
| Item | Action |
|---|---|
| AI assistant | set a **real** `OPENAI_API_KEY` (starts with `sk-`). The saved one is a placeholder (`_DUMMY_`) → OpenAI returns 401. No `OPENAI_MODEL` needed. |
| OTP email | Clerk dashboard → enable Email verification code (Clerk sends it, not Resend) |
| Google / Apple | Clerk dashboard → enable providers + redirect URIs |
| Transactional email | set `RESEND_API_KEY` + verified sender |
| Payments | `PAYMOB_MODE=live` + real secret/HMAC/integration IDs when ready |
| Domain | set production domain + add to API CORS allowed origins |
| Mobile store | `app.json` → `expo-router.origin` from `replit.com` → production domain; set iOS `buildNumber` |

## Runtime smoke test (after the API workflow restarts)
```bash
curl -s localhost:8080/healthz                                   # → 200
curl -s 'localhost:8080/api/v1/reference/places?q=%D8%A7%D9%84%D8%AA%D8%AC%D9%85%D8%B9'   # التجمع → places
```
- Open a listing → `GET /api/v1/listings/{id}/insights` works (rating chip shows once its market segment has enough real observations).
- AI assistant replies once a real `OPENAI_API_KEY` is set.

## Hard rules
- Additive only. No `DROP`, no data deletion, no API/business‑logic change, no logo/design change.
- Do not change the pinned pnpm version (`pnpm@11.9.0`).
- On ANY unexpected result or conflict → **stop and report the exact output**. No force / reset / delete / recreate.
