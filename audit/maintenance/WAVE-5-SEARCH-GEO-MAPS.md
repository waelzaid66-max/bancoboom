# Wave 5 — Near-me search, map/list geo parity, OpenAPI

**Date:** 2026-07-07  
**Branch:** `maintenance/wave-4-search-taxonomy` (stacked on wave 4)  
**Principle:** Additive only — list and map share one filter set; geo params optional.

---

## Problem

- Backend already supported `near_lat`, `near_lng`, `radius_km` on **list** search (`SearchService.searchListings`) but:
  - Not documented in OpenAPI → mobile client could not type them.
  - **`mapClusters` ignored geo** → map and list could diverge.
  - Mobile had i18n `search.nearMe` but no UI wiring.

## Changes

### API (`artifacts/api-server`)

| Item | Detail |
|------|--------|
| `nearMeConditions()` | Shared Haversine + bbox filter extracted from list search |
| `mapClusters()` | Applies `nearMeConditions()` — parity with list |
| Test | `SearchService.geo.test.ts` — map cluster case |

### OpenAPI + client (`lib/api-spec`, `lib/api-client-react`)

- Documented `near_lat`, `near_lng`, `radius_km` on `GET /v1/search` and `GET /v1/search/map`
- Regenerated Orval client (`pnpm --filter @workspace/api-spec run codegen`)

### Mobile (`artifacts/banco-mobile`)

| File | Change |
|------|--------|
| `lib/nearMe.ts` | `expo-location` permission + coords (25 km default radius) |
| `lib/searchParams.ts` | `nearMeEnabled`, coords, `buildSearchParams` geo fields |
| `FilterSheet.tsx` | "Near me" chip in location section |
| `search.tsx` | Toggle handler + clear-all reset |
| `SearchResultsMap.tsx` | Viewport cluster cache (fewer `/search/map` calls) |
| `mapHtml.ts` | Viewport debounce 300 → 450 ms (rate-limit headroom) |
| `i18n.ts` | `search.nearMeDenied` |

## Deferred (scale — next wave)

- Partial/composite index on effective coordinates (or geohash column usage)
- `sort=nearest` (needs server ordering by distance)
- Inline near-me chip on search tab (FilterSheet only for now — surgical)

## Verify

```powershell
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
cd artifacts/api-server; pnpm test SearchService.geo
```

## User flow

1. Search → Filters → **Near me** → grants location → results within 25 km
2. Map mode uses same criteria → clusters respect radius
3. Clear all / toggle off removes geo filter
