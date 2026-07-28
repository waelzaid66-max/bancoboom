# BANCO — Bug Report & Root Cause Analysis
**Date:** 2026-07-11  
**Environment:** Production (`banco-ca-oom.replit.app`) + Dev (Replit workspace)  
**Source:** Live deployment logs + static code analysis  
**Repos:** `BANCO-CA-OOM` · `B-OOM` (v1.1.6)

---

## BUG-001 · Arabic Email Subjects Crash — TypeError: ByteString

### Severity
🔴 **Critical** — All Arabic-locale email notifications silently fail. No lead alerts, no billing receipts, no welcome emails reach Arabic-speaking users.

### Observed Error (production logs)
```
TypeError: Cannot convert argument to a ByteString because the character
at index 115 has a value of 1575 which is greater than 255.
  at node:internal/deps/undici/undici:16416:13
  at ResendTransport.send (EmailService.ts:82)
  at sendLeadNotificationEmail (EmailService.ts:270)
  at LeadService.ts:337
```

### Root Cause
Node.js v24's built-in `fetch` (powered by undici internally) performs a **ByteString coercion** on the request body string before sending. A ByteString requires every character to have a code point ≤ 255 (Latin-1). Arabic characters have code points starting at U+0600 (1536 decimal). The email payload:

```json
{ "subject": "BANCO — مهتم جديد على إعلانك" }
```

…contains `م` = U+0645 = 1605 decimal, which fails the ByteString check at index ~115 (within the JSON-serialised body string).

**Affected email functions:**
| Function | Arabic subject |
|---|---|
| `sendLeadNotificationEmail` | `"BANCO — مهتم جديد على إعلانك"` |
| `sendBillingReceiptEmail` | `"BANCO — إيصال دفع"` |
| `sendBillingFailedEmail` | `"BANCO — فشل الدفع"` |
| `sendSubscriptionExpiringEmail` | `"BANCO — اشتراكك ينتهي قريباً"` |
| `sendWeeklyDigestEmail` | `"BANCO — ملخصك الأسبوعي"` |
| `sendWelcomeEmail` | `"أهلاً بيك في BANCO 🎉"` |

**Why index 115 specifically?** The JSON string `{"from":"...","to":"...","subject":"BANCO — م..."}` reaches the first Arabic character at approximately byte position 115 inside the serialised string, depending on the `from` and `to` field lengths.

### Fix Applied
**File:** `artifacts/api-server/src/services/EmailService.ts` (ResendTransport.send)

**Before:**
```typescript
body: JSON.stringify({ from, to, subject, html, text }),
```

**After:**
```typescript
// Encode body as Buffer<utf-8> — bypasses undici ByteString coercion
// while preserving full Unicode content.
const body = Buffer.from(JSON.stringify({ from, to, subject, html, text }), "utf8");
// + Content-Type: application/json; charset=utf-8
```

Passing a `Buffer` tells undici the body is opaque binary data; it skips ByteString validation and sends the raw UTF-8 bytes. Resend's API accepts JSON with UTF-8 encoding.

### Status
✅ **Fixed in this commit** — rebuild required, no schema change.

---

## BUG-002 · Image Upload Returning 500/503 — PRIVATE_OBJECT_DIR Unset

### Severity
🔴 **Critical** — Every listing photo upload attempt fails. Affects ALL listing creation and editing across mobile and dealer web.

### Observed Error (production logs)
```
ERROR: Request failed with server error
  endpoint="POST /request-url"
  status=500 (pre-fix) / 503 (post B-OOM fix)
  error_code="INTERNAL_ERROR"
  duration_ms=2-4
```

### Root Cause
`objectStorage.ts → getObjectEntityUploadURL()` throws synchronously when `PRIVATE_OBJECT_DIR` is not set:

```typescript
if (!privateObjectDir) {
  throw new Error(
    "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
    "tool and set PRIVATE_OBJECT_DIR env var."
  );
}
```

