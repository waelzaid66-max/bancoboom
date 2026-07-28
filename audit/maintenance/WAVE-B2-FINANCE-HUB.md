# Wave B2 — Financial Hub & Ledger Filters

**Date:** 2026-07-07  
**Risk:** Zero impact on free baseline — read-only UI + indexed server filters.

## Shipped

| ID | Change |
|----|--------|
| B2.1 | `billing.tsx` — finance hub (balance, promo, plan, quick links, recent tx) |
| B2.2 | Profile + Settings entry → `/billing` |
| B2.3 | Wallet: period (7/30/90/all) + type filters — **server-side** on `idx_transactions_user_created` |
| B2.4 | `GET /v1/wallet/promo/transactions` — promo ledger history with same date filters |
| B2.5 | Wallet promo history UI + pagination |
| B2.6 | Dealer analytics spend uses `from` (30d) — stops full-ledger scan |

## API

- `GET /v1/wallet/transactions?from&to&type` — indexed keyset pagination
- `GET /v1/wallet/promo/transactions?from&to&type` — promo ledger

## Not changed

- Paymob disabled by default; baseline 50/50 unchanged

## Next (B4)

- PDF invoice / monthly statement export
- Optional dealer-os finance hub parity
