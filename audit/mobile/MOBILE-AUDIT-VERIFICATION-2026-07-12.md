# Mobile Audit — Verification & Fixes (v1.1.6)

**Date:** 2026-07-12 · **Verified by:** Claude (Lead Architect handover) · **Base:** B-OOM `main`
**Method:** every claim in the external "Replit Agent" mobile audit was checked against the
**current v1.1.6 source** before any change. Verify-before-fix — no blind edits.

---

## Executive result

The external audit is **substantially stale**: most items were already fixed in the waves,
describe environment (not code), or contradict an intentional design decision. Of 17 reported
items, **2 were genuine code defects** — both are now fixed, typechecked, and green on CI.

| Verdict | Count |
|---|---|
| ✅ Real → **FIXED** | 2 (home flicker, OS notif badge) |
| ❌ False / already-fixed | 8 |
| ⚙️ Environment (not code) | 1 |
| 🎛️ Intentional design | 3 |
| 🔵 Minor polish / preference (non-bug) | 3 |

Repo hygiene cross-check: **0 `TODO`/`FIXME`, 0 unwired/no-op handlers** across
`app/ components/ context/ hooks/ lib/` — no "built-but-not-connected" surfaces found.

---

## Fixed (real defects)

### ✅ P1-1 — Home engine-bar flicker on category switch
- **Root cause:** `handleCategoryChange` did `setEngineBarH(0)` on every switch, so the bar
  flashed open at its intrinsic height then snapped down on the next layout pass.
- **Fix:** cache the measured height per category (`barHeightByCatRef`) and seed the incoming
  category's known height (0 only when never seen); `onLayout` still self-corrects any delta.
  Worst case = old behaviour (first visit); common case = no flicker.
- **File:** `app/(tabs)/index.tsx` · mobile typecheck 0 · CI core green.

### ✅ P2-3 — OS app-icon notification badge never updated
- **Root cause:** nothing called `setBadgeCountAsync`; the OS badge never reflected unread.
- **Fix:** mirror `unreadNotifs` → `Notifications.setBadgeCountAsync` from the home screen
  (kept mounted; query refetches every 20s + on focus); clears to 0 when signed out / all read.
- **File:** `app/(tabs)/index.tsx` · `expo-notifications@0.32.17` · CI core green.

---

## Not a code defect (verified)

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| P0-1 | Upload → 500 | ⚙️ **Environment** | `PRIVATE_OBJECT_DIR` unprovisioned on the Replit deploy; code is correct. AWS path uses the S3 adapter (`OBJECT_STORAGE_PROVIDER=s3`). Fix = provision a bucket. |
| P0-2 | Arabic email ByteString crash | ❌ **False** | Subject is in the JSON **body** (`EmailService.ts` L88–94); headers are ASCII-only. `fetch` sends the body UTF-8. If mail isn't delivered it's because `RESEND_API_KEY` is unset → `LogTransport` (by design). |
| P0-3 | Cairo fonts missing | ❌ **False** | Fonts load via `@expo-google-fonts/cairo@0.4.2` + `inter@0.4.0` through `useFonts` — **not** `assets/fonts/` (correctly absent). |
| P1-2 | Rent hidden / seed has no rent | ❌ **False + by design** | Rent is an `offer_type` filter inside `real_estate` **by design** (not a top-level category). Seed **does** create rent: `seed.ts:1360` `i % 3 === 0 ? "rent" : "sale"`. |
| P1-3 | Rent duration UI vanishes on facet failure | 🔵 low / needs device | Facet-gating is guarded (`facetsLoading`), but visual disappearance is a device-observable case; not reproducible from code alone. |
| P1-4 | FilterSheet clears `rentalTerm` | ❌ **Already fixed** | Current code latches the rent engine on term-select and only clears on explicit user action (`search.tsx` L1175–1189). |
| P2-1 | Search race condition | ❌ **False** | `autocompleteSeq` guard exists (`search.tsx` L390/398/422/425); committed search is React-Query-managed (request dedup by key). |
| P2-2 | Deep links drop `market_country` | ❌ **False** | Included end-to-end: `searchNavParams.ts` L28/L55, `buildSearchParams.ts` L96–97, `url.ts` L109–111. |
| P2-4 | Sound errors swallowed | 🔵 minor / intentional | `SoundContext.tsx` uses best-effort empty catches (sound must never crash a flow). `expo-audio` Expo-Go compat is device/env. |
| P2-5 | Country data fragmented; map not linked | ❌ **False / by design** | `buildMarketCountryOptions()` merges both sources with a `Set` dedup correctly. Map shows the search-criteria clusters (market flows via search), not an auto-pan — a design choice. |
| P2-6 | No shimmer on category switch | 🎛️ **Intentional** | `index.tsx` L631 comment: home never flashes an empty skeleton; only true first load uses the full skeleton (keeps prior results visible). |
| P3-1 | Logo PNG not SVG | 🔵 polish | Non-bug; PNG is bundled and renders. |
| P3-2 | Messaging polls (8s/3s) | 🎛️ **Intentional** | Documented architecture: no websockets; chat uses polling. |
| P3-3 | Guest → Profile tab, not sign-in | 🔵 preference | The Profile tab is where sign-in lives in this app; one-tap difference. Non-bug. |

---

## Genuinely remaining (need the device / your environment — cannot be verified from code)

- **Messenger visual issues (RTL alignment, send-icon direction, bubble alignment):** reported
  as *seen on device*. These are **device-observable only** — a blind code edit would be a guess.
  → Requires `eas build --profile preview` + on-device capture of the exact defect.
- **Live blockers (environment, not code):** object-storage bucket (`PRIVATE_OBJECT_DIR`),
  `RESEND_API_KEY`, `OPENAI_API_KEY`, Replit redeploy for wave-8, Clerk **live** keys.

---

## CI status at report time

`CI (core) · CI Website · CI Website Docker` — **all green** on B-OOM `main`. `deploy.yml` (AWS)
requires OIDC/SSM secrets and is expected to stay pending until those are provided.

**Bottom line:** the shipped v1.1.6 mobile codebase is in good shape; the external audit's
"blocking" items did not reproduce against current source. The two real defects are fixed.
