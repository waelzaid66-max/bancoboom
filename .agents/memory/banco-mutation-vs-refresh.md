---
name: Mutation success vs. post-write refresh (honesty)
description: Why a successful write must be reported independently of any follow-up refetch in banco-mobile
---

# A write's success must be reported from the write call alone

When a user action performs a mutation and then refetches to update the UI
(e.g. submit RFQ offer → re-GET the RFQ; save/unsave; contact/apply lead),
the mutation and the refetch must live in SEPARATE try/catch blocks.

**Rule:**
- First `try` wraps ONLY the mutation. On reject → show the error, clear the
  in-flight flag, `return`.
- On resolve → immediately report success (alert/haptic) and reset the form.
- THEN a SECOND, best-effort `try` does the refetch / optimistic count bump,
  swallowing any error. Clear the submitting flag on every path.

**Why:** if the mutation and refetch share one try, a refetch failure makes the
user see a "failed" message even though the server accepted the write. That
violates BANCO's sacred honesty rule and invites duplicate submissions. Found in
P5 RFQ-inbox review: `submitRfqOffer` + post-`getRfq` were in one try.

**How to apply:** any mobile surface that mutates then refreshes — RFQ offers,
saves toggle, lead tracking, company edit. Network refresh is cosmetic; the
mutation's own resolve is the source of truth for the success message.
