# Website Phase 9 — Market RFQ create (write MVP) — status

**Branch:** `cursor/website-phase9-market-rfq-create-4322`  
**Base:** `main` (after Phases 1–8)  
**Date:** 2026-07-19

---

## Goal

Enable **creating an RFQ** from the website Market copy (`/workspace/b2b/rfqs`) via the shared API — without touching dealer-os, api-server, or OpenAPI.

---

## Done in this PR

| Item | Detail |
|------|--------|
| Form | `artifacts/banco-web/components/workspace/market/RfqCreateForm.tsx` |
| Panel | Wired into `MarketRfqsPanel` above the list |
| API | Existing `useCreateRfq` → `POST /v1/rfqs` (no contract change) |
| Cache | Invalidates `listRfqs` + `listMyRfqs` on success |
| Flag | Still gated by `NEXT_PUBLIC_WEB_MARKET_COPY` + Market panels |
| Copy | AR/EN strings in `workspace-ui-copy.ts` |
| Audit | `website-market-copy-parity-audit.mjs` checks create form |

---

## Fields (aligned with mobile create + API)

Required: **title**  
Optional: category, description, quantity, unit, target_price_max, destination_country, industry, industrial_type, deadline

---

## Explicitly NOT in Phase 9

| Item | Why later |
|------|-----------|
| Offer submit / accept / reject | Separate write surfaces |
| RFQ detail page | Navigation polish |
| Supply create | Separate form |
| dealer-os / OpenAPI / api-server | No-touch |

---

## Ops / flags

```env
NEXT_PUBLIC_WEB_MARKET_COPY=true   # staging/demo only until soft-launch decision
NEXT_PUBLIC_WEB_SEARCH_LIVE=false  # keep false on first prod soft-launch
```

Verify: sign in as buyer → `/workspace/b2b/rfqs` → create → list refreshes.

---

## Commands

```bash
node scripts/verify-website-boundaries.mjs
node scripts/website-market-copy-parity-audit.mjs
pnpm --filter @workspace/banco-web run check:types
```

---

## Rollback

1. Set `NEXT_PUBLIC_WEB_MARKET_COPY=false` and rebuild/redeploy web, **or**
2. Unplug: `WEB_PLUG_ENABLED=false` (whole site maintenance)

No DB migration. No API deploy.
