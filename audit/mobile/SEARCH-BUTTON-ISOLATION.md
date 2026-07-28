# Search button isolation — one button = one mini-app

Rule (product): every Search control is its own app. No mixing host ops into shopper browse, no B2B label on a marketplace filter, no dual homes for the same axis.

## Ownership map (after isolation)

| Mini-app | Owns | Does NOT own |
|----------|------|--------------|
| Search chrome engines | Journey axes: new/used/import/bank/islamic; RE sale/rent/types | Fuel, transmission, host hub |
| FilterSheet | Fuel, transmission, year, price, near-me, payment; industry (facilities / machine / line); origin (**materials only**); **material** (materials all/raw_material) | Host `/rentals/hub`; origin on facilities; material on cars/RE/facilities |
| Rental-term chips (Search) | Shopper rent regime — **only when engine = rent** | Host bookings/units; villa/sale chips |
| Profile → Rental hub | Host ops `/rentals/hub` | Shopper browse |
| Discover → car import CTA | Marketplace entry → `car` + `import` engine | Business hub |
| Discover → supply portal | B2B `/business/supply-hub` | Car filters |
| Discover → explore map | Map-first browse latch | Near-me geo filter |
| FilterSheet → near-me | Geo radius | Map view toggle |
| Map toggle | List ↔ map for current results | Discover map entry |
| Section accents (`sectionTheme`) | Per-company chrome color on tabs/chips | Redesigning Discover photos |

## Fixes applied

1. Removed `search-rental-hub` from Search chrome (host path remains on Profile).
2. Moved `discover-car-import` out of Business hub block → marketplace (with car inventory gate).
3. Removed fuel/transmission from `CAR_ENGINES`; kept them in FilterSheet only.
4. `browseSection` + deep-link engine params sync `originType` like `selectEngine` (import is one write path).
5. Rent regime gated to explicit rent engine; contract `buildSearchParams` section-gates stale fields.
6. Origin chrome materials-only; warehouse labels split RE vs industrial.
7. Section company accents on active Search chrome.
8. **Strict isolation (2026-07-10):** facet normalize clears origin/rental/material dependents; FilterSheet years+payment gated; sticky map uses `criteriaKey`; autocomplete section-scoped; bookable pins RE-only. See `SECTION-ISOLATION-STRICT-2026-07-10.md`.

## Journeys preserved

- Rent browse: `engine-rent` + rental-term chips + listings.
- Import browse: `engine-import` + Discover car-import CTA.
- Supply / companies: Business hub section.
- Host rental hub: Profile menu.
