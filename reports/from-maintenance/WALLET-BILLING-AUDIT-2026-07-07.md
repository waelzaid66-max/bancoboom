# Wallet & Billing Audit Summary — 2026-07-07

**Full document:** `audit/maintenance/WALLET-BILLING-FINANCE-AUDIT.md`

## Headline

The **billing engine is real and wired** (ledger, plans, Paymob, promo ad credit, invoices server-side). The product is **operationally free** today (baseline 50/50 listings, PSP disabled from admin). **Gaps are mostly UI and reporting**, not missing core money logic.

## Maturity at a glance

| Area | Backend | Mobile | Admin |
|------|---------|--------|-------|
| Wallet + top-up | ✅ | ✅ | config only |
| Subscriptions | ✅ | ✅ | ✅ plans |
| Ad promo credit | ✅ | ✅ | ✅ |
| Invoices / statements | ✅ API | ❌ | ❌ |
| Coupons / tax / payouts | ❌ | ❌ | ❌ |

## Safe next waves

1. **B1** — Invoice list UI, admin revenue from ledger, OpenAPI payments (read-only, zero user impact)
2. **B2** — Financial hub screen + transaction filters
3. **B3** — Billing notifications + email templates
4. **B4** — PDF export
5. **B5** — Enable paid mode (admin decision only)

## Do not ship in v1

User-to-user wallet, seller withdrawals, installment billing, loyalty points, discount coupons.

## Admin levers (keep free now)

- Payment Provider **Enabled = off**
- Plans: baseline `is_baseline`, price 0, quota 50/50
- Promo campaign **enabled = off**
