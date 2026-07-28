# Maintenance Wave — Mobile Master Stabilize + Strict Section Isolation

**Dates:** 2026-07-09 … 2026-07-10  
**Branch:** `fix/mobile-master-stabilize`  
**Head:** `d919ca5`  
**Principle:** Each fix maps to a **proven leak** — no blind polish.

---

## Scope

1. **M01–M31** — profile, create, search chrome, map, Discover, section companies, material filter, market_country, hub `new_law`, feed parity.  
   Progress: `audit/mobile/MOBILE-STABILIZE-PROGRESS.md`

2. **Strict isolation pass** — field/button/map leaks between browse companies  
   (`car | real_estate | facilities | materials`).  
   Detail: `audit/mobile/SECTION-ISOLATION-STRICT-2026-07-10.md`

---

## Leaks fixed (d919ca5)

| Leak | Layer | Fix |
|------|-------|-----|
| Hidden `originType` after engine collapse | mobile criteria | facet normalize clears dependents |
| Hidden `rentalTerm` after leaving rent | mobile criteria | same |
| Car years applied after category switch | FilterSheet | years gated to `car` only |
| Sticky map on fuel/material/price change | search.tsx | `criteriaKey(criteria)` |
| Global autocomplete titles | API + mobile | `category` + `industrial_type` scope |
| Installment on facilities/materials | UI + contract | gate + clear on section change |
| Bookable map chrome on industrial | SearchResultsMap | RE-only |
| Discover map CTA without RE evidence | SearchDiscover | section-aware gate |

---

## Files touched (isolation commit)

- `artifacts/banco-mobile/app/(tabs)/search.tsx`
- `artifacts/banco-mobile/components/search/FilterSheet.tsx`
- `artifacts/banco-mobile/components/search/SearchResultsMap.tsx`
- `artifacts/banco-mobile/components/SearchDiscover.tsx`
- `artifacts/api-server/src/services/SearchService.ts`
- `artifacts/api-server/src/controllers/searchController.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/search-contract/src/buildSearchParams.ts`
- `lib/search-contract/tests/buildSearchParams.test.mjs`
- `artifacts/banco-mobile/tests/lib-hardening.test.mjs`
- `audit/mobile/scripts/proof-isolation.mjs`

---

## Verification (automated, no secrets)

```bash
pnpm run confidence                    # includes proofs + contract
node audit/mobile/scripts/proof-isolation.mjs
node audit/mobile/scripts/proof-create-fields.mjs
pnpm --filter @workspace/search-contract run test
pnpm --filter @workspace/banco-mobile run test   # 34 tests
```

**2026-07-10 results:** all PASS locally.

---

## Not in scope (intentional)

- Website `banco-web` build (O17 SKIP)
- Paymob B5
- Reference folders
- Store / device claims without redeploy + QA
- Random UI redesign

---

## OPS blocker (not code)

Live Replit remains **STALE** until redeploy from this branch.  
Runbook: `audit/mobile/NEXT-OPS-REPLIT-REDEPLOY.md`  
PC check: `pnpm run ops:code-gate` → `pnpm run ops:next`
