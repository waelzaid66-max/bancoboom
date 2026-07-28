---
name: BANCO admin-managed Paymob config
description: The invariants that any future work on payment-provider configuration must preserve.
---

# Paymob credentials are admin-managed (DB-first), but settlement is untouchable

Admins set/swap/enable/disable Paymob credentials + mode (sandbox/live) from
admin-os Settings instead of editing env secrets. The provider seam resolves
config DB-first, env-fallback: a DB row is used only when it is complete AND
enabled, otherwise it falls back to env, otherwise null.

**Why these invariants exist:** money safety. Configuration is now mutable from a
UI, so the settlement path must stay independent of it and secrets must never
leak through the new read/write surface.

**How to apply — never break these:**
- Settlement happens ONLY via the signed-HMAC webhook → `WalletService.applyTransaction`/ledger.
  Adding/altering config must NOT introduce any other money-moving path, and must
  not touch `applyTransaction` or the ledger.
- `verifyPaymobWebhook` (and the readConfig/isPaymentConfigured/paymentMode seam)
  is **async** because it reads the live config — always `await` it; the webhook
  must use the *fresh* HMAC secret, never a cached/boot-time value.
- Secrets are write-only end-to-end: encrypted at rest (AES-256-GCM, key from
  `PAYMENT_CONFIG_ENCRYPTION_KEY` else scrypt-derived from `SESSION_SECRET`), the
  masked admin view returns only `has_secret_key`/`has_hmac_secret` booleans, and
  an empty secret field on update KEEPS the stored value. Never return plaintext
  secrets to the client.
- The config is a single row per provider (singleton for `paymob`). Service-level
  tests that mutate it must back up and restore that row + the relevant env vars.
