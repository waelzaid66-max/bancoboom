---
name: BANCO mobile auth gate (guest funnel)
description: Single chokepoint that lets guests browse but funnels every gated action (open details, save, contact, apply, comment) into sign-up.
---

# BANCO mobile guest browsing + auth gate

Guests may browse the home feed and search freely, but any meaningful action must
funnel them into creating an account. Implemented as ONE chokepoint, not
per-button checks.

- `hooks/useAuthGate.tsx`: `AuthGateProvider` + `useAuthGate().requireAuth(action?)`.
  Signed-in → runs `action`, returns true. Guest → opens one marketing Modal
  (CTA → `/(tabs)/profile`), does NOT run the action, returns false. Default
  context (provider missing) runs the action (safe degrade).
- Provider order is load-bearing: `LanguageProvider > AuthGateProvider >
  SessionProvider`. `SessionContext.toggleSave` consumes `useAuthGate`, so the
  gate MUST sit above the session provider. `useAuthGate` does NOT import
  SessionContext (no cycle). It must also stay inside `<ClerkLoaded>` so
  `useAuth()` is safe.
- `app/listing/[id].tsx` renders a full-screen guest lock (when
  `isLoaded && !isSignedIn`) BEFORE any detail/loading UI, and the load effect
  waits for `isLoaded` then skips the fetch for guests.

**Why:** the listing-detail lock is the catch-all. EVERY path into detail (home,
search, search-results, assistant, industry, linked/similar, recently viewed,
saved tab, notifications, deep links) converges on `listing/[id]`, so those
individual card taps deliberately are NOT each gated. Home + search card taps
additionally call `requireAuth()` only for nicer UX on the two primary browse
surfaces.

**How to apply:** to gate a new guest action, wrap it in `requireAuth(() => ...)`
or early-return with `if (!requireAuth()) return;` — do not invent a new modal or
a parallel gate. Saving is already centralized in `SessionContext.toggleSave`;
never add a separate guest-save path (this REVERSES the old "guests = local
AsyncStorage saves" behavior — guests can no longer save). The SAME rule applies
to `SessionContext.saveSearch` — saving a search is a meaningful action and MUST
gate guests via `requireAuth()`. It's the easy one to miss because it only writes
AsyncStorage (no backend call), so a guest "save search" silently bypassed the
funnel until it was gated.
