---
name: B.4 release state
description: What was in the B.4 tag, architect confirmation, and what comes next
---

# B.4 Release State

**Tag:** `B.4` on commit `ce2d7a7` (origin/main)
**Architect verdict:** CONFIRM-B4: YES — PASS, tag-ready (no remaining blockers)

## What's in B.4
- Privacy hardening: `deleteServingUrls()` on both Replit+S3 backends via ObjectStorage interface (provider-aware, not hardcoded to Replit sidecar)
- deleteAccount purges: chat media blobs (post-commit best-effort), message-notification previews (in-tx), push tokens (in-tx)
- Claude PRs merged: stay-header-trim, discover-map-card, currency-icon-stay (all guard 88/88)
- Admin bootstrap: all ADMIN_EMAILS promoted (not just first) — wael_zeed@yahoo.com gets owner on first sign-in
- OPENAI_API_KEY set → AI assistant live
- RESEND_API_KEY rotated (old key was exposed in chat)
- Test baseline: API 334/3-skip, mobile 88/88, search-contract 45/45

## Production
- Live at banco.autos (autoscale, public, hasSuccessfulBuild=true)
- Additional domains: banco.today, banco.deals

## Open after B.4 (Claude's planned work)
- B/C: Currency/country icon unification (needs owner design confirm + guard update)
- D: Car import lifecycle (B2C vs B2B decision needed)
- E: FX currency conversion (geolocation + FX provider decision needed)
- F: Currency icon clarification (which icon is broken?)
- Map radius circle select (build from scratch)
- PAYMENT_CONFIG_ENCRYPTION_KEY: needs dedicated stable key in prod
- Paymob live keys (admin-configurable once owner ready)
- pg_trgm on production DB
- ERROR_ALERT_WEBHOOK (optional)

**Why:** Track what shipped, what architect approved, and what's left — avoids re-litigating closed items in future sessions.
