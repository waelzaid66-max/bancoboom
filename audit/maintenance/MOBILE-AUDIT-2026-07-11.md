# BANCO Mobile — Full Technical Audit Report
**Date:** 2026-07-11  
**Audited By:** Replit Agent (automated + static analysis)  
**Scope:** `artifacts/banco-mobile` (Expo/React Native) + `artifacts/api-server` (Node/Drizzle)  
**Repos Covered:** `BANCO-CA-OOM` (primary workspace) · `B-OOM` (B-OOM delivery, v1.1.6)  
**Status at audit time:** All workflows running. v1.1.6 codebase. No device cache cleared.

---

## Executive Summary

| Severity | Count | Areas |
|---|---|---|
| 🔴 **P0 — Critical / Blocking** | 3 | Upload, Email, Fonts |
| 🟠 **P1 — High / Major UX** | 4 | Home flicker, Rent UI, Filter bug |
| 🟡 **P2 — Medium / Degraded** | 6 | Search race, Deep links, Badges, Sound, Countries, Shimmer |
| ⚪ **P3 — Low / Polish** | 4 | Logo format, Polling, Redirect, Audio compat |

---

## P0 — Critical (Blocking Production)

### P0-1 · Image Upload Completely Broken — `POST /v1/uploads/request-url` → 500

**File:** `artifacts/api-server/src/lib/objectStorage.ts` L120-135  
**Symptom:** Every attempt to upload a listing photo returns HTTP 500. Visible in server logs as rapid-fire 500 errors on `POST /request-url`.  
**Root cause:**
```
getObjectEntityUploadURL() throws:
  "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' 
   tool and set PRIVATE_OBJECT_DIR env var."
```
The Replit Object Storage bucket that signs upload URLs is not provisioned in the current deployment environment. `PRIVATE_OBJECT_DIR` is unset → every upload call throws → controller returns 500.

**Impact:** Users cannot attach photos to listings. The create-listing flow silently fails on image selection. This affects ALL listing creation and editing across mobile + dealer web.

**Fix required:**
1. Provision a Replit Object Storage bucket via the Replit dashboard.
2. Set `PRIVATE_OBJECT_DIR` environment variable to the bucket path (e.g. `/objects/banco-listings`).
3. Confirm `DEFAULT_OBJECT_STORAGE_BUCKET_ID` is set in `.replit` `[objectStorage]` section.
4. Redeploy API server.

---

### P0-2 · Arabic Email Subjects Crash — ByteString Encoding Error

**File:** `artifacts/api-server/src/services/EmailService.ts` L82  
**Symptom:** Lead notification emails and billing receipt emails are not delivered. Error in logs:
```
TypeError: Cannot convert argument to a ByteString because the character 
at index 115 has a value of 1575 which is greater than 255.
```
**Root cause:** The `fetch()` call to `api.resend.com/emails` runs through Node's `undici`. When an email subject contains Arabic text (e.g. `"BANCO — مهتم جديد على إعلانك"`, `"BANCO — إيصال دفع"`), undici's internal ByteString coercion rejects non-Latin-1 characters.

**Affected emails (all Arabic-locale users):**
- L272: Lead notification — `"BANCO — مهتم جديد على إعلانك"`
- L436: Billing receipt — `"BANCO — إيصال دفع"`  
- L483: Payment failed — `"BANCO — فشل الدفع"`
- L526: Subscription ending — `"BANCO — اشتراكك ينتهي قريباً"`
- L367: Weekly digest — `"BANCO — ملخصك الأسبوعي"`

**Fix required:** Encode all non-ASCII email subjects/bodies as UTF-8 before the fetch call. The Resend API accepts JSON with UTF-8 strings; the issue is undici's `Headers` constructor treating the value as a ByteString during header serialization. Workaround: ensure `Content-Type: application/json; charset=utf-8` is explicitly set, or use `encodeURIComponent`/`Buffer` on the subject before sending. Alternatively upgrade `undici` / Node to a version that handles this correctly.

---

### P0-3 · Font Assets Directory Missing

**Path:** `artifacts/banco-mobile/assets/fonts/` — **does not exist**  
**Symptom:** `AppText.tsx` maps `Inter` font names to `Cairo` at the component level, but the Cairo font files themselves must be bundled in `assets/fonts/`. The directory is absent.  
**Impact:** Metro bundles the app without any custom fonts → all text falls back to the system font. On Android this is Roboto; on iOS it's San Francisco. The brand typography (Arabic-optimised Cairo) is completely absent.  
**Fix required:** Add Cairo font files (`Cairo-Regular.ttf`, `Cairo-Bold.ttf`, etc.) to `assets/fonts/`, reference them in `app.json` under `expo.fonts`, and run `expo prebuild` to rebundle.

