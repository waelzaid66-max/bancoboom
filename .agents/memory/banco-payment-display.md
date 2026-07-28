---
name: BANCO above-fold installment label must match its amount
description: payment.lowest_monthly and best_offer are computed by different BFF paths and can describe different plans; any "monthly + payment-type label" pairing must source both from the same offer object.
---

# A headline "monthly + payment-type" pair must come from one canonical offer

On the listing detail — and any surface that shows a headline monthly installment
next to a payment-type / provider label — the monthly amount and the type label
MUST come from the SAME offer object.

**Why:** `listing.payment.lowest_monthly` is produced by the BFF's
`normalizePaymentOptions()` from the stored `monthlyPayment`, while
`listing.best_offer` is produced by `computeOffers()` (amortized recompute when
rate fields exist). They can select DIFFERENT plans, so pairing `lowest_monthly`
with `best_offer.provider_badge` can mislabel the amount (e.g. a "Seller Plan"
badge shown next to a bank plan's monthly). An architect review caught this on
seeded conventional bank offers where the two paths diverged.

**How to apply:** Prefer `best_offer.monthly_display` + `best_offer.provider_badge`
together. Only fall back to `payment.lowest_monthly` when `best_offer` is null,
and in that fallback show NO type label. All values are pre-formatted BFF strings
— never recompute on the client. Islamic safety: the `Offer` contract carries no
rate/APR field, and `provider_badge` is a provider name (e.g. "· Islamic"), never
a rate, so surfacing it above the fold is compliant.
