---
name: api-server vitest harness
description: Conventions and gotchas for writing api-server vitest suites against the shared prod Postgres
---

## Runner
- vitest must be installed at the workspace ROOT — running `pnpm add` inside `artifacts/api-server` gets SIGKILLed.
- Config: `artifacts/api-server/vitest.config.ts` with `fileParallelism:false`; `test` script = `vitest run`. The logger short-circuits to silent in test mode.

## Shared prod DB — there is NO test database
**Why:** suites run against the same Postgres the app uses, so any leaked row pollutes real data.
**How to apply:**
- Every counter/dedup/user/session key must be unique-per-run (`uniq()` = `prefix_+randomUUID`).
- Clean up in `afterAll`, child rows before their owning user — `listings.userId` and the ledger FKs are NOT `ON DELETE CASCADE`, so deleting a user first throws. Listing-scoped rows (ads, interactions, lead_history→lead_billing, listing_attributes) DO cascade on listing delete; notifications cascade on user delete. Filter durable counter/dedup rows by a run-UUID embedded in the key (`... LIKE %run%`), or skip cleanup when every key is already a random UUID (no collision risk).

## Aggregate/statistical detectors over a shared DB
**Why:** `detectPriceOutlier` (and any "compare against all comparable listings" check) aggregates over EVERY active row in scope, so seed + other tests make medians non-deterministic.
**How to apply:** carve out an isolated scope bucket you fully own — e.g. insert a throwaway brand+model and tag your comparables with that `modelId`. Then the aggregate sees only your rows and the median/outlier assertions are deterministic. (`listing_attributes.modelId` is an FK → you must insert a real model row, not a random UUID.)

## Money-path service tests (CPL / boost)
**Why:** prices (CPL, boostPrice) come from the seller's effective plan server-side; hardcoding amounts couples tests to seed values.
**How to apply:** read the price at runtime via `resolveEffectivePlan(userId, role)`, then fund the wallet relative to it (exactly the fee for the success path, below it for the insufficient-funds path) and assert the balance delta. `trackLead` bills fire-and-forget via `setImmediate` → POLL `lead_billing` by sellerId, never sleep. The CPL flow is best-effort: the lead always persists; insufficient funds yields `lead_billing.status="failed"` (lead kept, no charge), individual/zero-CPL yields `not_billable`. Boost is atomic: insufficient funds throws and rolls back the ad ("never activate on failure").

## Pure vs DB suites
- Pure (no-DB) suites must NOT import `src/__tests__/helpers.ts` — importing it constructs the pg pool (registers `afterAll(pool.end)`) and needs `DATABASE_URL`.
- A service that imports `db` but whose tested fns never query (e.g. the pure helpers in `NormalizationService`) is still safe to test without the helper. When a suite DOES exercise DB-backed fns, split those into a separate `*.db.test.ts` that imports the helper, keeping the pure suite fast and connection-free.

## AbuseService detector ORDER matters in tests
`validateLead` checks leadRate → ipClicks → leadDedup → leadRepeat. To isolate one block reason, keep earlier checks from firing: unique `buyerId`/actor per call (per-user lead-rate cap) and a new `listingId` per call (60s dedup). Because dedup(60s) fires before repeated-clicks(>5/10min), `repeated_clicks` is unreachable within 60s without time-spacing or seeding the counter directly.

## Fire-and-forget writes
`writeAudit` and `trackLead` both insert via `setImmediate`. Tests must POLL for the row, not sleep — polling is deterministic on a slow DB AND guarantees the async insert lands before `afterAll` cleanup, avoiding a teardown/FK race.
- **Asserting ABSENCE can't be polled** (there is no row to wait for). To test a fire-and-forget gate deterministically, expose an awaitable core and await it in the test (e.g. `processLead` is `trackLead`'s awaitable body; the public `trackLead` stays `setImmediate(() => void processLead())`). Await the core per case, then assert 0 rows — no scheduler race, no flaky barrier.
- **Draining before set-null cleanup:** polling-then-cleanup only works when you delete the PARENT and the child FK cascades. When the FK is `ON DELETE SET NULL` (e.g. `audit_log.listing_id`), deleting the parent leaves an orphan, so you must delete the audit rows themselves — and FIRST drain the `setImmediate` writer (`await new Promise(r => setImmediate(r))` + a short timeout for the async insert round-trip) so a late write can't land after your delete. Test bodies finish before `afterAll`, so once drained nothing reschedules.

## Schema provisioning is push-based
`lib/db` has only `push`/`push-force` scripts and ZERO migration files for ANY table — the schema is the source of truth, applied via `drizzle-kit push`. Never fabricate a migration file for "new" tables (e.g. durable counters); it would be inconsistent with the whole project.
