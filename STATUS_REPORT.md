# BANCO Store — Completion & Status Report

_Last updated: 2026-07-19 — Session adds: Discover Map FAB + profile useMemo + staleTime. Local main @ `cb2397f` (2 commits ahead origin). GitHub PAT invalid — push pending. TypeScript 0 errors across all packages._

> **Release line:** `main` @ `cb2397f` — Replit publish source is this GitHub repo (`-BANCO-CA-OOM-`). Pull `main` for the safe full-stack copy (API · mobile · admin · dealer · landing). **`banco-web` remains CI-isolated** (path-filtered `ci-website.yml`; no `.replit-artifact`).

This is the live status of the BANCO Store monorepo (Banco Mobile · Banco Admin · Banco Market/dealer-os · API Server · shared libs). It records what is **done and verified**, the **architecture**, and the **honest remaining items** with the reason each is or isn't locally verifiable.

---

## 1. How verification works here

- **Backend (api-server):** **295 passed / 3 skipped** (includes geo map/list parity, map clusters, rental_term, industrial isolation).
- **Mobile regression:** **23 passed** (icons + lib-hardening + resilience).
- **ESLint:** `pnpm run lint` on `scripts/**` — **0 errors** (Node globals include `URL` for staging smoke).
- **Type safety (all surfaces):** `pnpm -r --if-present run typecheck` → **0 errors across 7 packages** (api-server, banco-mobile, admin-os, dealer-os, landing, mockup-sandbox, scripts).
- **API contract:** `lib/api-spec/openapi.yaml` is the source of truth → `orval` regenerates the typed client (`lib/api-client-react`) + zod (`lib/api-zod`). Generated diffs this session were **purely additive (0 deletions)**.
- **Build:** runs on CI (Linux). Locally on Windows the esbuild native binary differs, so **typecheck is the local proxy** for compilation.

---

## 2. Delivered & verified — cumulative through 2026-07-19

| Area | What | Verification |
|---|---|---|
| **Discover Map FAB** | search.tsx: Map button now appears in discover state (before any query). wantMap latch auto-enables map mode when results arrive. | TypeScript 0 errors |
| **Profile performance** | profile.tsx: menuItems wrapped in useMemo (deps: showRentalHub/isBusiness/isFi/t); staleTime 60s on 4 concurrent queries; useMemo import added | TypeScript 0 errors |
| **BOOM STAY header** | StaysHomeHeader.tsx (442 lines) — premium black 4-band header replacing rose hero | TypeScript 0 errors |
| **Profile menu button** | Moved from cover overlay to avatarRow (next to Edit Profile) | TypeScript 0 errors |
| **Server-side map clustering** | `GET /v1/search/map` → grid-clustered pins for a viewport, reusing the **exact** search filters. **Live check: 14-16 clusters for Egypt viewport.** | DB test + live API call |
| **Map UI wired to viewport clusters** | Leaflet/WebView map reports viewport (debounced) → fetches `/search/map` → injects clusters, count bubbles drill in, off-page singles open by id. | Wired on Replit; typecheck 0 |
| **Coordinates in DB** | 128/134 active listings have locationId; all 21 locations have real WGS84 centroids; COALESCE(listing.lat, location.lat) resolves correctly | DB direct query |
| **Messenger mini composer** | Quick-emoji strip collapsed behind Messenger-style smiley toggle | typecheck 0 |
| **Rental systems** | `rental_term` across create + search + feed + map; 8-country market catalog | DB test |
| **Search speed at scale (GIN trigram)** | `idx_listings_title_trgm` + `idx_listings_description_trgm` | DB test |
| **Admin "control keys"** | Full plan management via `GET/POST/PATCH /admin/plans` + Plans & Pricing page | service tests |
| **Observability** | Structured error reporting + alert webhook + process-level capture. Mobile: global JS + React crash capture. | tests + wired |
| **Marketplace lifecycle** | publish → feed + search + SEO → message → favorite → edit → bump → archive → republish → delete | end-to-end DB test |
| **Billing export B4** | Invoice PDF download + monthly CSV; API `…/invoices/{id}/pdf` + `…/report.csv` | unit tests |
| **Mobile performance (RC)** | Home: parallel rails. Map: 300ms debounce + LRU cache. Search: facet normalize + seq guard. Session: debounced AsyncStorage. | 23 mobile regression tests |
| **Expo/EAS production readiness** | `app.config.ts` dynamic router; Metro monorepo; Android SDK 35; adaptive icon; iOS privacy | `production-confidence-check.mjs` |
| **Health smoke (P0)** | `GET /api/healthz`, `/api/livez`, `/api/readyz` (no Clerk) | `health.test.ts` |
| **Upload schema P0 (C-01)** | `ensureSchemaPatches` on boot + `ensureSchema.test.ts` | DB integration test |
| **PRs #32–#41 merged** | W1, FI-authz (8/8 green), Section G2, Section Sort, MOB-01/04/05, W4, Website phases 1–8 | GitHub CI 5/5 ✅ |

