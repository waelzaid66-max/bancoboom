---
name: BANCO staff-role & ban mutation guards
description: Concurrency + privilege-protection invariants for admin staff-role and shadow-ban writes (api-server AdminService)
---

# Staff-role & ban mutation guards

The "always keep >=1 Owner" invariant is a **count-based** guard, so it is
vulnerable to TOCTOU under concurrency.

## Role changes must be fully serialized
Any path that demotes/promotes a staff role (read current role -> count owners ->
decide -> update) MUST run inside ONE `db.transaction` holding a session advisory
lock (`pg_advisory_xact_lock`). Without it, two concurrent owner-demotions can
both read ownerCount=2 and both commit, leaving **zero Owners**.

**Why:** the guard reads a count and then writes based on it; only a serializing
lock makes read+decide+write atomic. A plain transaction is not enough because
the two transactions read disjoint rows (no row-lock conflict).

**How to apply:** reuse the existing advisory-lock key registry — do NOT reuse a
key. Known keys: startup staff-role backfill = 48150005; staff-role mutation
(setUserRole) = 48150006. New count-based invariants get a new distinct key.

## Ban (shadow-ban) protects Owners, not just content
Shadow-ban does NOT change `staffRole`/`isAdmin`, so it can't break the owner
invariant by itself, but a moderator/admin holding `ban_users` could otherwise
take punitive action against an Owner. Guards (pure `decideBan` in roleGuards.ts):
- Un-ban is always allowed (only restores access).
- No self-ban.
- An Owner may only be banned by another Owner; never the last Owner (defensive).

**Decision/scope:** owner-protection is scoped to **Owners only** — a moderator
CAN still ban another moderator/admin/support. Deliberately not "only Owners can
ban any staff", to avoid breaking legitimate moderation. Revisit only if staff
abuse between non-owner roles becomes a concern.

## Wiring
`decideBan` needs the actor's staff role; controller passes
`actorStaffRole: req.staffRole ?? "user"` (req.staffRole is set by authGuard
before requirePermission). Pure guards live in `lib/roleGuards.ts` and are unit-
tested in `lib/permissions.test.ts` (the only TS verification that runs here —
full `tsc` is memory-blocked in this env; use LSP diagnostics + this vitest).
