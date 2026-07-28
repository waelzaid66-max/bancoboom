# Search section-by-section — 2026-07-10

Philosophy (from prior agent memories + user rules): each browse section is its
own company — separate journeys, filters, and accents — without deleting rent /
import / supply / host paths, and without inventing blockers that prevent real
publish. After every fix, re-audit the other sections.

Reference folders consulted (read-only):
- `banco stor app/banco.store-main`
- `banco stor app/banco-cloud-web-app-all`
- `banco stor app/aws-virgen`
- `banco done`
No `banco mainnnn` folder found under Downloads.

## Company map (after this pass)

| Company | Owns | Must never own |
|---------|------|----------------|
| **Cars** | condition / import / bank / islamic engines; brand; year; fuel; transmission | offer_type, rooms, industry, rental_term, material |
| **Real estate** | sale/rent + property engines; rental_term **only with rent engine**; market country | fuel, car brand, industry, host hub, material |
| **Facilities** | factory / warehouse / land subtypes; factory-sector industry | origin local/imported; car/RE fields; raw_material industry; material chips |
| **Materials** | production_line / raw_material / machine; origin local/imported; **material** chips (all / raw_material); industry only for machine/line | facilities origin chrome; RE rent |

Host rental hub stays on **Profile**. Supply / B2B stays on **Business hub**. Discover car-import stays marketplace.

## Fixes this pass (logic first, then theme)

1. **P1 rent leak** — rental chrome + FilterSheet require `offer_type === "rent"` (not “anything except sale”). Selecting a rental term latches `engineKey: "rent"`. Leaving rent clears `rentalTerm`.
2. **P1 contract gates** — `buildSearchParams` drops stale cross-company fields (fuel on RE, rental without rent, industry on raw_material, origin on facilities).
3. **P2 origin ownership** — origin chrome + FilterSheet origin only for **materials** (not facilities).
4. **P2 warehouse labels** — RE engine “Warehouse property / مخزن عقاري” vs facilities “Industrial warehouse / مخزن صناعي”.
5. **Theme** — `lib/sectionTheme.ts` accents on CategoryTabs + EngineChips + IndustrialSubChips + origin/rental chrome (Discover cards already had per-section gradients).
6. **M28 material filter (end-to-end)** — create already stores `specs.material`; browse now filters it:
   - API: `engineFilterFields.material` + `SearchService` `specs->>'material'`
   - OpenAPI + `api.schemas.ts` on feed / search / map
   - Contract: `SearchCriteria.material` + `buildSearchParams` / URL parse
   - Mobile: FilterSheet `filter-material` chips (materials + all/raw_material); CLEAR_ATTRS + subtype switch clears material
7. **M29 remaining gaps closed** — shared `CLEAR_SECTION_ATTRS`; web SearchControls category wipe + industry/origin/material UI; API `allowCommodityMaterialFilter` rejects material on car/RE/facilities-only scopes; feed passes `material`.
8. **M30 web market** — `marketCountry` select + adaptive rental terms (EG old/new law vs Gulf annual); sanitize on market change. Agent memory on missing `raw_material` param corrected.
9. **M31 remaining Search gaps** — hub deep-link `rental_term=new_law` (+ `engine=rent`) replaces dead `monthly`; feed controller/service apply `market_country`; `applyFacetToCriteria` spreads `CLEAR_SECTION_ATTRS`; mobile home + web HomeFeedTeaser send preferred/default market; removed unused `rentalDaily/Monthly/Yearly` copy.

## Proofs (honest)

| Check | Result |
|-------|--------|
| `lib-hardening` | **21/21** (re-verify after M31) |
| `proof-create-fields.mjs` | **pass** (incl. material assertions) |
| `proof-isolation.mjs` | **ok** (incl. M31 hub/feed/facet/home market) |
| `allowCommodityMaterialFilter.test.ts` | **4/4** (no DB) |
| `search-contract` via bare `node --test` | **blocked** (`ERR_MODULE_NOT_FOUND` generated api) — gates covered by static proofs + `buildSearchParams.test.mjs` source |
| Device QA | **checklist ready — not executed on device** → `DEVICE-QA-SECTION-COMPANIES.md` |
| Live Replit | still **STALE** until redeploy (market_country / map clusters / material query) |

## Journeys preserved

- Rent browse + rental systems
- Car import engine + Discover CTA
- Supply / companies Business hub
- Host `/rentals/hub` on Profile
- Facet-gated engines / brands
- Commodity material refine on materials browse (mobile + web)
- Web market-country scoping via contract URL params

## Still open

1. Device QA per section company (checklist written; needs human/device).
2. Redeploy API/mobile/web for live probes — do not claim live green until then.
