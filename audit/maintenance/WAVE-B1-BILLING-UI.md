# Wave B1 — Billing UI & Revenue Honesty

**Date:** 2026-07-07  
**Risk:** Zero impact on free baseline — read-only mobile UI + admin reporting fix.

## Shipped

| ID | Change |
|----|--------|
| B1.1 | Mobile `invoices.tsx` — paginated list via `GET /v1/billing/invoices` |
| B1.2 | Mobile `invoices/[id].tsx` — detail with line items |
| B1.3 | Wallet → "My Invoices" link (`wallet.invoicesLink`) |
| B1.4 | `AdminService.revenueSummary()` — subscriptions & CPL from `transactions` ledger |
| B1.5 | OpenAPI `POST /v1/payments/webhook`, `GET /v1/payments/return` + codegen |

## Not changed (by design)

- Paymob remains admin-disabled by default
- Baseline 50/50 free plan unchanged
- No payment gate on listing creation

## Next (B2)

- Financial hub (wallet + invoices + plans entry)
- Transaction date filters on wallet
- Dealer-os invoice list (optional parity)
