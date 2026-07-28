# Maintenance Wave 4 — Search taxonomy alignment (architecture)

**Date:** 2026-07-07  
**Sequence:** Layer 1 taxonomy → Layer 2 criteria → Layer 3 UI → Layer 4 engine sync  
**Principle:** Add and align — never remove `MARKET_COUNTRIES`, create flows, or FilterSheet depth.

## Architectural layers

| Layer | Responsibility | Files |
|-------|----------------|-------|
| **1 — Taxonomy (source of truth)** | Countries + rental regimes per market | `constants/listingCreateTaxonomy.ts` (unchanged data) |
| **2 — Search adapter** | Bridge taxonomy → browse without API drift | `lib/searchTaxonomy.ts` (new) |
| **3 — Criteria state** | `marketCountry` UI field (not sent to API) | `lib/searchParams.ts` |
| **4 — Surfaces** | Search tab + FilterSheet use same adapter | `search.tsx`, `FilterSheet.tsx` |
| **5 — Cars consistency** | Engine chips sync `fuelType` / `transmission` | `search.tsx` `selectEngine` |

## Changes

| Area | Fix |
|------|-----|
| Multi-country RE rent | Market chips (EG, SA, AE, …) + `rentalTermsForCountry` on Search |
| Invalid term guard | Changing market clears `rentalTerm` if not legal in that country |
| FilterSheet | Same market + rental rows (was full `RENTAL_TERMS` for all markets) |
| Cars | Selecting fuel/transmission engine chip mirrors attribute filters |

## Not changed (preserved)

- `rentalTermsForCountry` in **listing create** — still drives create form per country
- `buildSearchParams` — still sends only `rental_term` (no new API params)
- Engine facet-gating, industrial chips, map clustering
- Deep link origin, store submission, GCP deploy

## Verify

```powershell
pnpm --filter @workspace/banco-mobile run typecheck
```

## Next (Wave 5 — after CI green)

- P0: confirm GitHub Actions on `main`
- P1: near-me (`near_lat` / `radius_km`) — OpenAPI + UX
- P1: listing edit screen (product scope)
- P3: light haptic/sound polish where pattern exists