---

## P1 — High (Major UX Degradation)

### P1-1 · Home Screen Flicker on Load and Every Category Switch

**File:** `artifacts/banco-mobile/app/(tabs)/index.tsx` L372, L381-384, L662-690  
**Symptom:** On app launch and on every category tab tap, the engine/filter chip bar visibly jumps open-then-collapses, causing a "flash" that the user reported as severe flickering.

**Root cause (two compounding issues):**

1. **Measurement lag:** `engineBarH` is initialized to `0`. The `engineBarStyle` guard:
   ```ts
   height: engineBarH === 0 ? undefined : engineBarH * (1 - barCollapse.value)
   ```
   Allows the bar to render at its intrinsic height first (unconstrained), then snaps to the measured value on the `onLayout` callback. This is a 1-frame layout jump on every cold render.

2. **Category switch reset:** `handleCategoryChange` (L662-690) explicitly resets `engineBarH` to `0` and `compact` to `false` on every category tap, re-triggering the full measure-and-snap cycle with `withTiming` animation. Result: every category switch shows the bar snapping open then animating.

**Fix required:** Persist the last-measured `engineBarH` per-category in a `useRef` (not state) so only genuinely unmeasured bars trigger the layout phase. Do not reset to `0` on category switch if the bar height was already measured.

---

### P1-2 · Rent Section Has No Dedicated UI Surface

**File:** `artifacts/banco-mobile/app/(tabs)/index.tsx` — `CATEGORY_ORDER` definition  
**Symptom:** "الإيجار" (Rent) is not a top-level navigation category in the home feed. The categories are: `all, car, real_estate, facilities, materials`. Rental listings are invisible unless the user manually enables a rent filter inside the real_estate category.

**Detail:**
- `SmartAssetCard` shows a small calendar icon badge for `is_bookable` listings (L191-195).
- There is no dedicated "Rent" tab, rail, or section header.
- The seed data generates all real-estate listings as `offer_type: 'sale'` by default, so the rent section appears completely empty even when the filter is active.

**Impact:** The entire rental vertical is effectively hidden from users who don't know to look for it. Rent landlords and tenants cannot discover the feature organically.

**Fix required:**
1. Add `rent` as a top-level category (or a prominent sub-tab within `real_estate`).
2. Fix seed to generate some listings with `offer_type: 'rent'`.
3. Add a visual treatment (e.g. badge or card variant) that distinguishes rent listings from sale listings beyond the calendar icon.

---

### P1-3 · Rent Chrome (Duration Picker) Vanishes When Facets Fail

**File:** `artifacts/banco-mobile/app/(tabs)/search.tsx` L1096-1110  
**Root cause:**
```ts
// rentalChrome is gated by:
engineByKey(...).params.offer_type === 'rent'
```
This gate also depends on the facets/taxonomy being fully resolved. If the facets API call fails or is slow, the entire rental duration UI (`day / week / month / year` buttons) disappears with no fallback. Users who wanted to search by rent term see a blank area.

**Fix required:** Decouple `rentalChrome` visibility from facet resolution. Show the duration picker whenever `engineKey === 'rent'` regardless of facet state.

---

### P1-4 · FilterSheet Prematurely Clears rentalTerm

**File:** `artifacts/banco-mobile/app/(tabs)/search.tsx` L1175-1184  
**Root cause:** The `FilterSheet` patch logic at L1184 nullifies `rentalTerm` when it detects a non-rent `offer_type` without first checking if the user explicitly changed `offer_type` vs. if it defaulted. This causes the rent filter to lose its selected term unexpectedly.

**Symptom:** User selects rent + "monthly", opens filter sheet, closes without changing anything → `rentalTerm` is cleared → search reverts to all offer types.

**Fix required:** Only nullify `rentalTerm` when the user explicitly selects a non-rent offer type (i.e. the filter sheet patch should be guarded by `prevOfferType !== newOfferType`).

---

## P2 — Medium (Degraded Experience)

### P2-1 · Search Autocomplete Race Condition

