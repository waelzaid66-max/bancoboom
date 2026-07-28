# Mobile Master Stabilize — Extended Issue Table (honest)

Branch: `fix/mobile-master-stabilize`  
Scope: `BANCO-CA-OOM` only. Reference folders untouched.

## Truth check (why earlier “all good” was wrong)

Earlier pass closed **M01–M18 code wires** but did **not** validate:

- Publish philosophy vs brand UX (custom brand buried)
- Discover product mix (B2B mid-feed feels alien)
- Map **web stub** / near-me latch / explore hijack
- Icon registry gaps (`icon="…"` not in icons test)
- Country picker (was UI-only; now `market_country` on list+map)

Those are real defects. This table tracks them.

---

## Master issues

| ID | Issue | Severity | Status |
|----|--------|----------|--------|
| M01–M18 | Prior stabilize set | P0–P2 | Code done (need device QA) |
| **M19** | Car brand felt allowlist-only; taxonomy docs said REJECT | **P0** | **Fixed** — always-visible Other brand + open-publish docs |
| **M20** | Many icons → CircleAlert (Android dense screens) | **P0** | **Fixed** — registry aliases + icons test scans `icon=` / on/off |
| **M21** | Discover order mixes B2B into browse; “last section ≠ app” | **P0** | **Fixed** — marketplace rails first; Business hub last |
| **M22** | Map: web stub, near-me sticky, explore→always RE | **P0** | **Fixed** (web clusters+center; near-me in map key; explore keeps category) |
| **M23** | Market country does not filter list/map APIs | **P1** | **Fixed** — `market_country` on search+map; specs key + create/normalize write; COALESCE→EG |
| **M24** | Bookable pin only enriched from loaded page | **P1** | **Fixed** — `MapCluster.is_bookable` + `price_display` from API; mobile prefers server |
| **M25** | createSafe still filtered popular brand chips | **P1** | **Fixed** — QUICK_BRANDS = all popular |
| **M26** | Discover engines/brands not inventory-honest | **P1** | **Fixed** — facet gate + car brand gate |
| **M27** | Search buttons mixed apps (host/B2B/fuel dual) | **P0** | **Fixed** — see `SEARCH-BUTTON-ISOLATION.md` |

---

## Philosophy locked in code comments

- Catalogue brands = **suggestions**
- Interactive create = **autoLearn + lenient**
- Custom brand always reachable in create picker
- Discover marketplace ≠ Business hub (visual separation)
- **One Search button = one mini-app** (no host ops in shopper chrome; fuel/tx only in FilterSheet)

---

## Device QA still required

Full checklist + cloud/plan DoD mapping: **`MOBILE-STABILIZE-SUCCESS-CERT.md`**.

Quick list:

1. Create car → Other brand → type unknown → publish
2. Settings/profile icons not CircleAlert
3. Discover: browse/map/rails/import before Business & sourcing (supply only in B2B)
4. Map on web + Android; near-me clears map mode
5. Explore map keeps current section when not “All”
6. **Seller:** publish listing → `specs.market_country` = preferred Search market (not always EG)
7. **Buyer:** switch market SA → list+map exclude EG-only inventory; EG includes null-key legacy
8. **Host:** furnished_daily pin shows bookable + price; hub opens from **Profile**, not Search
9. **Business:** Discover ends with supply/companies only (import is marketplace)
10. Fuel/transmission only in Filter sheet — not as car engine chips

