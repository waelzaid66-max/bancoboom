# Wave PH-1 — Production Hardening (Mobile finance + routing guards)

**Date:** 2026-07-07  
**Scope:** Additive only — no screens or routes removed.

## What was done

1. **Profile → Payments** now opens the **Billing hub** (`/billing`) instead of jumping straight to wallet. The wallet full page (`/wallet`) remains available from the hub and settings.
2. **Stack routes registered** for `billing`, `wallet`, `invoices`, `invoices/[id]` with consistent slide animation (same pattern as listings/bookings).
3. **Invoices back fallback** returns to `/billing` when there is no history (was `/wallet`).
4. **Regression tests** (`tests/lib-hardening.test.mjs`):
   - `rentalHost` bookable gate
   - Booking notification → host bookings
   - Payment/subscription → billing hub
   - Profile menu → billing
   - Layout stack registration

## What was fixed

- Finance entry from profile was fragmented (wallet only); now aligned with Billing hub (B2) without deleting wallet.
- Missing explicit Stack.Screen entries for finance routes (navigation consistency).

## What was tested

```bash
pnpm --filter @workspace/banco-mobile run test:lib
pnpm --filter @workspace/banco-mobile run typecheck
```

## Still open (not blockers for this slice)

| Item | Priority |
|------|----------|
| GitHub CI green after push | P0 |
| Staging smoke: Clerk + object storage upload | P0 — see `WAVE-P0-STAGING-VALIDATION.md` |
| `drizzle push` on staging/prod DB (one-time) | P0 — boot patch + test `ensureSchema` |
| Richer listing edit (photos, calendar) | P1 |
| Create-flow preset from rental hub | P1 |

## Can we move to next wave?

**Yes** for PH-1. **In progress:** P0 staging validation (`WAVE-P0-STAGING-VALIDATION.md`).

## Commands

```bash
pnpm --filter @workspace/banco-mobile run test:lib
pnpm --filter @workspace/banco-mobile run typecheck
```