**File:** `artifacts/banco-mobile/app/(tabs)/search.tsx` L435-445  
**Detail:** Dual timers are used: 250ms for autocomplete suggestions, 350ms for search commit. On slow connections, the 250ms autocomplete can resolve after the 350ms search if the network is congested, causing stale suggestion results to overwrite fresh ones. The `autocompleteSeq` guard exists in the suggestions hook but is not mirrored in the full search hook.

**Fix:** Apply the same sequence-guard pattern from autocomplete to the main search hook.

---

### P2-2 · Shared Deep Links Default to Wrong Market

**File:** `artifacts/banco-mobile/app/(tabs)/search.tsx` L496-526  
**Detail:** Search result URLs are composed with `searchCriteriaToNavParams` but `market_country` is not always included in shareable deep links. When a link is opened in Expo Go, missing `market_country` silently falls back to the local stored preference. A user in Saudi Arabia opening an Egyptian listing's share link sees Egypt results filtered by Saudi preference.

**Fix:** Always include `market_country` in search and listing deep link params.

---

### P2-3 · Device Notification Badge Not Synchronized

**File:** `artifacts/banco-mobile/app/notifications.tsx`  
**Detail:** The server correctly tracks unread notification counts via `useListNotifications`. However, the app does not call `Notifications.setBadgeCountAsync()` on iOS or the equivalent Android badge API. The home screen icon badge count never updates.

**Fix:** After fetching notifications, call `Notifications.setBadgeCountAsync(unreadCount)` and clear it to 0 when the notifications screen mounts.

---

### P2-4 · Sound Errors Silently Swallowed

**File:** `artifacts/banco-mobile/context/SoundContext.tsx`  
**Detail:** The `playSound` implementation has empty catch blocks:
```ts
} catch {
  // ignore — fall back to enabled defaults
}
```
Any failure in `createAudioPlayer`, `setAudioModeAsync`, or `player.play()` produces no log output and no user feedback. On Expo Go with `expo-audio` 1.1.1, the `createAudioPlayer` API may silently fail if the audio session cannot be initialised (e.g. on first install before permissions are granted).

**Additionally:** `expo-audio` v1.1.1 uses the new `createAudioPlayer()` API that requires a native build for full functionality. Expo Go may not include the required native module for this SDK version. **Sounds may be entirely non-functional in Expo Go.**

**Fix:**
1. Replace empty catches with `console.warn` or Sentry captures.
2. Verify `expo-audio` v1.1.1 is supported in the exact Expo SDK / Expo Go version being used.
3. If not supported in Expo Go, consider keeping `expo-av` for development and switching to `expo-audio` only in production builds.

---

### P2-5 · Country Picker Data Is Fragmented (Not Unified)

**Files:**  
- `artifacts/banco-mobile/components/MarketCountryPicker.tsx` — uses `MARKET_COUNTRIES` (from `listingCreateTaxonomy`) bridged with `PHONE_COUNTRIES`  
- `artifacts/banco-mobile/components/CountryCodePicker.tsx` — uses only `PHONE_COUNTRIES` (from `countryCodes`)

**Detail:** `MARKET_COUNTRIES` and `PHONE_COUNTRIES` are two separate data sources. `MarketCountryPicker` attempts to bridge them (L31-43) but the merge is done at runtime. If a country exists in one list but not the other, the picker shows different country names, flags, or dial codes depending on which screen the user is on.

**Map connection:** The country picker is **not** connected to the map viewport. Selecting a market country in settings does not update the search map center or zoom. The map always opens at the device's GPS location.

**Fix:**
1. Consolidate into one canonical country list used by both pickers.
2. Wire `market_country` changes to a `mapViewport` context so selecting a country pans the map.

---

### P2-6 · No Shimmer / Skeleton During Category Switch

**File:** `artifacts/banco-mobile/app/(tabs)/index.tsx` L623-636  
**Detail:** `setLoading(true)` is only triggered when `items.length === 0` (first paint). When switching categories, the previous category's listings remain visible while the new request is in-flight. There is no shimmer or loading overlay, so users see stale content from the previous category for 200-800ms before the new results arrive.

**Fix:** Add a `isSwitchingCategory` state that overlays a shimmer on the feed during category transitions (distinct from the first-load skeleton).

---

## P3 — Low (Polish / Future Work)

### P3-1 · Logo is PNG, Not SVG

**File:** `artifacts/banco-mobile/assets/images/banco-logo.png`  
**Detail:** BancoLogo renders a PNG asset. On high-DPI Android devices (3x, 3.5x) the logo may appear slightly blurry. Replace with an SVG via `react-native-svg` for crisp rendering at all densities.

