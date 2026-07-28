---
name: BANCO Financing CRM
description: Durable constraints for the bank-finance installment CRM layered over existing leads + payment metadata
---

# Financing CRM (admin-os)

The Financing CRM is a read/annotate layer, NOT a new buyer-submission flow. The task
forbade changing buyer submission or wallet/settlement, so the request itself reuses
existing data and only genuinely-new workflow metadata gets its own storage.

- **The request is a `finance_request` lead, not a new entity.** Any finance surface
  must derive requests from leads with `action_type = 'finance_request'` and LEFT JOIN
  the CRM sidecar (never assume a sidecar row exists). Buyer identity falls back to the
  joined user.
- **Amount & terms must all come from the SAME payment plan.** Down payment / monthly /
  duration / provider live across `payment_options` (`mode = 'bank_finance'`) rows; pick
  ONE deterministically (cheapest-then-id) and read all fields from it, or they diverge
  across plans. Same SAME-offer hazard as the listing display (see banco-payment-display).
- **Status is implicit "new" until touched** — list query coalesces the sidecar status,
  so untouched finance leads still appear; updates UPSERT the sidecar on its unique lead FK.

**Gating:** dedicated `manage_financing` permission, mirrored in BOTH api-server and
admin-os permissions.ts (owner inherits via spread). A permission added on only one side
silently half-works.

**CSV export quirk:** export is a same-origin cookie `fetch(...export, {credentials:'include'})`
→ blob download, NOT a react-query hook (response is text/csv). Its query string MUST be
built from the EXACT same active filters as the table (category/status/search/date_from/
date_to) — a forgotten param makes the CSV silently disagree with what the admin sees.

**Paginated admin tables: render from react-query, don't accumulate in local state.**
"Load more" that copies pages into a separate `useState` array goes STALE after a mutation:
invalidation refetches the same cursor/key, but the local copy isn't replaced, so saved
status/assignment edits don't show until reload. Use prev/next cursor navigation (a cursor
stack) rendering `resp.data` directly — invalidation then updates the visible page immediately.
**Why:** code review rejected the accumulate-in-state version for exactly this.

- Seat granting is fail-closed: never grant operational inbox access against an inactive institution or a deleted user account. There is no institution-level is_verified flag — admin-gated creation + isActive IS the verification invariant.
