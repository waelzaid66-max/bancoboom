---
name: BANCO saves sync (mobile)
description: Saves are a server-backed hybrid through SessionContext; the backend save endpoint is a TOGGLE, which makes client reconciliation non-idempotent — guard against double-fire.
---

# BANCO mobile saves: server-backed hybrid via SessionContext

All save surfaces (feed, search, saved tab, listing detail) route through
`context/SessionContext.tsx` (`toggleSave`/`isSaved`). Guests can NO LONGER save:
`toggleSave` calls `useAuthGate().requireAuth()` and returns early for guests
(funneled to sign-up — see banco-auth-gate.md). Only signed-in users (Clerk
`useAuth().isSignedIn`) get the hybrid: optimistic local + backend
`toggleSaveListing` / `getSavedListings`, reconciled on sign-in with union
semantics (never drops a local save).

**Why this matters / the trap:** the backend save endpoint is a **TOGGLE**
(`toggleSaveListing({listing_id}) -> {saved}`), not an idempotent set/unset.
So any client reconciliation that re-issues toggles can DOUBLE-FIRE and net-unsave
server-side while local still shows saved. Two known windows:
1. The sign-in reconcile effect re-running (isSignedIn churn) while its
   fire-and-forget "push local-only up" toggles are still in flight — the second
   pass's `getSavedListings` won't reflect them yet and toggles them off again.
2. A user tapping a heart on an unsynced item mid-reconcile.

No data loss occurs (local cache is never dropped; merge is functional + deduped),
but **server state can drift**.

**How to apply:** if you touch save-sync, prefer making it idempotent — a
dedicated PUT/DELETE save endpoint or a bulk-sync endpoint — instead of relying on
the toggle. Short of backend changes, gate reconciliation on the local-cache load
completing and serialize it to run once per sign-in. Keep `SessionContext`'s
public interface stable; all consumers depend on it unchanged.

## Server side: saves_count integrity anchor

`saved_listings` has `uniqueIndex("uniq_saved_user_listing").on(userId, listingId)`.
This is the integrity anchor for the denormalized `listings.saves_count` (resurface
ranking signal). The toggle (`SaveService.saveOrUnsaveListing`) keeps the counter
in lockstep INSIDE ONE transaction and ONLY mutates the counter on a real
membership transition: increment gated on `insert(...).onConflictDoNothing({target:[userId,listingId]}).returning().length`,
decrement gated on `delete(...).returning().length` (+ `GREATEST(...-1,0)` floor).

**Why:** without the unique index, `onConflictDoNothing` catches nothing →
concurrent same-(user,listing) saves double-insert AND double-increment → permanent
counter drift. The architect FAILed this twice before the unique index landed.

**How to apply:** never increment a denormalized save/like counter off a bare
insert — gate it on a conflict-aware `.returning()` rowcount backed by a real unique
constraint. Reconcile the counter in `scripts/post-merge.sh`: dedupe
`saved_listings` BEFORE `push-force` (so the unique index can be created on a dirty
table) and backfill `saves_count` AFTER (so the column exists). The backfill MUST
LEFT JOIN listings→saved_listings (not group saved_listings alone) or listings whose
real count dropped to 0 stay inflated forever.
