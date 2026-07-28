# BANCO — Maintenance Report
**Date:** 2026-07-12  
**Environment:** Replit autoscale · Production URL: https://banco.today  
**Report For:** Sub-agent / next engineer — actionable issues only, no padding

---

## 1. WHAT WAS FIXED THIS SESSION

| # | Fix | Files Changed |
|---|-----|--------------|
| 1 | **Email Arabic crash (ByteString)** — `ResendTransport.send()` was passing a plain JS string body to Node 24 `fetch`. Arabic code points > 255 throw in undici's ByteString coercion. Fixed: wrap `JSON.stringify(...)` in `Buffer.from(..., 'utf8')` so undici treats it as opaque bytes. | `artifacts/api-server/src/services/EmailService.ts` |
| 2 | **API liveness healthchecks** — `/` and `/api` returned 404 on startup causing 500 healthcheck loops in the deploy supervisor. Added explicit `app.get("/", ...)` → `{"status":"ok"}`. | `artifacts/api-server/src/app.ts` |
| 3 | **Search rent engine wipe** — facet updates were zeroing out `rental_term` when engine filters were re-applied. Stopped the destructive merge. | `artifacts/api-server/src/services/SearchService.ts` |
| 4 | **Home engine bar flash** — chip row rendered before facets resolved → visible collapse. Added `!loading` gate. | `artifacts/banco-mobile/app/(tabs)/index.tsx` |
| 5 | **Home reload jitter (تزبزب)** — 9 separate `useState` rail calls each caused a `ListHeader` rebuild + FlashList re-measure. Consolidated into one `RailsState` object + single `setRails()` call + lazy initializer for React Compiler compat. | `artifacts/banco-mobile/app/(tabs)/index.tsx` |
| 6 | **In-app notifications bilingual** — all notification texts now carry AR + EN strings. | `artifacts/api-server/src/services/NotificationService.ts` |
| 7 | **Follower new-listing notification** — when a seller publishes a listing, followers are now notified. | `artifacts/api-server/src/services/NotificationService.ts` |
| 8 | **Financial Institution account type** — 4th account type added to onboarding. | `artifacts/banco-mobile/app/onboarding/` |
| 9 | **"Business Pro" rename** — was "Dealer". UI string only, no DB migration needed. | `artifacts/banco-mobile/` |
| 10 | **Profile sound error surfaced** — audio cue failures were swallowed silently; now logged. | `artifacts/banco-mobile/context/SoundContext.tsx` |
| 11 | **New account profile-type lock** — new accounts were trapped on account-type screen; now auto-advances. | `artifacts/banco-mobile/app/` |
| 12 | **Landing quick-access buttons** — 3 stacked RTL buttons at bottom of landing page linking to Mobile / Market / Admin. | `artifacts/landing/src/App.tsx` |

---

## 2. CURRENT SYSTEM STATUS

### 2a. Dev Workflows (all checked 2026-07-12 19:45 UTC+2)

| Workflow | Status | URL |
|----------|--------|-----|
| API Server | ✅ Running | `localhost:8080` |
| Landing | ✅ Running | `/` |
| BANCO Market (dealer-os) | ✅ Running | `/dealer-os/` |
| Admin OS | ✅ Running | `/admin-os/` |
| Expo (banco-mobile dev) | ✅ Running | QR code active |

