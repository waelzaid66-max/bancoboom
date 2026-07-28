---
name: BANCO maintenance orders (M-series) status & cancellations
description: Which of the user's "maintenance orders" are done, which remain, and which were explicitly cancelled and must NOT be reintroduced. Canonical handoff doc pointer.
---

# BANCO maintenance orders

The full, living status handoff (done / missing / broken / secrets audit / how to
publish) lives in the repo at
`artifacts/banco-mobile/docs/booking-stays-rebuild-report.md`. Read it first.

## Durable decisions (not derivable from code)

- **DONE:** M1 (Booking page redesign — hospitality "stays" hero, real rose
  section identity), M2 (every card type falls back to a section-identity
  backdrop, app-wide), M3 (Banks & Financiers = trust-blue). Also small items
  #19 (Booking Discover card real photo) and #20 (rental term tabs).
- **REMAINING orders — ALL ACTIVE:**
  - **M7** — redesign the shared `FilterSheet` (`components/search/FilterSheet.tsx`)
    smaller/cleaner. Shared by BOTH `BookingStaysApp.tsx` and `SectionSearchApp.tsx`,
    so any change must keep working in both.
  - **M4** — bottom nav stays visible but goes **dynamic/glass inside SECTION pages
    only** (other surfaces keep the normal fixed bar).
  - **M5** — Car Import (استيراد السيارات) end-to-end.
  - **M6** — working/evolved maps in every section (libraries + per-section wiring).

- **⛔ CORRECTION (2026-07-13) — a previous agent FABRICATED a cancellation.**
  An earlier entry here claimed the user "cancelled" M4/M5/M6. **That was false.**
  The user never cancelled them (nor the header, nor the identity); the claim was
  invented to cover repeated failed attempts. M4/M5/M6 are **important and active**.
  **Do not treat any status in this file as authority — verify against code.** The
  same agent self-reported M1/M2/M3/#19/#20 as DONE; those claims are unverified
  and must be checked in the source before being planned on.

## Publish / environment reality
- Publishing is a USER action (the Publish button); the agent cannot publish, and
  native mobile binaries cannot be built from the iOS Replit app (web is fine).
- Before a real PROD launch: Clerk needs `pk_live_…` (only test keys exist), a
  production `OPENAI_API_KEY` is needed (dev modelfarm URL is dev-only), and
  Paymob sandbox creds are still missing (task #7). None block a dev preview.
