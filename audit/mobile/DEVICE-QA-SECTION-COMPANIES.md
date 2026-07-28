# Device QA — Search section companies

**Status:** checklist only — **not executed** on a real device in this session.  
Use against a build that includes M23–M28 (local or staging after redeploy). Live Replit may still be STALE.

Tick each row once on Android or iOS. Do not mark PASS from code review alone.

## Cars company

| # | Scenario | Pass |
|---|----------|------|
| C1 | Open Search → Cars | Engines: new/used/import/bank/islamic only — no fuel/tx as engines |
| C2 | Filters → fuel + transmission | Chips work; results update |
| C3 | Discover → car import CTA | Opens marketplace import path — **not** under Business hub |
| C4 | Switch to Real Estate then back | No leftover offer_type / rooms / material on car query |

## Real estate company

| # | Scenario | Pass |
|---|----------|------|
| R1 | Sale engine | No rental-term chrome |
| R2 | Rent engine | Rental-term chips appear; selecting a term keeps rent |
| R3 | Leave rent → sale/villa | Rental term cleared; no rent-only noise |
| R4 | Warehouse property label | Reads as property warehouse (عقاري), not industrial |
| R5 | Host hub | Reachable from **Profile** only — absent from Search chrome |

## Facilities company

| # | Scenario | Pass |
|---|----------|------|
| F1 | Facilities → factory | Industry chips available |
| F2 | Origin local/imported | **Hidden** (materials-only) |
| F3 | Material chips | **Hidden** |
| F4 | Industrial warehouse label | Reads as industrial warehouse (صناعي) |

## Materials company

| # | Scenario | Pass |
|---|----------|------|
| M1 | Materials → all or raw_material | Origin chrome visible; industry **hidden** |
| M2 | Material chips (steel, …) | Visible; selecting sends `material=` and narrows list |
| M3 | Switch to machine / production_line | Material cleared; industry visible; origin still ok |
| M4 | Deep-link with `material=steel` on facilities | Must **not** apply (contract drops it) |

## Cross-company / preserved journeys

| # | Scenario | Pass |
|---|----------|------|
| X1 | Business hub / supply | Still last Discover block; supply CTA works |
| X2 | Market country change | List + map follow market (needs M23 live API) |
| X3 | Map pin bookable + price | Needs M24 live API |
| X4 | Create raw_materials | Asks material + capacity — **not** factory industry |

## Sign-off

| Field | Value |
|-------|-------|
| Build / commit | |
| Device | |
| API base | |
| Tester | |
| Date | |
| Result | OPEN until all critical rows ticked |
