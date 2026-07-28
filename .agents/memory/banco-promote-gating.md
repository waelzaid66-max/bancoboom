---
name: BANCO promote/boost active-status gating
description: Where it is safe to expose a Promote/boost control, and which DTOs carry the status needed to decide
---

# Promote/boost must be gated on listing.status === "active"

Any UI that lets an owner promote/boost a listing must render the control ONLY when
the listing is active — not merely "not sold".

**Why:** `AdsService.boostListing` (api-server) checks ownership only, NOT status. So a
draft / pending / archived listing can be boosted and the wallet charged for inventory
that will never be publicly visible. The owner-facing listing detail allows viewing
non-active statuses, so `!isSold` is too loose a gate.

**How to apply:**
- `ListingDetail` carries `status` → gate the detail-screen Promote on `status === "active"`.
- The "my listings" summary carries `status` → gate per-card Promote on `status === "active" && id`.
- `FeedItem` (the BFF feed / `/me/listings` shape) now carries `is_active?: boolean | null`
  (added additively; BffService sets `is_active: row.status === "active"`). Surfaces built
  on `FeedItem` — e.g. the profile listings grid — gate the Promote control on
  `item.is_active && !item.is_sponsored` (sponsored tiles show a read-only "Promoted" badge
  instead). This is the intended design: the field exists specifically so the profile grid
  can gate Promote without fetching `ListingDetail`. Do NOT revert to "no Promote on FeedItem".
- The `is_active` value comes from the regenerated client. After a contract/codegen change,
  the mobile typecheck can still report `Property 'is_active' does not exist on type 'FeedItem'`
  even though the lib src has it — that is stale composite dist (see composite-dist-staleness.md);
  fix with `tsc -b lib/api-client-react --force`, not by changing the gating code.

# Adding a funding source means revisiting EVERY eligibility gate, on every surface

When you introduce a new way to pay for boosts (here: free ad credit granted to ALL
users), audit the *eligibility-to-open-the-flow* gate on every surface — it can silently
become a lockout.

**Why:** mobile `PromoteButton` opened the boost sheet only when the user had an active
subscription, routing everyone else to `/plans`. The api-server `boostListing` and dealer-os
impose NO subscription gate. So once promo credit existed for all users, mobile users with a
valid grant but no subscription could never reach the sheet to spend it — the exact opposite
of the feature's intent. Surfaces drifted because the gate lived only in one client.

**How to apply:**
- Gate "can open the boost flow" on `eligibleSubscription || hasPromo`, not subscription alone.
  Only route to `/plans` when NEITHER funds the boost; let a mid-boost 402/403 still fall back
  to `/plans` for depletion.
- Keep funding-source gating consistent across mobile + dealer-os + backend; the backend
  (ownership + funds only) is the source of truth — clients must not be stricter than it.
- After any boost that may consume promo, refresh the promo summary on EVERY path, including
  bulk/multi-boost completion (dealer-os bulk boost previously skipped the invalidate).
