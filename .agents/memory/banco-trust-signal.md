---
name: BANCO trust_signal verified detection
description: Client "verified" filters must match the full BffService trust_signal set, not just substring "verified"
---

# BANCO trust_signal verified detection

The BFF emits exactly these `trust_signal` strings (BffService.buildTrustSignal):
`Top Dealer`, `Verified Dealer`, `Verified Company`, `Verified Seller`, and
`Private Seller` (the ONLY unverified case).

**Rule:** Any client-side "is this seller verified?" check must treat everything
except `Private Seller` as verified. A naive `includes("verified")` silently
EXCLUDES `Top Dealer` — i.e. the highest-quality verified dealers.

**Why:** The "Verified Sellers" mobile feed rail + the card's verified
tint/icon both used `includes("verified")` and wrongly dropped Top Dealers,
undermining the rail's truthfulness. Caught in code review.

**How to apply:** Use the shared `isVerifiedSignal()` predicate
(`banco-mobile/constants/feed.ts`) — matches `verified` OR `top dealer`. Reuse
it for every verified surface (card, rails, future filters) so they stay in
sync. If you add a new verified trust_signal server-side, update that one
predicate.