---

## 3. Content / i18n (reviewed — sound)

- Mobile i18n (`constants/i18n.ts`, ~3,925 lines) is **comprehensive**, English + Arabic in parallel, with **`ar: typeof en` parity enforced at typecheck** → no missing keys possible.
- No hardcoded user-facing English strings found in the mobile screens.
- The **AI assistant already replies in the user's language** (Egyptian Arabic if they wrote Arabic, else English).
- Conclusion: the translation layer is functionally sound.

---

## 4. Honest remaining items

| Item | Status | Why |
|---|---|---|
| **GitHub PAT push** | ⏳ Pending | `GITHUB_TOKEN` in Replit Secrets contains Arabic text, not a real token. Need valid PAT. |
| **RESEND_API_KEY** | ⚠️ Revoked | Emails go to log-only mode. App works, no emails delivered. |
| **PAYMOB keys** | ⚠️ Test values | `PAYMOB_SECRET_KEY` = 6 chars (likely placeholder). Production keys needed. |
| **OPENAI_API_KEY** | ❌ Not set | AI Assistant falls back silently. |
| **Image-upload byte path** | Object-storage config fixed; byte path not locally testable | Needs Replit Object Storage env — verify on real device. |
| **Replit-env runtime blockers** | tracked | OTP email delivery · Google Sign-In · Apple Sign-In · GPS · push notifications · AI key |
| **Real-device QA** | — | Android/iPhone device runs, store forms, load testing |
| **EAS / app stores** | — | `release/STORE_PUBLISHING_GUIDE.md` |
| **GCP Console triggers** | — | `deploy/gcp/TRIGGER_MIGRATION.md` |

---

## 5. Sections, journeys & "no feature blocks another"

The four markets (cars · real-estate incl. land · industrial/factories · B2B) all flow through **one** search + map + filter engine. Per-section filters are additive and independent. Adding a filter once makes it work in **both** the list and the map (single source of truth: `SearchService.ts`).

---

## 6. Path to 100% (next actions)

1. **Fix GITHUB_TOKEN** → push 2 pending commits to origin/main.
2. **Verify Replit-env runtime blockers** on device (uploads, OTP, GPS, push, AI).
3. **RESEND_API_KEY** → get new key from resend.com.
4. **PAYMOB production keys** → from Paymob Dashboard.
5. **EAS build + store submission** → `release/STORE_PUBLISHING_GUIDE.md`.
6. **GCP deploy** → `deploy/gcp/reports/00-README.md`.

---

## 7. Commits pending push (local main ahead of origin)

```
cb2397f chore(memory): update map coordinates + search FAB findings
79dc2de perf(mobile): menuItems useMemo + staleTime + discover map FAB
```

These are clean, TypeScript-verified commits waiting for a valid GitHub PAT.

---

*Work continues in the same environment; this report and the codebase are kept in sync on each push.*