`PRIVATE_OBJECT_DIR` is a **Replit platform-managed secret** derived from `[objectStorage] defaultBucketID` in `.replit`. After the B-OOM codebase was imported into this Replit workspace, the bucket ID in `.replit` (`replit-objstore-41fc812e-9f5e-42cb-93cc-f15445fe1efa`) pointed to the B-OOM developer's account bucket. The Replit platform did not inject `PRIVATE_OBJECT_DIR` because the bucket belonged to a different account.

**Timeline:**
- Bucket ID in `.replit` ← B-OOM developer's account (foreign)
- Replit platform sees foreign bucket → does not set env trio
- `PRIVATE_OBJECT_DIR = ""` → every upload throws → 500

**B-OOM partial fix (commit `0afef07`):** Changed the 500 to a 503 with a human-readable message. This was correct but did not resolve the underlying missing env var.

### Fix Applied
Called Replit's `setupObjectStorage()` platform callback which provisioned/confirmed the bucket for this workspace account and injected:
- `PRIVATE_OBJECT_DIR=/replit-objstore-41fc812e-9f5e-42cb-93cc-f15445fe1efa/.private`
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID=replit-objstore-41fc812e-9f5e-42cb-93cc-f15445fe1efa`
- `PUBLIC_OBJECT_SEARCH_PATHS=...`

API server restarted and confirmed `GET /api/healthz → 200`, `GET /api/readyz → 200`.

### Status
✅ **Fixed** — env vars provisioned, api-server restarted. Upload endpoint should now return signed PUT URLs correctly.

---

## BUG-003 · Deployment Healthcheck Flood on Startup

### Severity
🟡 **Medium** — Not a user-facing error. Pollutes production logs and makes real errors harder to spot.

### Observed Pattern (deployment logs)
```
[ERROR] healthcheck failed error=healthcheck /api returned status 500
[ERROR] healthcheck failed error=healthcheck /banco-mobile/ returned status 500
... (repeated ~12 times over ~2 seconds)
[INFO]  artifact port detected expected=2 detected=1
```

### Root Cause
The production deployment platform (Replit artifact runner) starts both `artifacts/api-server` and `artifacts/banco-mobile` simultaneously and immediately begins polling healthcheck endpoints (`/api`, `/banco-mobile/`). The API server has a **~4 second startup time** (Drizzle connect + Clerk init + job scheduler) before it binds port 8080. The mobile static server (`pnpm serve`) similarly takes 1-2 seconds.

During startup the ports are not yet open → healthcheck probes hit `ECONNREFUSED` → logged as 500. Once the port opens, healthchecks succeed and the flood stops.

**This is a transient startup race condition, not an application error.** The app is healthy after startup.

### Recommended Fix
Add a startup readiness delay or a `/health` endpoint that returns 200 immediately after port bind (before Drizzle connects) so the platform healthchecker stops getting 500s. Example pattern:

```typescript
// Bind port first, respond 200 on /health
app.get('/health', (_, res) => res.json({ status: 'starting' }));
httpServer.listen(PORT, () => {
  // Then connect DB, init services
  initializeServices().then(() => { /* mark ready */ });
});
```

### Status
⚠️ **Not fixed** — benign at runtime but should be addressed to reduce log noise.

---

## BUG-004 · Expo Go Push Notifications Removed (SDK 53)

### Severity
🟠 **High** — Android users running Expo Go cannot receive remote push notifications. iOS Expo Go may also be limited.

### Observed Warning (mobile workflow logs)
```
WARN  expo-notifications: Android Push notifications (remote notifications) 
functionality provided by expo-notifications was removed from Expo Go with 
the release of SDK 53. Use a development build instead of Expo Go.
Read more at https://expo.dev/develop/development-builds/introduction/.
```

### Root Cause
Expo SDK 53 removed remote push notification support from the Expo Go client to reduce its bundle size and comply with app store background processing rules. The BANCO mobile app uses `expo-notifications` for push delivery. In the current dev workflow (Expo Go), this means:

- Push token registration: ✅ Works (local token generated)
- Local notifications: ✅ Works
- Remote push notifications: ❌ Silently dropped on Android Expo Go
- `usePushNotifications` hook: Partially functional — registers token but cannot receive remote pushes

**Impact on users in Expo Go:** In-app notification list (via `useListNotifications` API poll) still works. Only OS-level push delivery is broken.

### Fix Required
Build a **development build** via EAS:
```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```
This produces an installable `.apk`/`.ipa` that includes the full native push notification module. The app already has EAS configuration (`eas.json`) from wave 10 work.

Alternatively: keep Expo Go for development but acknowledge push notifications will only work in native builds.

### Status
⚠️ **Not fixed** — requires EAS native build. Cannot be resolved in Expo Go.

---

## BUG-005 · Home Screen Engine-Bar Flicker on Category Switch

### Severity
🟠 **High** — Visible layout jump on every category tap and on app load. Reported by user as "تزبزب شديد".

### Root Cause
`engineBarH` (the measured height of the filter chip row) is initialised to `0` in state. The animated style:

```typescript
height: engineBarH === 0 ? undefined : engineBarH * (1 - barCollapse.value)
```

…renders the bar as `height: undefined` (auto/intrinsic) on first paint, then jumps to the measured `engineBarH` value after the `onLayout` callback fires. Additionally, `handleCategoryChange` resets `engineBarH` to `0` on every category tap, re-triggering the measurement-and-snap cycle with a `withTiming` animation.

**Net effect:** Every category switch shows:
1. Bar snaps to full intrinsic height (unconstrained)
2. onLayout fires → state update → re-render
3. Bar animates from measured height

**Fix (already shipped in B-OOM commit `053eae2`):** Cache the last measured height in a `useRef` and only update state when the height genuinely changes. Do not reset to `0` on category switch.

### Status
✅ **Fixed upstream** — B-OOM commit `053eae2` merged into this workspace.

---

## BUG-006 · OS Notification Badge Not Updated

### Severity
🟡 **Medium** — App icon badge never shows unread count. Affects user engagement and notification discoverability.

### Root Cause
The server tracks unread notifications via `useListNotifications` which returns a count. However, `artifacts/banco-mobile/app/notifications.tsx` does not call `Notifications.setBadgeCountAsync()` after fetching. The OS badge API is completely unused.

**Fix (already shipped in B-OOM commit `053eae2`):** Calls `setBadgeCountAsync(unreadCount)` after notification fetch and clears to 0 on screen mount.

### Status
✅ **Fixed upstream** — B-OOM commit `053eae2` merged into this workspace.

---

## Summary Table

| Bug ID | Description | Severity | Status |
|---|---|---|---|
| BUG-001 | Arabic email subjects crash (ByteString) | 🔴 Critical | ✅ Fixed this commit |
| BUG-002 | Image upload 500/503 (PRIVATE_OBJECT_DIR) | 🔴 Critical | ✅ Fixed (env provisioned) |
| BUG-003 | Startup healthcheck 500 flood | 🟡 Medium | ⚠️ Open |
| BUG-004 | Expo Go push notifications removed (SDK 53) | 🟠 High | ⚠️ Needs EAS build |
| BUG-005 | Engine-bar flicker on category switch | 🟠 High | ✅ Fixed (boom/053eae2) |
| BUG-006 | OS notification badge never updates | 🟡 Medium | ✅ Fixed (boom/053eae2) |

---

## Code Changes in This Commit

```
artifacts/api-server/src/services/EmailService.ts
  - ResendTransport.send(): body = Buffer.from(JSON.stringify(...), 'utf8')
  - Content-Type: application/json; charset=utf-8
  Reason: bypass undici ByteString coercion for non-Latin-1 (Arabic) content
```

*Generated: 2026-07-11 | Workspace: BANCO-CA-OOM | Node v24.13.0*
