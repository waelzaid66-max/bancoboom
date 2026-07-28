---
name: BANCO dealer spend / ROI derivation
description: Why dealer ad-spend/ROI is derived from wallet transactions and why windowed aggregates must paginate
---

# Dealer spend / ROI derivation

There is **no BFF aggregate for dealer ad spend or ROI**. DealerStats exposes only
leads_today, conversion_rate, total_views, leads_chart — no spend/revenue. So any
"Ad Spend / Cost-per-Lead / Spend & Efficiency" surface must be **derived client-side
from wallet transactions**:
- Ad spend = abs sum of `boost_charge` + `lead_charge`.
- Platform spend = ad spend + `subscription_charge`.
- No revenue exists → never compute/label true ROI; label it "Spend & Efficiency".
- Cost-per-lead denominator: sum of `leads_chart` over the same 30-day window.

**Why pagination matters:** the transactions endpoint (`GET /wallet/transactions`,
`listTransactions`) is **cursor-paginated with a hard max `limit` of 50/page** and has
**no date-range filter**. Reading a single page and filtering to 30 days silently
undercounts spend for any active dealer with >50 recent transactions. Results are
newest-first, so paginate via `meta.cursor` / `meta.has_next` until you cross the
window boundary (stop on the first older-than-window item), with a safety page cap.

**How to apply:** when adding spend/ROI to any new surface (dealer-os, banco-mobile,
admin-os), reuse this derivation and cursor-paginate the window — do not sum one page.
