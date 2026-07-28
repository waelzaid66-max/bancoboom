# Create / Search field isolation — 2026-07-10

Honest map of which fields belong to which section after the field-isolation pass.
No device QA claimed. Live API redeploy still required for M23/M24 probes.

## Create (seller form) — `listingCreateTaxonomy.ts` + `create.tsx`

| UI category | Visible structured fields | Required (effective) | Hidden / never shown |
|---|---|---|---|
| **car** | mileage, year, condition, fuel_type, transmission, body_type, engine_cc, color (+ CarPicker brand/model) | mileage, year, condition, fuel_type | offer_type, rooms, industry, material, rental_term, ownership |
| **real_estate** + sale | offer_type, property_type, area, rooms*, bathrooms*, finishing*, ownership | offer_type, area, rooms*, property_type, finishing* | rental_term |
| **real_estate** + rent | offer_type, rental_term, property_type, area, rooms*, bathrooms*, finishing* | same as sale (rooms/finishing drop for no-rooms types) | ownership |
| **real_estate** no-rooms types (`land`, `commercial_land`, `shop`, `office`, `clinic`, `warehouse`) | offer_type, (rental_term if rent), property_type, area, ownership if sale | offer_type, area, property_type — **no** rooms/finishing | rooms, bathrooms, finishing |
| **industrial** | industry, capacity, condition, brand, year (+ industrial_type picker) | capacity, industry, industrial_type | material, fuel_type, offer_type, rooms |
| **raw_materials** | material, capacity (qty), origin | capacity, material, industrial_type (auto `raw_material` at submit) | **industry**, fuel, RE fields |

Sibling cleanup on toggle (`setSpec`): sale → drop `rental_term`; rent → drop `ownership`.
Required badge uses `requiredSpecKeys.includes(field.key)` (dynamic), not static `field.required`.

## Search / FilterSheet

| Browse category | Chrome / filters | Cleared on category change (`CLEAR_ATTRS`) |
|---|---|---|
| **car** | engines (import etc.), brand, year, fuel, transmission | brand, model, fuel, transmission, years, industry, origin, industrialType, rentalTerm, **material** |
| **real_estate** | engines (sale/rent/types); rental_term **only if `offer_type=rent`** | same CLEAR_ATTRS |
| **facilities** | IndustrialSubChips + **industry only** (origin **hidden** — materials company) | same |
| **materials** + all / raw_material | IndustrialSubChips + **origin** + **material chips** (industry **hidden**) | selecting all/raw_material forces `industry: null` |
| **materials** + machine / production_line | industry + origin; material **cleared/hidden** | leaving raw_material → `material: null` |

Fuel/tx live only in FilterSheet (not as car engine chips) — M27.  
Commodity `material=` browse filter — M28 (API + contract + FilterSheet).

## API sync

| Layer | Behavior |
|---|---|
| `ListingService.validateAttributes` | RE rooms required except noRooms list incl. `warehouse`, `commercial_land` |
| `NormalizationService.attributeCompleteness` | `industrial_type=raw_material` scores `capacity` + `industrial_type` + `material` (not `industry`); taxonomyExpected = 1 for raw_material |

## Proofs run (this machine)

| Check | Result |
|---|---|
| `node --test tests/lib-hardening.test.mjs` (banco-mobile) | **pass** (incl. new materials/industry gate test) — re-run after this edit |
| `node audit/mobile/scripts/proof-create-fields.mjs` | static source proof (no tsx) |
| Vitest `ListingService.validateAttributes.test.ts` | blocked here by Vitest globalSetup needing `DATABASE_URL` — test file is pure; logic mirrored in source asserts |

## Still open (honest)

1. Device QA of create flows per category (not done in this session) — see `DEVICE-QA-SECTION-COMPANIES.md`.
2. Live Replit still stale for market_country / map cluster / material until redeploy.

## Closed this continuation

- **M28** Search `material=` filter end-to-end (API + contract + FilterSheet chips for materials all/raw_material).
- **M29** Web CLEAR + materials UI; API `allowCommodityMaterialFilter`; shared `CLEAR_SECTION_ATTRS`.
- **M30** Web market country + adaptive rental terms; corrected obsolete industrial_type memory.
- **M31** Hub `new_law` rent deep-link; feed applies `market_country`; facet CLEAR on category; home/web teaser send market; dead daily/monthly/yearly rental copy removed.
