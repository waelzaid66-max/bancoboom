---
name: BANCO rent search engine is a DATA dependency, not a code feature
description: Real-estate rent search/facets/rent-map silently go empty when RE inventory carries no specs.offer_type='rent'; the "missing rent engine" is a seed/data gap, not broken code.
---

# The "rent search engine" is real-estate inventory with `specs.offer_type='rent'`

There is no separate rent engine/endpoint. Rent is just the real-estate feed
filtered on **`listingAttributes.specs->>'offer_type' = 'rent'`** (تمليك=sale /
إيجار=rent). The SAME specs key powers three things in lockstep:

- `/v1/search?offer_type=rent` (SearchService `buildAttributeConditions`),
- `/v1/search/facets` `offer_type` counts (grouped by the same key),
- `/v1/search/map?offer_type=rent` viewport clusters.

**Why it looked "missing":** the seed created real-estate listings as
effectively 100% `sale` (and attached financing `payment_options` to them). With
zero `rent` rows, the facet count for rent is 0, the rent filter returns nothing,
and — because the search UI is facet-gated (see `banco-empty-db-looks-broken.md`)
— the rent option can hide entirely. Every endpoint returns HTTP 200; it reads as
"the rent engine is missing" but it is purely a data gap.

**How to apply / keep it working:**
- Any RE listing that should be rentable MUST write `specs.offer_type='rent'`.
  The mobile create form already does this — offer type is the PRIMARY RE field
  in `constants/listingCreateTaxonomy.ts` / `engines.ts`, collected via
  `visibleSpecFieldsFor`/`requiredSpecKeysFor`, and the API stores `input.specs`
  as-is after `validateAttributes`. So user-created rentals reach the engine end
  to end — no extra wiring.
- **Rentals must NOT carry financing/installment `payment_options`** (you don't
  finance a monthly rent). Seed guard: only attach financing when
  `offer_type==='sale'`. Rent prices are a monthly figure, not a sale price.
- **Seed listing loops are NOT idempotent** — re-running the full seed duplicates
  all demo listings. To adjust existing demo data (e.g. rebalance sale/rent),
  patch rows with `executeSql`, do NOT re-run `seed`. Fix the seed loop too so a
  fresh DB reproduces the corrected split.
- Verify with curl, not assumptions: `/search/facets` should show a non-zero
  `offer_type.rent`, and `/search?offer_type=rent` should return rows WITH
  coordinates (so the rent map has pins).
