# Wave B3 — Billing notifications & email

**Status:** ✅ Complete  
**Risk to free users:** Low (read-only alerts; no payment gating)

## Scope (from WALLET-BILLING-FINANCE-AUDIT)

| # | Task | Done |
|---|------|------|
| B3.1 | Notification types: `payment_success`, `payment_failed`, `subscription_expiring` | ✅ |
| B3.2 | Email templates: receipt + failed payment + expiring subscription | ✅ |
| B3.3 | Admin `payment_failure` alert from failed PSP intents (24h) | ✅ |

## Architecture

- **`BillingNotificationService.ts`** — single chokepoint for billing in-app + email (best-effort, never blocks ledger).
- **`EmailService.ts`** — `sendBillingReceiptEmail`, `sendBillingFailedEmail`, `sendSubscriptionExpiringEmail` (bilingual, real amounts only).
- Hooks (post-commit / `setImmediate`):
  - `PaymentIntentService.settleTopupIntent` → `payment_success`
  - `PaymentIntentService.markTopupIntentFailed` / `SubscriptionService.markSubscriptionIntentFailed` → `payment_failed`
  - `SubscriptionService` wallet + webhook settlement → `payment_success` (subscription_charge)
  - `LeadService` lead_charge → `payment_success` receipt
- **Cron:** `subscriptionExpiringReminders` daily 09:00 Cairo — `subscription_expiring` (deduped 7d per subscription).
- **Admin:** `AdminService.alerts()` counts `payment_intents.status = failed` in last 24h.
- **Mobile:** `notificationRouting.ts` → `/billing` for all three billing types.

## DB

`notification_type` enum extended with three billing values (`drizzle push` on staging/prod).

## Tests

- `BillingNotificationService.test.ts`
- Existing `PaymentIntentService.webhook.test.ts` unchanged (settlement idempotency).

## Next (B4)

- PDF invoice / monthly statement export