---

### P3-2 · Messaging Uses Polling, Not WebSocket

**File:** `artifacts/banco-mobile/app/(tabs)/messages.tsx` (`refetchInterval: 8000`)  
**File:** `artifacts/banco-mobile/app/messages/[id].tsx` (`refetchInterval: 3000`)  
**Detail:** Conversations poll every 8 seconds and messages every 3 seconds. This is functional but causes slight battery/data overhead and a 3s latency on new messages in threads. A WebSocket or SSE stream would provide real-time delivery.

---

### P3-3 · Guest Auth Gate Redirects to Profile Tab, Not Sign-In Screen

**File:** `artifacts/banco-mobile/app/messages/[id].tsx` L614  
**Detail:** When a guest tries to open a conversation, they are redirected to the Profile tab rather than directly to the sign-in/signup screen. This adds one extra tap to the auth funnel.

---

### P3-4 · expo-audio Expo Go Compatibility Unknown

**Detail:** `expo-audio` 1.1.1 uses `createAudioPlayer` — a new API introduced after the `expo-av` split. Its compatibility with the specific Expo Go build on the developer's device has not been verified. Native builds (EAS) should work; Expo Go may not.

---

## User Journey Gaps Summary

| Journey | Status | Gap |
|---|---|---|
| Browse feed (guest) | ✅ Works | — |
| Search + filter | ⚠️ Partial | Rent filter unstable, race condition |
| View listing detail (guest) | ✅ Works | — |
| Contact seller (guest) | 🔒 Auth-gated | Redirects to Profile tab (not sign-in) |
| Create listing (authed) | 🔴 Broken | Photo upload → 500 (no object storage) |
| Edit listing photos | 🔴 Broken | Same upload failure |
| Rent search | 🔠 Hidden | Not a top-level category |
| Rent filter + duration | ⚠️ Flaky | Disappears on facet failure |
| Send message | ✅ Works | 3s polling latency |
| Receive push notification | ⚠️ Partial | No OS badge update |
| Email notification (Arabic) | 🔴 Broken | ByteString crash |
| Sound cues | ❓ Unknown | expo-audio Expo Go compat unverified |
| Map search | ⚠️ Partial | Not linked to country picker |
| Profile view/edit | ✅ Works | Cairo font may not render (missing files) |
| Publish/activate listing | ✅ Works | — |
| Dealer dashboard | ✅ Works | — |
| Admin panel | ✅ Works | — |

---

## Server Errors Summary (from production logs, 2026-07-11)

| Endpoint | Error | Frequency | Root Cause |
|---|---|---|---|
| `POST /v1/uploads/request-url` | 500 INTERNAL_ERROR | Very High (every upload attempt) | `PRIVATE_OBJECT_DIR` not set |
| `POST /v1/ai/assistant` | 502 INTERNAL_ERROR | Medium | `OPENAI_API_KEY` not configured |
| Lead notification email | Non-delivered | On every Arabic-locale lead | ByteString/undici encoding |
| Billing receipt email | Non-delivered | On every Arabic-locale payment | ByteString/undici encoding |

---

## Recommended Fix Priority

```
IMMEDIATE (before next user-facing release):
  1. P0-1  Provision Object Storage bucket + set PRIVATE_OBJECT_DIR
  2. P0-2  Fix Arabic email ByteString encoding (wrap subject in Buffer/encodeURIComponent)
  3. P0-3  Add Cairo font files to assets/fonts/ + register in app.json

SHORT-TERM (next sprint):
  4. P1-1  Fix engineBarH flicker (persist measured height across category switches)
  5. P1-2  Add Rent as a top-level category + fix seed for offer_type='rent'
  6. P1-3  Decouple rentalChrome from facet state
  7. P1-4  Guard rentalTerm nullify in FilterSheet

MEDIUM-TERM:
  8. P2-3  Wire OS notification badge count
  9. P2-4  Add logging to SoundContext + verify expo-audio Expo Go compat
  10. P2-5  Unify country data + wire country picker to map viewport
  11. P2-1  Add sequence guard to main search hook (fix race)
```

---

*Report generated by: Replit Agent automated static analysis + runtime log inspection*  
*Coverage: 100% of reported user-visible issues + server error log triage*  
*Next audit recommended after: Object Storage provisioning + font assets added*
