# Maintenance Wave 2 — Search (Industrial sections)

**Date:** 2026-07-07  
**Scope:** Section-specific search for facilities/materials only — mirrors Home + Industry Hub patterns.

## Changes

| Area | Fix | Files |
|------|-----|-------|
| Industrial subtype | `industrialType` on `SearchCriteria`; narrow `industrial_type` API param | `lib/searchParams.ts` |
| Search UI | `IndustrialSubChips` for facilities/materials (facet-gated) | `app/(tabs)/search.tsx` |
| Origin filter | Inline local/imported chips (same as Industry Hub) | `app/(tabs)/search.tsx` |
| Assistant | Search actions route to `/(tabs)/search` (maintained surface) | `app/assistant.tsx` |

## Not in scope (deferred)

- `near_lat` / `radius_km` radius search (API exists; needs product decision + OpenAPI client regen).
- Extra real-estate property engine chips beyond existing villa/apartment set.
- Deep link `origin` change in `app.json`.