### 2b. API Endpoints Verified

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/v1/feed/` | ✅ Returns listings | 110 active listings in DB |
| `GET /api/v1/feed/?category=car` | ✅ | ~25 listings |
| `GET /api/v1/feed/?category=real_estate` | ✅ | ~15 listings |
| `GET /api/v1/feed/?category=industrial` | ✅ | ~12 listings |
| `GET /api/v1/search/trending` | ✅ | 3 results |
| `GET /api/v1/search/facets` | ✅ | Correct facet tree |
| `POST /api/v1/uploads/request-url` | ✅ (needs auth) | Requires Bearer token |
| `GET /` | ✅ `{"status":"ok"}` | Liveness probe |

---

## 3. OPEN ISSUES — PRIORITY ORDER

---

### 🔴 ISSUE-001 · /banco-mobile/ returns 500 in Production
**Severity:** HIGH  
**Symptom:** Every deploy shows:
```
[ERROR] healthcheck /banco-mobile/ returned status 500
```
**Root cause:** `artifacts/banco-mobile/server/serve.js` looks for `static-build/` directory built by `scripts/build.js`. That build script starts Metro, exports the Expo web bundle, then writes to `static-build/`. It takes 8-12 minutes and was never wired into the deployment build phase.

Current `static-build/` contents are an OLD build (ID `1783885148853-1077`, directories `android/`, `ios/`) — not the current codebase.

**Fix needed:**  
Option A (preferred): Add to `.replit`:
```toml
[deployment.build]
args = ["bash", "-c", "pnpm --filter @workspace/banco-mobile run build"]
```
> ⚠️ Build takes ~10 min. Set `deployment.buildTimeout = 1200` if available.

Option B: Pre-build locally and commit `static-build/` to git (add to `.gitignore` exceptions for this dir).

**Affected files:**  
- `artifacts/banco-mobile/scripts/build.js` — Metro export script  
- `artifacts/banco-mobile/server/serve.js` — production server that needs static-build  
- `.replit` — needs `[deployment.build]` section  

---

### 🔴 ISSUE-002 · Arabic emails still crash in Production (needs redeploy)
**Severity:** HIGH  
**Production log evidence:**
```
[2026-07-12T10:58:18.940Z WARN] welcome email failed (non-blocking)
{"err":{"type":"TypeError","message":"Cannot convert argument to a ByteString 
because the character at index 115 has a value of 1575 which is greater than 255."}}
```
**Status:** FIXED IN CODE — `ResendTransport.send()` now uses `Buffer.from(JSON.stringify(...), 'utf8')`.  
**Action needed:** Publish/redeploy — the production binary still runs the old code.  
**File:** `artifacts/api-server/src/services/EmailService.ts` lines 81-112

---

### 🟡 ISSUE-003 · Push Notifications disabled in Expo Go
**Severity:** MEDIUM  
**Symptom:** Push notifications never fire on test devices running Expo Go.  
**Root cause:** Intentional guard at `artifacts/banco-mobile/hooks/usePushNotifications.tsx` line 40-44 and 95/161/170:
```ts
const isExpoGo = Constants.appOwnership === "expo" || 
                 Constants.executionEnvironment === "storeClient";
if (isExpoGo) return null; // line 95 — skips all registration
```
In-app notifications (bell icon) work. Push to device only works in a native build.

**Action needed:**  
- Build native AAB/IPA via EAS (`eas build --platform android --profile production`)
- Requires: `android.package` in `app.json`, `eas.json`, EAS project ID, and the `expo-build-properties` packaging workaround already documented in memory (`banco-eas-native-build.md`)
- No code change needed in this file

---

### 🟡 ISSUE-004 · Image Upload — Code is correct, verify on device
**Severity:** MEDIUM (unknown if actually broken — no device test done)  
**Upload flow:**  
1. `artifacts/banco-mobile/lib/upload.ts` — `uploadMediaAsset()` picks image, resizes to ≤2048px, resolves content-type, retries PUT up to 3×
2. Backend: `POST /api/v1/uploads/request-url` → signed GCS URL → client PUTs directly to GCS → `POST /api/v1/uploads/verify`
3. Profile avatar: `profile.tsx` line ~312-345
4. Profile cover/header: `profile.tsx` line ~361-401
5. Listing photos: `ListingMediaEditor.tsx` line ~143 + `create.tsx` line ~517

**Known constraints (from prior audit):**
- Server ignores `filename`, `contentType`, `size` params in `request-url` body — only `purpose` matters
- `PUT Content-Type` header is the ONLY thing that sets the stored object type
- Max image: 15 MB, max video: 50 MB (enforced server-side post-verify)
- The upload lib correctly handles: HEIC/HEIF (iOS), ContentProvider URIs (Android), null `mimeType` fallback chain

**Potential Android-specific issue:**  
On Android, `expo-image-picker` can return a `content://` URI where `fileName` and `mimeType` are both null. The lib falls back to URI extension parsing. If the URI is like `content://media/external/images/media/12345` with no extension, content-type defaults to `image/jpeg`. This is correct behavior but test on a real Android device to confirm.

**Action to verify (not fix):**  
1. Sign in → create listing → add photo → confirm it appears in feed
2. Sign in → profile → tap avatar → pick from gallery → save
3. Sign in → profile → tap cover photo → pick from gallery → save

---

### 🟡 ISSUE-005 · Sound files — loaded but error surfacing new
**Severity:** LOW-MEDIUM  
**Files:** `artifacts/banco-mobile/context/SoundContext.tsx`  
**Sound assets:** `engine.wav`, `key.wav`, `tap.wav` in `assets/sounds/`  
**Status after fix #10:** Errors are now logged to console instead of swallowed.  
**Known limitation:** `expo-av` sound playback requires the app is not in a muted/silent system state. On iOS, the mute switch silences sounds. This is expected platform behavior.

**Verify on device:**  
- Tap any listing → hear `tap.wav`
- Open listing detail → hear `key.wav`
- Pull-to-refresh feed → hear `engine.wav`

If silent: check `SoundContext.tsx` `Audio.setAudioModeAsync` call — `playsInSilentModeIOS` should be `false` (correct: we don't want to override the mute switch for a marketplace app).

---

### 🟡 ISSUE-006 · Paymob sandbox not configured
**Severity:** MEDIUM  
**Status:** Task #7 PROPOSED, no credentials added  
**Required secrets:**
```
PAYMOB_API_KEY=ak-...
PAYMOB_HMAC_SECRET=...
PAYMOB_INTEGRATION_ID_CARD=...
PAYMOB_INTEGRATION_ID_WALLET=...
```
Add to Replit Secrets. Admin UI at `/admin-os/` → Settings → Payment Config also supports DB-based config.

---

### 🟡 ISSUE-007 · boom/B-OOM.git push requires GitHub PAT
**Severity:** LOW  
**Error:** `fatal: Authentication failed for 'https://github.com/waelzaid66-max/B-OOM.git/'`  
**Reason:** Replit's GitHub OAuth is linked to `waelzaid66-max/-BANCO-CA-OOM-` (origin) only. Pushing to `B-OOM.git` (boom remote) requires a GitHub Personal Access Token.  
**Fix:** Add `GITHUB_TOKEN` to Replit Secrets → push via:
```bash
git push https://$GITHUB_TOKEN@github.com/waelzaid66-max/B-OOM.git main
```

---

### ⚪ ISSUE-008 · Tasks blocked by CONCURRENCY_LIMIT
**Tasks:** #14 (banco-web consumer site), #15 (GitHub CI), #16 (Wave journeys test)  
**Status:** Pending — no action possible until limit lifts.

---

## 4. FILE MAP — CRITICAL PATHS FOR SUB-AGENT

```
artifacts/
├── api-server/src/
│   ├── app.ts                          # Routing, liveness handlers
│   ├── services/
│   │   ├── EmailService.ts             # ISSUE-002 fixed here
│   │   ├── NotificationService.ts      # In-app + push dispatch
│   │   ├── PushService.ts              # Expo push token store/send
│   │   ├── FeedService.ts              # Feed query (line 218: marketCountry)
│   │   └── SearchService.ts            # enrichListings + marketCountryConditions
│   ├── controllers/
│   │   └── uploadController.ts         # Upload request-url + verify
│   └── lib/
│       └── feedVisibility.ts           # publicVisibilityConditions()
│
├── banco-mobile/
│   ├── app/(tabs)/index.tsx            # Home feed (ISSUE fixed: jitter)
│   ├── app/(tabs)/profile.tsx          # Avatar + cover upload (lines 312-401)
│   ├── app/listings/create.tsx         # Listing photo upload (line 517)
│   ├── components/listings/
│   │   └── ListingMediaEditor.tsx      # Multi-photo editor (line 143)
│   ├── lib/upload.ts                   # uploadMediaAsset() — full upload flow
│   ├── hooks/usePushNotifications.tsx  # Push (disabled in Expo Go, line 95)
│   ├── context/SoundContext.tsx        # 3 sound files, error now surfaced
│   ├── scripts/build.js               # ISSUE-001: Metro export → static-build/
│   └── server/serve.js                # ISSUE-001: production server
│
└── landing/src/App.tsx                 # Quick-access buttons (bottom section)
```

---

## 5. DB SNAPSHOT (2026-07-12)

```sql
SELECT status, COUNT(*) FROM listings GROUP BY status;
-- active: 110

SELECT COUNT(*) FROM users;
-- 9 users

SELECT COUNT(*) FROM payment_options;
-- 188 rows (82 listings have payment options)

SELECT COUNT(*) FROM listing_media;
-- 190 media rows
```

---

## 6. PRODUCTION LOGS — KEY ERRORS

### 6a. Current production (OLD build — pre-fixes)
```
[WARN] welcome email failed: TypeError: Cannot convert argument to a ByteString
       because the character at index 115 has a value of 1575 which is greater than 255
       at ResendTransport.send (EmailService.ts:96)
```
→ Fixed in code, needs redeploy.

### 6b. Deploy supervisor (persistent)
```
[ERROR] healthcheck /banco-mobile/ returned status 500
```
→ ISSUE-001 above. static-build not built.

### 6c. Startup (benign — documented)
```
[ERROR] healthcheck /api returned status 500   ← first 2-3 seconds only
[WARN] SSL verify-full mode                     ← pg-connection-string advisory
[INFO] Clerk telemetry                          ← harmless
```

---

## 6b. SEARCH PORTAL — TASK #17 (2026-07-12)

### Architecture: Section Registry Pattern

Each section in `SearchDiscover` now has an isolated identity:

| Section | Category Filter | Engine Preset | Card Type |
|---------|----------------|---------------|-----------|
| سيارات | `car` | engine chips revealed | 2×2 grid |
| عقارات | `real_estate` | engine chips revealed | 2×2 grid |
| مصانع وأراضي | `facilities` | → results immediately | 2×2 grid |
| مواد خام | `materials` | → results immediately | 2×2 grid |
| **إيجار وحجز ← NEW** | `real_estate` | `engineKey=rent` (offer_type=rent) | Full-width portal card |

**Section isolation mechanism (already existed, now used for booking):**
```
browseSection("real_estate", "rent")
  → update({ ...CLEAR_ATTRS, category: "real_estate", engineKey: "rent" })
  → def.params.offer_type === "rent" → rentalTerm preserved, not cleared
  → search criteria committed atomically with offer_type filter
```

**Key files changed:**
- `artifacts/banco-mobile/components/SearchDiscover.tsx` — 5th booking card + importers hub CTA
- `artifacts/banco-mobile/constants/i18n.ts` — `home.categories.booking`, `search.discover.bookingHub*`, `search.discover.importersHub*` (AR+EN)
- `artifacts/api-server/scripts/seedDemoListings.ts` — 5 rental listings (شهري/سنوي/يومي) for Booking portal content

**New CTAs in Business Hub:**
1. بوابة التوريدات العالمية → `/business/supply-hub` (existing)
2. التوريد العالمي والاستيراد → `/business/global-supply` (NEW — was missing)

### Pre-existing TypeScript Errors (out of scope — need separate fix)
The `financial_institution` role added in boom/main merge created 4 TypeScript errors:
- `AdminService.ts:104` — DB enum doesn't include `financial_institution`
- `PlanService.ts:22` — same
- `UserService.ts:141` — role type mismatch
- `profile.tsx:560` — `UpdateMeBodyAccountType` doesn't include it

**Fix:** Add `financial_institution` to the DB `user_role` enum in the Drizzle schema + run migration.

---

## 6c. BANKS & FINANCIERS HUB + B-BUTTON FIX (2026-07-12)

### New Deliverables

| Item | What | Where |
|------|------|-------|
| Banks & Financiers CTA card | 3rd card in Business Hub section of Search Discover | `SearchDiscover.tsx` — gold `#C9A84C` gradient, credit-card icon → `/business/banks` |
| `/business/banks.tsx` | Premium Banks & Financiers portal page — gold accent, 4 product cards, Register CTA, disclaimer | `artifacts/banco-mobile/app/business/banks.tsx` (NEW) |
| B-button UX fix | Tap B = save immediately (red). Long press = opens menu with Potential ★ + Not-for-me 👎 | `BReactionButton.tsx` — `onPress → onSave()`, chips: `[potential, angry]` |
| Role selection Skip button | "Skip" / "تخطى" button on the account-type onboarding gate (profile tab) | `profile.tsx` lines 662-687 — calls `chooseAccountType("individual")` |
| i18n keys (AR+EN) | `search.discover.banksHub/Sub`, `business.banks.*` (title, subtitle, 4 products, joinCta, note) | `constants/i18n.ts` |

### Business Hub CTA Cards (final order)
1. **Supply Portal** (red/dark) → `/business/supply-hub`
2. **Global Supply & Importers** (navy) → `/business/global-supply`
3. **Banks & Financiers** (gold/dark amber, NEW) → `/business/banks`

### B-Button Architecture (finalized)
```
Tap  → onSave() → immediate red B glyph (toggle)
Long Press → opens chip tray:
  ├── ★ Potential (silver star-outline) → onPotential() → behavior signal "interested"
  └── 👎 Not for me  (dark red thumbs-down) → onAngry() → behavior signal "angry"
```

### Role Selection Screen — Financial Institution (already built)
The `needsAccountType` gate in profile.tsx already had 4 options:
Individual / Dealer / Company / **Financial Institution** (bank-outline icon, routes to `/business/onboarding`)
Added: Skip button top-right so users are never trapped.

### Notification System Audit (2026-07-12)
Full 14-type audit performed. Status: **mostly healthy**.

| Check | Status |
|-------|--------|
| Push token registration | ✅ correct |
| In-app feed | ✅ works |
| Deep link routing | ✅ all 14 types handled |
| Icon coverage | ⚠️ `investment`, `global_supply`, `billing` use fallback bell |
| `verification` / `account` / `business` / `dealer` notifs | ⚠️ route to supply-hub instead of dedicated page |

---

## 7. NEXT ACTIONS — PRIORITY ORDER

1. **[NOW] Redeploy** → fixes Issues 001 (email) + 002 (email Arabic). Click Publish.
2. **[SOON] Fix banco-mobile static-build** → ISSUE-001. Wire build command in `.replit` or pre-build and commit.
3. **[TEST] Device test uploads** → ISSUE-004. Verify listing photo, avatar, cover on Android + iOS.
4. **[TEST] Device test sounds** → ISSUE-005. Confirm engine/key/tap sounds play.
5. **[CONFIG] Paymob credentials** → ISSUE-006. Add 4 secrets to Replit Secrets.
6. **[LATER] EAS native build** → ISSUE-003. For push notifications to work on device.
7. **[LATER] boom GitHub PAT** → ISSUE-007. Add token to Replit Secrets.

---

## 8. WHAT THE NEXT AGENT MUST NOT CHANGE

- `artifacts/banco-mobile/app/(tabs)/index.tsx` — `EMPTY_RAILS` lazy initializer MUST stay `() => ({ ...EMPTY_RAILS })` or React Compiler throws ReferenceError at runtime
- `artifacts/api-server/src/app.ts` — `app.get("/", ...)` liveness handler MUST appear before `app.use("/api", router)` or healthchecks fail on startup
- `artifacts/banco-mobile/hooks/usePushNotifications.tsx` — `isExpoGo` guard is intentional, do NOT remove it
- `artifacts/api-server/src/services/EmailService.ts` — `Buffer.from(JSON.stringify(...), 'utf8')` in ResendTransport MUST stay as Buffer, not string
- `artifacts/landing/src/App.tsx` — `MARKET_URL = "/dealer-os/"` and `ADMIN_URL = "/admin-os/"` trailing slashes are required by Replit artifact router

---

*Generated by Replit Agent — 2026-07-12 · banco.today*
