# Section isolation — field / button / map (strict)

**Rule:** Zero mixing between browse companies. Each Search surface is its own mini-app.

## Ownership (after strict pass)

| Company | Chrome owns | Must never show / send |
|---------|-------------|------------------------|
| **Cars** | engines new/used/import/bank/islamic; brand; year; fuel; tx; installment | rent terms, material, origin materials chrome, facilities industry |
| **Real estate** | sale/rent engines; rental_term **only with rent**; installment; bookable map pins | fuel/year/brand, material, origin |
| **Facilities** | factory/warehouse/land; factory-sector industry | origin, material, installment, car years, bookable chrome |
| **Materials** | line/raw/machine; origin; material chips; industry on machine/line | facilities origin, RE rent, installment, car years |

## Leaks fixed this pass

1. **Facet normalize** — dropping import/rent engines also clears `originType` / `rentalTerm`; collapsing industrial subtype clears materials industry/material.
2. **FilterSheet Apply** — years only commit for `car`; drafts reset on category change.
3. **Sticky map** — exits on full `criteriaKey` (fuel, material, years, price, …).
4. **Autocomplete** — API + mobile pass `category` (+ `industrial_type` group for facilities/materials).
5. **Installment** — UI + `buildSearchParams` gated to car/RE/all; cleared when entering facilities/materials.
6. **Map bookable** — calendar pin chrome only when browsing real_estate.
7. **Discover explore-map CTA** — requires mappable evidence for the company that will open (RE at root).

## Proofs

```bash
node --test artifacts/banco-mobile/tests/lib-hardening.test.mjs
node audit/mobile/scripts/proof-isolation.mjs
pnpm --filter @workspace/search-contract run test
```

## Map entry / exit

| Action | Behavior |
|--------|----------|
| Discover explore map | CLEAR + keep current company (or RE if Discover-all) → latch wantMap |
| Any criteria change | `criteriaKey` change → `mapMode=false` (back to list) |
| No mappable pins | map mode forced off |
| Listing focus=booking | only from RE bookable pins |

Host hub stays on Profile. Supply stays on Business hub. Import stays under Cars + Discover marketplace.
