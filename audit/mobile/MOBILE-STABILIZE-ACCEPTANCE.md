# Mobile Master Stabilize — Acceptance Matrix

Branch: `fix/mobile-master-stabilize`  
Scope: `artifacts/banco-mobile` only. Reference folders are read-only.

## Phase 1 — P0

| ID | Scenario | Pass criteria |
|----|----------|---------------|
| M01 | Profile → Complete phone chip → Edit modal | Phone field + country dial picker; save via `updateMe`; chip disappears when phone set |
| M02 | Create listing → Add photos → Deny library permission | Alert with Open Settings (not silent return) |
| M03 | Home → switch Cars ↔ Real Estate | List stays visible (no full-screen empty skeleton wipe) |
| M04 | Home cold open | Stable skeleton/placeholders; no header/cards flash empty then jump |
| M12 | Messages AR ↔ EN | Bubbles align with RTL; send icon readable |

## Phase 2 — Search

| ID | Scenario | Pass criteria |
|----|----------|---------------|
| M05 | Open Search | ≤1 compact chrome row before results; results dominate viewport |
| M06 | Country | Single searchable country sheet (not endless chips) |
| M08 | Change market country then open map | Map initial center follows country (not stuck on Egypt) |
| M23 | Buyer: switch market country on Search | List + map inventory scoped by `market_country` (EG coalesces missing specs) |
| M09 | Rent engine | Rent filter works; bookable map path reachable; **host** rental hub via Profile (not Search chrome) |
| M10 | Industrial/supplies | Large CTA → `/business/supply-hub` |
| M11 | Cars import | Visible import path under **marketplace** (engine + Discover CTA); not under Business hub |
| M13 | Map then new search | List default after criteria change |
| M24 | Map single pin off current list page | Pin still shows bookable badge + price from cluster API |
| M27 | Search button isolation | Host hub ≠ Search; fuel/tx = FilterSheet only; import ≠ B2B |
| M28 | Materials → all / raw_material → Filters | Commodity material chips; API `material=` scopes list/map; machine/line clears material; facilities never show material |
| M29 | Web search category change + materials filters | `CLEAR_SECTION_ATTRS`; industry/origin/material chips match mobile gates; API rejects material on car/RE/facilities-only |
| M30 | Web market country + adaptive rental terms | SearchControls `marketCountry` select; rental chips from market catalog (not daily/monthly/yearly stubs); sanitize on market/engine change |
| M31 | Hub + feed market + facet CLEAR | Hub `engine=rent&rental_term=new_law`; feed applies `marketCountryConditions`; facet category wipe; home/web teaser send `market_country` |

## Phase 3–4

| ID | Scenario | Pass criteria |
|----|----------|---------------|
| M14 | Reaction on card | Persists / clear feedback |
| M15 | Assistant | Works or honest error |
| M16 | Notifications | Routes to correct screens |
| M17 | Business profile | Bank/developer paths reachable |
| M18 | Discover grid | Even card widths |

## Role journeys (M23/M24)

| Role | Journey | Pass |
|------|---------|------|
| Seller | Publish any listing | `specs.market_country` = preferred Search market (persisted); normalize falls back to EG |
| Buyer | Change market → search list/map | Results match country; SA excludes EG-coalesced legacy unless tagged SA |
| Host | furnished_daily on map | `is_bookable=true` + `price_display` on single pin without needing feed page hit |
| Business | Discover order | Business hub remains last section (unchanged) |
