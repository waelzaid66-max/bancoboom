---
name: BANCO domain & contacts
description: Canonical domains, email contacts, and deployment routing for BANCO
---

## Canonical Domains (as of 2026-07-20)

All three point to the **same Replit autoscale deployment** — routing is path-based + domain-aware redirect in the landing app:

| Domain | Role | Resolved path |
|---|---|---|
| **banco.today** | Primary consumer landing + main app | `/` (serves landing, all paths) |
| **banco.deals** | Dealer management platform | redirect → `/dealer-os/` |
| **banco.autos** | Automotive marketplace (primary Replit URL) | redirect → `/banco-mobile/` |

Replit primary URL: **banco.autos** (assigned as primary). All three verified in Resend.

## Path mapping in production

```
/                → artifacts/landing/dist/public  (static)
/dealer-os/      → artifacts/dealer-os/dist/public (static)
/admin-os/       → artifacts/admin-os/dist/public  (static)
/api             → artifacts/api-server (node, port 8080)
/banco-mobile/   → artifacts/banco-mobile (expo web, port 23351)
```

## Email contacts (banco.today domain — verified in Resend)

- noreply@banco.today — system emails (DEFAULT_FROM in EmailConfigService)
- support@banco.today — user support
- privacy@banco.today — privacy / data requests
- legal@banco.today — legal / terms

## Key env vars

- `PUBLIC_APP_URL` = `https://banco.today`
- `PUBLIC_API_BASE_URL` = `https://banco.autos/api`
- `EXPO_PUBLIC_PUBLIC_APP_URL` = `https://banco.today`
- `CORS_ALLOWED_ORIGINS` = all 3 domains + www variants

**Why:** Domain redirect is client-side (DomainRouter in landing/src/App.tsx). This works because all domains serve the same static bundle at `/`. The redirect happens instantly in the browser before rendering anything.
