---
name: BANCO push notifications architecture
description: How remote push is wired on top of the in-app notification feed, and the invariants that keep it spam-free and consistent.
---

# Push fans out from the single createNotification chokepoint

Remote push (Expo push service) is sent from inside `createNotification`
(NotificationService), AFTER the in-app row insert and AFTER the per-category
mute gate. There is intentionally NO separate push trigger scattered across
services — every notification type (message, comment/reply, rfq status, system,
lead, new_match, price_drop, review, investment, global_supply) already flows
through this one function, so push automatically covers all of them and inherits
the exact same recipient + anti-spam (per-category mute, new_match cooldown,
price_drop saver dedup).

**Why:** one chokepoint = push and in-app can never diverge, and no new
per-service wiring is needed when a notification type is added.

**How to apply:** never add ad-hoc `sendPushToUser` calls in feature services.
Route any new notification through `createNotification` and push comes for free.

# Push is gated by the EXISTING `inApp` preference — there is NO `push` column

`notification_preferences` has only `in_app` and `email` (the Settings UI, owned
by a separate task, only toggles those). Push reuses the `in_app` gate: muting a
category in-app also silences its push. Do NOT invent a `push` boolean without a
matching Settings toggle, or it defaults-on with no way to turn it off.

# Device tokens

`push_tokens` table: one row per Expo token, `token` is globally UNIQUE
(onConflictDoUpdate reassigns userId so a handed-down device stops getting the
prior user's pushes). Endpoints: `POST/DELETE /api/v1/notifications/push-token`.
Tokens reported `DeviceNotRegistered` by Expo are pruned in PushService.

# Mobile registration + deep-link

`PushNotificationsBridge` (hooks/usePushNotifications.tsx) is mounted in
`_layout` inside ClerkLoaded. Registers on sign-in, unregisters on sign-out.
Everything is guarded: web / simulator / no-permission / missing EAS projectId
all degrade silently to "no push" (in-app feed stays the source of truth).
Actual device delivery needs a real EAS `projectId` + build — the code is
correct but won't mint tokens in Expo Go / web.

Tap routing for BOTH the in-app feed and push taps comes from the shared
`lib/notificationRouting.ts` (`routeForNotification`). The push payload includes
`data.type` so the tap handler can pick the right destination. Keep these two
consumers on the one helper so a push and its in-app twin never route
differently.
