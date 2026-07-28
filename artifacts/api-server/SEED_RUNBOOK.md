# BANCO Seed Runbook

> Last verified: 2026-07-13 — full wipe → push-force → seed → verify passed in a single run.

## Quick start (fresh environment / after full wipe)

```bash
# 1. Wipe everything (drops all tables + enums in the public schema)
psql "$DATABASE_URL" -c "
DO \$\$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
  FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e'
            AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END \$\$;"

# 2. Re-apply schema (idempotent drizzle push)
pnpm --filter @workspace/db run push-force

# 3. Seed demo data
pnpm --filter @workspace/api-server run seed

# 4. Verify
pnpm --filter @workspace/api-server run seed:verify
```

Or use the convenience script (steps 3 + 4 only, after schema is applied):

```bash
pnpm --filter @workspace/api-server run seed:fresh
```

---

## What the seed produces

| Layer | Count | Notes |
|---|---|---|
| Users | 7 | 5 business (dealer/company/enterprise) + 2 individuals |
| Business wallets funded | 5 | 10,000 EGP opening balance each |
| Car listings | 25 | Brands, payment options (seller/bank/Islamic), normalization |
| Real estate listings | 15 | Mix of sale (10) and rent (5), mortgage options |
| Industrial listings (main) | 12 | Machine/factory/warehouse/land types |
| **Total main listings** | **52** | All 52 linked via normalization pipeline |
| B2B industrial listings | 6 | Supply-chain graph (raw → machine → line → factory) |
| **Total active listings** | **58** | All visible in the feed |
| Locations | 21 | Egypt geo-data with real WGS84 centroids |
| Car brands / models | 19 / 30+ | Taxonomy with variants |
| Monetization plans | 6 | individual_free → dealer_enterprise → bank_featured |
| Company profiles | 5 | Including industry + hq_country for Suppliers Directory |
| B2B supply edges | 6 | feeds_into / part_of / compatible_with |
| RFQs | 2 | 1 open, 1 awarded |
| Investment opportunities | 5 | All 5 sub-types (factory_sale, business_sale, franchise, …) |
| Global supply requests | 3 | With supplier responses |
| Leads (lead_history) | ~90 | Spread across prior + current windows for market trends |

---

## Idempotency guarantees

| Module | Guard | Safe to re-run? |
|---|---|---|
| `seedReferenceData` | `onConflictDoNothing` on slug | ✅ Yes |
| `seedPlans` | `onConflictDoUpdate` on slug | ✅ Yes (updates prices) |
| User creation | `onConflictDoNothing` on clerkId | ✅ Yes |
| `seedOpeningBalances` | `onConflictDoNothing` on idempotency_key | ✅ Yes |
| Car / RE / Industrial listings | **No guard** — raw INSERT | ⚠️ Duplicates if re-run without wipe |
| `seedB2B` | Guards on `listingLinks` existence | ✅ No-op if already seeded |
| `seedSupplyChain` | Guards on `investment_opportunities` count | ✅ No-op if already seeded |

**Bottom line:** `seed.ts` is idempotent for reference/master data but will duplicate listings
if run more than once. Always wipe first, or use `seed:admin` / `seed:verify` for additive
follow-up runs.

---

## Non-idempotent paths identified

1. **Listing generation loops** (cars, real estate, industrial) — raw `INSERT` with no
   uniqueness check. Mitigation: the `seedB2B` and `seedSupplyChain` guards detect prior
   state and skip, but the main listing loops do not. Running seed twice without wipe
   will double the listing count.

2. **`leadHistory` inserts in `seedSupplyChain`** — not guarded on (listingId, sellerId).
   Multiple runs would accumulate leads, not replace them. This is acceptable for demo
   data but worth noting.

3. **`globalSupplyRequests` / `globalSupplyResponses`** — plain INSERTs; same as above.

---

## CI / automation check

```bash
# Exit 0 = DB populated correctly, Exit 1 = needs seed
pnpm --filter @workspace/api-server run seed:verify
```

Expected output after a correct seed:
```
✅ Seed verified — database is populated
   Active listings : 58
     car             : 25
     real_estate     : 15
     industrial      : 18
   Users           : 7
   Locations       : 21
   Car brands      : 19
```
