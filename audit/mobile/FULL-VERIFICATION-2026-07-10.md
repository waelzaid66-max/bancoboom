# FULL VERIFICATION REPORT — 2026-07-10

Branch: `fix/mobile-master-stabilize`  
Rule: no fake greens. Code / automated / live / device are separate layers.

---

## 1) Automated proof (this machine) — ALL PASS

| Suite | Result |
|-------|--------|
| `artifacts/banco-mobile` all `tests/*.test.mjs` | **32/32 pass** |
| `lib/search-contract` all `tests/*.test.mjs` | **29/29 pass** |
| `audit/mobile/scripts/proof-isolation.mjs` | **ok: true** (0 failures) |

Includes: icons registry, lib-hardening (isolation + import origin sync), resilience, universal links, buildSearchParams, engine round-trip, hub goldens, mobile-web parity, market_country URL round-trip.

**Not run here:** API DB vitests (`SearchService.mapClusters.test.ts`) — need `DATABASE_URL` (not set in this shell). Local source **does** contain the assertions for bookable + market_country.

---

## 2) Static isolation proof (source truth)

```json
{
  "carEngineKeys": ["new", "used", "import", "bank", "islamic"],
  "fuelTxNotInCarEngines": true,
  "searchHasHostHub": false,
  "profileHasHostHub": true,
  "browseSectionSyncsOrigin": true,
  "selectEngineNoFuelWrite": true,
  "sheetOwnsFuel": true,
  "sheetOwnsTransmission": true,
  "discoverImportBeforeBizHeader": true,
  "discoverSupplyInBizBlock": true,
  "discoverHasFacetGate": true,
  "apiHasMarketCountryFilter": true,
  "apiMapHasBookable": true,
  "apiSchemaMarketIso2": true,
  "apiSchemaMapBookable": true
}
```

### One-button ownership (enforced)

| Control | Owner | Evidence |
|---------|-------|----------|
| Host `/rentals/hub` | Profile only | absent from `search.tsx`; present in `profile.tsx` |
| Shopper rental terms | Search chrome chips | `search-rental-*` kept |
| Car fuel / transmission | FilterSheet only | `filter-fuel` / `filter-transmission`; not in `CAR_ENGINES` |
| Car journey engines | Chrome / Discover engines | `new/used/import/bank/islamic` |
| Car import CTA | Marketplace Discover (before Business header) | `discover-car-import` index < `businessHub` |
| Supply portal | Business hub block | `discover-supply-portal` after Business header |
| Import criteria write | `browseSection` + `selectEngine` + deep-link | all set `originType` from engine `origin_type` |

---

## 3) Live Replit host — STALE (proven, not guessed)

Host: `https://banco-ca-oom.replit.app`

### Health
- `GET /api/healthz` → **200** `{ "status": "ok" }`

### List search `market_country`
- `EG` vs `SA` (`/api/v1/search?category=car&limit=3&market_country=…`)
  - Same 3 listing IDs
  - **`egEqSa: true`** → filter **not applied** on live
- `market_country=EGYPT` (invalid ISO)
  - Live: **200 + data** (param ignored)
  - Local schema: regex `/^[A-Z]{2}$/` → would reject

### Map clusters
- Correct bbox params: `min_lat/min_lng/max_lat/max_lng/zoom`
- EG vs SA map: **18 clusters each, identical payload**
- Cluster keys live: `lat, lng, count, listing_id` only
- **`is_bookable`: absent**
- **`price_display`: absent**

### Conclusion
Live deploy does **not** include local M23/M24 (nor ISO validation). Redeploy API is mandatory before any live/device certification of market or map pins.

---

## 4) Local API code (present, not live)

| Capability | File evidence |
|------------|---------------|
| `marketCountryConditions` COALESCE→EG | `SearchService.ts` ~304–311 |
| Wired into list + map | conditions push ~392, ~552 |
| Map single pin `is_bookable` / `price_display` | `SearchService.ts` ~597–625 |
| Zod `market_country` ISO-2 | `schemas.ts` ~825–830 |
| Zod MapCluster bookable fields | `schemas.ts` ~945–954 |
| DB test for market map filter | `SearchService.mapClusters.test.ts` ~186–208 |

---

## 5) Device QA — OPEN

Plan DoD still requires one real-device pass per ID. **Not claimed done.**

Checklist: `MOBILE-STABILIZE-ACCEPTANCE.md` + `MOBILE-STABILIZE-EXTENDED.md` + `MOBILE-STABILIZE-SUCCESS-CERT.md`.

---

## 6) What is honestly CLOSED in code (M01–M27)

Code wires + automated gates for stabilize + isolation are closed on this branch.  
Live + device remain open until redeploy + Expo/device run.

---

## 7) Only next actions that change real-world result

1. **Redeploy** `api-server` (+ mobile if Expo host serves bundle) to Replit/staging.
2. Re-run live probe: expect `EG ≠ SA` when data tagged; map keys include `is_bookable`/`price_display`; `EGYPT` → 4xx.
3. Device QA per ID.
4. OPS O16 (secrets/EAS) unchanged — not a mobile code defect.

---

## 8) Scripts to re-verify anytime

```bash
# Mobile
cd artifacts/banco-mobile && node --test tests/*.test.mjs

# Contract
cd lib/search-contract && node ../../node_modules/tsx/dist/cli.mjs --test tests/*.test.mjs

# Isolation static proof
node audit/mobile/scripts/proof-isolation.mjs
```
