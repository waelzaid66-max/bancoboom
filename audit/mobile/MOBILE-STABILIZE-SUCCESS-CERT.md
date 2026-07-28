# Mobile Master Stabilize — Success Certification (Cloud + Plan)

Branch: `fix/mobile-master-stabilize`  
Built from: plan DoD, `MOBILE-STABILIZE-*`, cloud STATUS/USER_JOURNEY, OPEN-ITEMS O16.

## Verdict (honest)

| Layer | Status |
|-------|--------|
| **Code for M01–M31** | **CLOSED** — wires + contract + API done |
| **Automated proof available offline** | **PASS** where tests exist (see Evidence) |
| **Live Replit host** (`banco-ca-oom.replit.app`) | **PARTIAL** — wave 6 FRESH · wave 8 STALE (`seller.social_links`). See `LIVE-DEPLOY-PROBE.md` |
| **Definition of Done (real device per ID)** | **OPEN — Device QA** after redeploy |
| **OPS O16** (staging smoke / EAS) | **OPEN — OPS** (not a mobile code defect) |

**Publish success path (only):** `MOBILE-PUBLISH-SUCCESS-GATE.md`.

Plan todos were marked completed for **code phases**; DoD still requires one real-device pass per ID. That contradiction is intentional and documented here — we do not fake device sign-off.

---

## Master table → success criterion → code proof

| ID | Cloud/plan success (short) | Code proof | Auto / Device |
|----|----------------------------|------------|---------------|
| M01 | Phone save in profile | `profile.tsx` + `CountryCodePicker` + `updateMe` | Device |
| M02 | Gallery deny → Open Settings | `create.tsx` `requestLibraryPermission` Alert | Device |
| M03/M04 | No home wipe / stable first paint | `index.tsx` `isFirstPaint` | Device |
| M05 | ≤1 chrome row | compact search chrome | Device |
| M06 | Searchable country sheet | `MarketCountryPicker` | Device |
| M07 | No endless country chips | removed chip ScrollViews | Device |
| M08 | Map center follows market | `marketCountryMapCenter` + mapHtml | `lib-hardening` mapHtml |
| M09 | Rent + bookable path | engines + rental-term chips; host hub on Profile | Device |
| M10 | Supply CTA | Discover → `/business/supply-hub` | Device |
| M11 | Car import | search-contract `import` + Discover marketplace CTA | `lib-hardening` |
| M12 | Messenger RTL | bubbles/tails | Device |
| M13 | Criteria change → list | `criteriaMapKey` clears map | Device |
| M14 | Like → learning signal | `interested` behavior | Device |
| M15 | Assistant works or honest error | error surfaces | Env+device (`OPENAI_API_KEY`) |
| M16 | Notif routing | `notificationRouting.ts` | `lib-hardening` |
| M17 | Business paths on profile | Business & Supply menu | Device |
| M18 | Discover even cards | 47% no flexGrow | Device |
| M19 | Other brand always reachable | `CarPicker` create mode | Static (path review) |
| M20 | Icons not CircleAlert | registry + icons test | `test:icons` |
| M21 | Business hub last | Discover: marketplace then B2B (import not inside B2B) | Device |
| M22 | Web map / near-me / explore | map hosts + criteriaMapKey | Static + web |
| M23 | `market_country` filters list+map | SearchService + buildSearchParams + preference | search-contract tests |
| M24 | Cluster bookable+price from API | MapCluster fields + map hosts | needs `DATABASE_URL` for DB vitest |
| M25 | All popular brand chips | `QUICK_BRANDS` | Static |
| M26 | Discover engines/brands honest | `SearchDiscover` + `visibleEngines` / car facet gate | Device after redeploy |
| M27 | Search button isolation | Host hub off Search; import under cars; fuel/tx in FilterSheet only | `lib-hardening` isolation test |

See also: `HONEST-INVENTORY-2026-07-10.md`, `SEARCH-BUTTON-ISOLATION.md`.

### Role journeys (from ACCEPTANCE)

| Role | Criterion | Code |
|------|-----------|------|
| Seller | Publish stamps `specs.market_country` | create + NormalizationService + **preferred market** shared with Search |
| Buyer | Switch market → list/map scoped | `market_country` query param |
| Host | Off-page pin bookable+price | `MapCluster.is_bookable` / `price_display` |
| Business | Hub last on Discover | M21 order |

---

## What only you can close (cloud OPS)

From `OPEN-ITEMS-BACKLOG.md` **O16**, `STATUS_REPORT.md` §4, `USER_JOURNEY_REPORT.md`:

1. Staging secrets (`STAGING-REQUIRED-SECRETS.md`)
2. Device publish smoke (upload byte-path / Object Storage)
3. OTP / Google / Apple (Clerk dashboard)
4. GPS / push / store forms
5. `eas build --profile preview` when ready

These are **not** reopeners of M01–M25.

---

## Device QA checklist (copy for a run)

Use `MOBILE-STABILIZE-ACCEPTANCE.md` + `MOBILE-STABILIZE-EXTENDED.md` §Device QA  
+ section companies: `DEVICE-QA-SECTION-COMPANIES.md` (M28 material / rent / origin).  
Tick each ID once on a real Android/iOS build against staging API.
