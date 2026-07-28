# BANCO — Master Production Tracker (anti-forgetting ledger)

> Single ledger for the Master Production Recovery Program. Every owner instruction, every module, every open task lands here so nothing is lost between sessions.
> Source of truth repo: **`bancostormainvirgen` / main**. Mirror: `bancoo` branch `claude/facebook-oauth-e1` (PR #8) — used to run CI.

## 0. Standing rules (owner-set, always apply)
1. **Study before touching.** Read the module, its history, its dependencies — never experiment on production code.
2. **Test before AND after every change**, plus everything around it, so nothing else breaks.
3. **Evidence only.** No guessing. Unproven → **UNKNOWN**, never a claimed fix.
4. **Never redesign.** Polish only; the product identity and existing UI stay as they are.
5. **See it with the user's eye** before and after — icons, spacing, states, RTL.
6. **No large refactors, no blind merges, no deleting code that isn't proven dead.**
7. Work **one module at a time**: complete → verify → lock → next.
8. **Push after each command/step** to both repos.
9. **Never abandon a task mid-way.** A new owner instruction is *recorded* in this ledger and the in-flight task is *finished first*. Order: test before → fix → hard test after → real install/assembly → test again, including everything downstream → only then move on. (owner, 2026-07-27)
10. **Never invent problems, never experiment on the owner.** Every claim is measured. The project ships to real users; stability outranks everything.
11. **The preview the owner looks at must always equal the code.** A static export is a frozen snapshot — re-export `web-preview` after every visible change, or the owner reviews a version that no longer exists. (root cause of "أنا يُعرض أمامي نسخة غلط", 2026-07-27 — see §6)
12. **UX is a first-class deliverable**, not polish: compact, tidy, dynamic, simple. No exaggeration, no decoration for its own sake. Native Android + iOS quality is the bar.

## 1. Modules (one at a time)
| # | Module | State |
|---|---|---|
| **M1** | Accounts & Authentication (7 types) | **LOCKED** — audit `docs/audit/M1-ACCOUNTS-AUTH-MODULE-AUDIT.md`; 2 real gaps fixed, 3 proven non-defects, 1 UNKNOWN |
| **M1.5** | Accessibility pass on account screens | **DONE** — profile (`ccc882a`), onboarding + verification (`3647bb7`) |
| **M2** | Search + the 5 section mini-apps (isolation, filters, chrome) | **NEXT** |
| **M3** | Maps — per-section, radius/area draw (Nawy-class), pins, clustering, geocoding, tool offices | pending |
| **M4** | Listing create → publish → lifecycle | pending |
| **M5** | Messenger + notifications + emails | pending |
| **M6** | Payments / subscriptions / wallet / FI | pending |
| **M7** | Deployment: Coolify · Docker · EAS Android + iOS | pending |

## 2. Open tasks carried forward (do NOT drop)
- **enterprise / staff journeys** — never audited (M1 declared them out of scope).
- **UNKNOWN M1-F5** — are non-field Clerk errors (rate limit, network, existing session) invisible? Needs the official Clerk 3.3.1 contract or a live trial.
- **Accessibility beyond the account screens** — only 16 of 62 mobile files use accessibility props; the same silent-icon-button pattern likely repeats elsewhere. Sweep per module as each module is opened.
- **Uploads (images/video/documents)** — audit every upload point per module (picker → claim → verify → storage → cleanup).
- ~~**Countries/currencies still "spread"** in RE + Materials matrices — needs an explicit owner decision before touching.~~ → **DECISION RECEIVED 2026-07-27**: owner reports "في بعض الأقسام العملات والشرايط والفلاتر ما زالت غير مضغوطة وغير منسقة". That is the decision this line was blocked on. Collapse RE + Materials to the compact `MarketCountryButton`, and update the two stale guards. Measured evidence below (§7).
- **Vercel preview failures** on the PR (`bancoo-api-server`, one `admin-os` variant) — pre-existing infra, non-required checks; the real API target is Coolify. Confirm they also fail on `main` before spending effort.

## 2a. FULL census of the Search/Discover page — 10 rectangles, none missed
Read end-to-end from `components/SearchDiscover.tsx` (render ends line 476; styles start 480 — the banks card is the last one, and the host `app/(tabs)/search.tsx` adds no cards while Discover is showing). `SECTIONS = ["car","real_estate","facilities","materials"]` → exactly 4 grid cards.

| # | Rectangle | testID | Destination | Group |
|---|---|---|---|---|
| 1 | Cars | `section-card-car` | `/section/car` | 2×2 photo grid |
| 2 | Real estate | `section-card-real_estate` | `/section/real-estate` | grid |
| 3 | Factories | `section-card-facilities` | `/section/factories` | grid |
| 4 | Materials | `section-card-materials` | `/section/materials` | grid |
| 5 | Booking & Stays | `section-card-booking` | `/section/booking` | 5th wide portal |
| 6 | **Maps** | `discover-explore-map` | `/section/real-estate?map=1` | standalone |
| 7 | **Import your car** | `discover-car-import` | `/section/car?engine=import` | standalone |
| 8 | **Global supply** | `discover-supply-portal` | `/business/global-supply` | Business & supply |
| 9 | **Suppliers hub** | `discover-importers-hub` | `/business/supply-hub` | Business & supply |
| 10 | **Banks & financiers** | `discover-banks-hub` | `/business/banks` | Business & supply |

| **11** | **Map FAB (floating)** | `discover-map-toggle` | in-place map on the shared Search | **rendered by the HOST**, not by SearchDiscover |

### ✅ Verified against the RUNNING app (first successful Expo web export in this environment)
`npx expo export --platform web` succeeded (11 MB, `web-preview/`), served on `localhost:8099`, and the app **boots**: title "BANCO", category tabs, the bottom bar (Feed · Search · Messages · Saved · Profile) and "Post Asset". Opening the Search tab rendered all the cards above — which is how the following three findings were caught. **Reading the code alone would have missed them.**

#### Finding A — an 11th rectangle exists that the code census missed
`app/(tabs)/search.tsx:1131-1160` renders a floating **map FAB** over the Discover view (`viewState === "discover"` only). It was invisible to the earlier grep because it is in the host and its testID carries no card/portal/hub keyword.

#### Finding B — two different map entries with different destinations
| Entry | Goes to |
|---|---|
| Card `discover-explore-map` | `/section/real-estate?map=1` — the **real-estate section** map |
| FAB `discover-map-toggle` | stays on the shared Search, commits a search and flips map mode on, with `category "all" → "car"` — i.e. effectively a **cars** map |
Both are legitimate flows, but on one screen two map affordances lead to two different worlds. **Owner decision** for the Maps wave — not changed unilaterally.

#### Finding C — two cards read as the same thing in English
"**Global supply portal**" (→ `/business/global-supply`, *RFQs, suppliers & industrial import — Alibaba-style hub*) sits directly above "**Global supply & importers**" (→ `/business/supply-hub`, *Source products, match importers & close export deals*). The owner treats them as distinct worlds (العالمية vs الموردين), but both labels open with "Global supply", so the list reads as a duplicate. Copy-only clarification (no layout change) — **owner decision on the wording**.

### Identity rules encoded in the design (any new/edited rectangle MUST follow these)
1. **Per-section gradients stay inside the BANCO red/charcoal family** — each card reads as its own world without leaving the brand.
2. **Red-family fallback fills sit behind the section photos** — stated in-code as the identity rule: *logo red*.
3. **A faint BANCO wordmark is embossed behind each card's content** — white-tinted, very low opacity, above the scrim but below the badge/label/chevron so it never fights legibility.

### Layer model (how the work cycle stays in harmony with the sections)
```
L1  Search host  → Discover = the 10 rectangles
L2  5 section mini-apps (4 share SectionSearchApp + Booking standalone)
L3  5 business/tool mini-apps (maps · import · global supply · suppliers · banks)
L4  Each mini-app's own system (inner screens + API + notifications)
```

### Observation the owner did not raise (surfaced during the census)
The **Maps** card opens the real-estate map only. That is a documented, deliberate choice (the destination is "honest" — it falls back to the list when a browse has no coordinates), but it is a real functional limit: cars/factories/materials also carry coordinates. Flagged for the Maps wave — **owner decision**, not changed unilaterally.

## 2b. Portal destinations — connection audit
Portal inventory read from `components/SearchDiscover.tsx` — **every destination file exists, so no dead buttons**:

| Portal (testID) | Owner's name | Destination | Route exists |
|---|---|---|---|
| `discover-explore-map` | الخرايط | `/section/real-estate?map=1` (via `onExploreMap`) | ✅ |
| `discover-car-import` | استورد عربيتك مع بانكو | `/section/car?engine=import` | ✅ |
| `discover-banks-hub` | البنوك والممولين | `/business/banks` | ✅ |
| `discover-importers-hub` | الموردين | `/business/supply-hub` | ✅ |
| `discover-supply-portal` | الحاجات العالمية | `/business/global-supply` | ✅ |
| `section-card-booking` | الإقامات | `/section/booking` | ✅ |

### 🔴 OPEN GAP — car-import entry is disconnected from the import system
The car-import card only **browses** imported cars. The live import flow that now exists end-to-end (L1–L7: `import_orders` → API → `/import/request` → `/import-tracking` → `car_import` notifications) is reachable **only from a Profile menu item** (`profile.tsx:943`); `/import/request` is reachable only from inside the tracking screen. A user standing on the Search page who wants to actually import a car cannot get there.

**Why this is not fixed unilaterally:** the card's destination is locked by an owner-approved guard — `tests/section-miniapp-guard.test.mjs:492` asserts the Discover file keeps `SECTION_ROUTE.car … engine=import`. Doc 09's original plan was to turn the card into an **Import hub** (`app/import/index.tsx`) offering: browse imported cars · request an import · my import orders.

**Owner decision needed — options:**
1. **Import hub** (doc 09's plan): card → `app/import/index.tsx` with the three paths; browse path preserved inside it. Requires updating that one guard assertion (it was written for the old behaviour).
2. **Additive, guard-safe:** keep the card on browse, and surface "Request an import / My orders" inside the car section's import view — no guard change.
3. Leave as-is (import stays a Profile-menu feature).

## 2c. Cross-repo archaeology (5 repos, all branches) — 2026-07-26
Repos mapped: `b.deals` (2 branches) · `aws-virgen` (1) · `B-OOM` (1) · **`-BANCO-CA-OOM-` (61 branches — where the two prior engineers worked)** · `bancoo` (9).

### The decisive discovery: the previous engineers were environment-blocked
Their own `KnownIssues.md` (2026-07-21): **`KI-ENV-01 | OPEN | npm registry ECONNRESET — no node_modules`**, and their #1 pending repair was *"Unblock KI-ENV-01 → frozen install → typecheck/lint/build/tests"*. **They could never install dependencies, so they never ran typecheck, build, or a single test.** That explains the documentation-heavy output and the doc-over-claim pattern recorded in [[banco-recon-docs-fiction]]. Every one of those blockers is now cleared: full install ✅, tsc 0 ✅, 81 test files green on CI ✅, `expo export` build ✅, app driven live ✅.

### Their official "MissingFeatures" list vs today
| Their item | Status now |
|---|---|
| Facebook Login provider | ✅ **built + verified** (`6778e65`) |
| FI auto-create | open — needs study (`audit/production-gates/FACEBOOK-LOGIN-AND-FI-AUTOCREATE-SECURITY-…`) |
| Google Maps as live map engine | open — owner decision (today: Leaflet/OSM in a WebView) |
| bancooom content (repo empty) | ✅ effectively closed — `virgen/main` now carries the full version |
| Live OTP/magic-link certification | open — needs a live run |

### Code-completeness verdict (reassuring)
102 files exist in CA-OOM but not here: **97 are docs/reports, 5 are report-generator scripts — zero application code.** The current version carries all app code.

### 🔴 THREE genuinely lost features (found by diffing CA-OOM against us)
| # | Feature | Evidence here | Impact |
|---|---|---|---|
| 1 | **Banks/FI “awaiting-admin link” state** | no `awaiting`/`adminLink` anywhere in `app/business/banks.tsx`; CA-OOM has it **plus a guard test** we don't | an FI user without membership never sees that an admin still has to link them |
| 2 | **Profile role must prefer `/me` over Clerk `publicMetadata`** | ours reads `user.publicMetadata?.role` at `profile.tsx:800` and `:1195`; CA-OOM guards *“Profile role prefers /me over Clerk publicMetadata”* | **real defect** — `syncRoleToClerk` swallows its errors by design, so when the mirror fails the profile shows a stale/wrong role for any of the 4 account types. The DB is the source of truth. |
| 3 | **`marketCountryMapCenter`** | absent from our tree; CA restored it after it was wiped in `93b650b` (orig `b68c8af`), wired into `lib/searchTaxonomy.ts` + `SearchResultsMap.tsx` + `.web.tsx` + `mapHtml.ts` | switching market country does not recenter the map |

Guard parity: ours **46** section-guard tests vs CA-OOM **48** — the two missing ones are exactly the guards for lost features #1 and #2.

### Correction to an earlier claim of mine
I previously reported the **radius draw/select** map tool as *missing*. Their `MAPS-ACCOUNTS-COMPLETE-MISSING` doc shows it is **deliberately deferred**, not forgotten: *“لم يُشحن كاملاً — يزاحم FilterSheet المضغوط”*. Also deferred by decision: `sort=nearest`, full web viewport clusters, near-me on web. **Not gaps — owner-level decisions.**

### Their accounts verdict matches mine independently
*"سلسلة الحسابات في المصدر مكتملة… أي عَرَض برودكشن بعد deploy = P1 Ops لا إعادة تصميم UX"* — the same conclusion my M1 audit reached from the code alone.

## 2d. The engineers' MissingFeatures list — now fully resolved
Their `audit/production-gates/FACEBOOK-LOGIN-AND-FI-AUTOCREATE-SECURITY` marks both remaining items **INTENTIONALLY NOT IMPLEMENTED (security + tenant truth)**, which changes what "missing" meant:

| Item | Resolution |
|---|---|
| Facebook Login | Their own prescribed path was: (1) owner enables it in Clerk + Meta, (2) **add `oauth_facebook` beside Google/Apple with the same redirect contract**, (3) update tenant memory. The owner did (1) and asked for it; `6778e65` is exactly (2) — a real strategy, not a stub; (3) is now done. **Closed.** |
| **FI auto-create** | **Must never be built.** Auto-creating a financing intermediary at signup would mint a privileged org with no admin review = permission escalation. Their own "already product-complete" table shows the only missing link was the **awaiting-admin-link UI** — which is exactly what R2 restored. **Closed by R2.** |
| Google Maps as engine | still an owner decision (today: Leaflet/OSM) |
| bancooom content | closed — `virgen/main` carries the full version |
| Live OTP/magic-link certification | needs a live run on a real device |

### ⚠️ Launch blocker recorded (not a code defect)
`.agents/memory/banco-auth-tenant-limits.md` carries a live probe from 2026-07-21: the **production** Clerk instance (`clerk.banco.today`, `pk_live`) had **no social providers at all** — `social` empty, `identification_strategies = ["email_address"]`. That means **Google and Apple were already dead paths on production too**, not just Facebook. All three start working with **zero code changes** the moment each provider is configured in the Clerk Dashboard. **Before any store submission, confirm each enabled provider actually resolves on `pk_live` — shipping a visible social button that always errors is a review risk.**

## 2e. Performance & media pipeline (owner: cache · CDN · image/video processing)
Audited from code, not assumed.

| Concern | Reality today | Verdict |
|---|---|---|
| Profile-open cycle (signup → profile) | 4 queries fire **in parallel**, every one `enabled: !!user` (a guest never fires an authed call) with `staleTime` 60s (me / metrics / social) and 30s (listings). The DB row is created lazily on the first authed call, race-safe, and the welcome email is fire-and-forget so it can never delay the screen. | ✅ already optimised |
| Image caching in-app | `expo-image` on 12 surfaces (disk + memory cache built in) | ✅ |
| Media cache headers | S3 layer sets `Cache-Control: public\|private, max-age=3600` per object visibility | ✅ CDN-ready |
| Upload compression | Cover + avatar picked at `quality: 0.6` before upload | ✅ |
| Upload security | Presigned S3 PUT; serving URLs promoted/verified server-side | ✅ |
| **CDN** | **Not configured anywhere** — absent from `.env.example`, the Coolify compose, the nginx config and the deploy doc. Every image is served from a single origin. | 🔴 **real gap — ops, not code** |

**Why the CDN gap matters at this scale:** users in the Gulf, Morocco and Europe all pull media from one origin, so latency and egress both scale with traffic. **The app is already CDN-ready** — the correct cache headers exist — so this is a deployment/config task (point a CDN at the media origin, publish media through the CDN hostname), not an application rewrite. Recorded here so it is not mistaken for a code defect.

### The rest of the media pipeline — now audited (was listed as pending)
| Concern | Reality | Verdict |
|---|---|---|
| Listing upload compression | images `quality: 0.7`, profile cover/avatar `0.6` | ✅ |
| Video | modern `expo-video` (not deprecated `expo-av`); duration capped via `videoMaxDuration` + `allowsEditing`, so an over-long clip is **trimmed in-app instead of rejected**; a server-side size guard test exists | ✅ well handled |
| Thumbnail selection | `pickListingThumbnailUrl`: explicit cover → first image → **video poster**, with an explicit guarantee that a raw video file never reaches an `<Image>` (a real bug class, prevented) | ✅ |
| Feed prefetch | batched `Image.prefetch` with a Set that de-dupes, run both on load and for upcoming items while scrolling, non-blocking | ✅ |
| **Image resizing** | **None.** The thumbnail picker returns the **original** upload URL, so a feed card downloads a full-resolution image. | 🔴 gap |

**These two gaps are one problem.** Modern platforms do resizing **at the CDN edge** (Cloudflare Images / imgix / CloudFront). Adding a CDN with image transformation closes both the caching gap and the resizing gap **without touching app code** — the cache headers already exist and every media URL is built from one origin. At feed scale (≈20 cards × full-resolution images) this is the single highest-impact performance item for mobile networks across EG/Gulf/MA/EU.

## 2f. Full-cycle rule (owner, standing)
Any task is only finished when its **whole journey** is inspected end to end — e.g. signup → account created → **profile actually opens fast** — not just the file that was edited. Applies to every module below.

## 2g. M4 — the publish journey (highest-value cycle, audited end to end)
Prioritised above the remaining polish because a marketplace with no successful publish has no inventory. Audited from the create wizard through to the listing appearing in the feed.

| Stage | What the code actually does | Verdict |
|---|---|---|
| Draft | Multi-step wizard persists a draft and restores the step on return | ✅ |
| Submit guard | Re-runs `validateStep` for **every prior step** and jumps back to the first failure, so a deep-linked or edited draft can't post an invalid body | ✅ |
| Requests vs sales | A buyer request omits `base_price_cash` entirely so the server applies request rules instead of storing a 0 price; photos optional for requests, required for sales | ✅ subtle and correct |
| Thumbnail | Flags the **first image** (never a leading video) as `is_thumbnail`, mirroring the server's `pickListingThumbnailUrl` — the feed renders it in an `<Image>` | ✅ contract honoured on both sides |
| Media race | Re-checks every tile is `uploaded` even though the button is already gated, "so a race can never POST a half-uploaded set" | ✅ |
| Phones | Normalised to E.164 per country | ✅ |
| Payment plans | Cash always present; installment plans validated (monthly + duration required, profit rate bounded 0–100) | ✅ |
| Market stamp | `market_country` + `currency` written into specs; origin (local/imported) only for car + industrial, never for a request | ✅ |
| **Failure** | 402/403 → explicit quota copy; otherwise the **real API reason** is extracted from the error and shown, instead of a silent generic retry | ✅ |
| **After success** | Clears the stale draft, then `bumpListings()` bumps `listingsVersion` in SessionContext — consumed by the home feed and the profile grid, so the new listing appears **with no manual pull-to-refresh** | ✅ cycle closes |

**Verdict: the publish path is production-grade; no defects found.**

### Bonus: an old known bug is confirmed FIXED
The historical "#1 publish failure" (mobile sent the Arabic location *label* while the backend fuzzy-matches the English taxonomy → 400 on every publish) is resolved: create now sends `(locationValue ?? location).trim()` with an explanatory comment, and dealer-os listings moved from a free-text input to a controlled `<Select>`. dealer-os **investments** still take free text, and that is correct — `InvestmentService` never normalises location (plain `ILIKE`), so it does not use the listing taxonomy. **Standing rule kept:** location has no Arabic alias map and the `locations` table has no Arabic column, so any NEW location field must submit the controlled English value.

## 2h. M3 — Maps (foundation module, audited before the flows that sit on it)
Re-ordered at the owner's direction: maps and the mini-apps are the base that publishing, notifications and messaging build on, so they are completed first.

### What the map already is — a two-layer, production-grade surface
| Layer | Implementation | Verdict |
|---|---|---|
| Instant paint | The loaded page's markers render immediately as **price pills**, so the map is never blank while the first viewport query is in flight | ✅ |
| Live data | **Server-side viewport clusters** via `GET /search/map`; the page reports its bounds on load and after every pan/zoom (`{type:"viewport"}`) and the host injects the clusters back | ✅ |
| Pin content | The **localized, pre-formatted price** sits on the pin; furnished/daily rentals get a **📅 bookable** prefix | ✅ |
| Section colour | `.pill.car` / `.real_estate` / `.industrial` — and that is **complete**, because the DB enum has exactly three categories; "facilities" and "materials" are UI views of `industrial` (hence `apiCategoryForUi`). All stay inside the BANCO red family per the identity rule stated in-code; bookable emerald is a *status* colour that deliberately wins over the section tint | ✅ no gap |
| Coverage | Coordinates resolve as `COALESCE(listing.lat, location.lat)`, so a listing with no precise pin still maps from its city/area — **nothing is unmappable** | ✅ |
| Per section | `showMapChrome = inResultsView` — the map is available in **all five sections**, not real-estate only | ✅ |
| Market framing | `marketCountryMapCenter` (restored, R3) | ✅ |
| Near-me | radius circle + centre dot, with the 5/10/25/50/100 km control | ✅ (this wave) |

### Genuine remaining gaps
| Gap | Nature |
|---|---|
| The Discover "Explore on the map" card opens the **real-estate** map only, although every category is mappable | **owner decision** — the destination is deliberate today |
| Draw-an-area / polygon select | deferred by the previous engineers (would crowd the compact FilterSheet); the km-radius control now covers the common case |
| `sort=nearest` | deferred — changes result ordering |
| Full web viewport clusters | deferred to a `.web.tsx`-only wave |

**Verdict: the map is not a weak spot — it is one of the stronger subsystems.** The remaining items are two deferred decisions and one owner choice, not defects.

## 2i. Per-app inventory — strong layers vs what is genuinely missing
Written after the owner pushed back that the audit was too broad. Honest per surface, including where **I** had not looked.

| App / surface | Strong layers (verified) | Genuinely missing |
|---|---|---|
| **Booking / stays (apartments)** | Custom calendar with **server-driven availability**; booked nights computed as the half-open `[check_in, check_out)` so adjacent stays remain bookable — explicitly mirroring the server's overlap rule; past days and taken nights unselectable; a span crossing a taken night restarts the selection; live nights × price estimate; AR/EN month + weekday labels with RTL; cannot page before the current month. On reserve: success invalidates availability so the nights grey out instantly, and **failure assumes a race** ("taken between load and tap"), refetches and asks for a new pick. | Nothing found in the booking flow itself. Payment-through-us for furnished/daily is a separate module (M6). |
| **Header animation (home)** | `HeaderSpark`: the B-OOM mark crosses the gap between the BANCO wordmark and the actions **once every 30s**, "like a branded car driving through". Verified the maths matches the comments exactly (fade-in 26.0s, glide 26.25s→30s ≈3.75s, fade-out from 28.5s). Only `translateX` + `opacity` (GPU, no layout), 16px vs the 26px wordmark so it never competes, and **`prefers-reduced-motion` renders it static**. | Nothing — this *is* the finished polish. |
| **Car import** | DB → OpenAPI → service → routes → request form → live tracking → notifications (L1–L7), plus the error state fixed this wave. | **Never exercised end-to-end against a running API/DB.** Types, guards and CI pass, but no real order has been created. Honest status: built + verified, **not yet lived**. |
| **Suppliers hub** | Pure navigation surface (correctly no API); **all 8 destinations exist** — industry, investments, suppliers, global-supply, market, analytics, company/edit, rfq-inbox. | — |
| **Global supply** | API-wired with loading / error / empty states. | a11y labels (icon-only controls) |
| **Maps** | See §2h — two-layer render, viewport clusters, price pins, section tints, market centring, radius circle. | Discover map card is RE-only (owner decision); draw-area, sort=nearest, full web clusters (deferred) |

### Where I was NOT at full strength (owner was right)
I ran broad module sweeps and pushed real fixes, but I had **not** audited the booking/calendar lifecycle at all, had **not** looked at the header animation, and had **not** produced this per-app breakdown — while still moving on to the next module. Both gaps are now closed above; the import "not yet lived" status stays open and is stated plainly rather than implied as done.

## 3. Product decisions to honour
- **The AI assistant is “B”** — the same **B** as the B-reaction that replaces like/heart (B‑OOM identity). It should feel **human**, not robotic.
  **Constraint from the owner: it is already programmed to a high standard — apply only a light, safe polish (tone/persona/naming). No rewrite, no behavioural risk.**
- **B‑OOM = B(anco) + Owners Opportunity Market.** Never alter the original logo/design.
- Rent model: furnished/daily = hotel-style booking (dates/nights/pay-through-us); long-term = plain listing (no dates, no payment).
- FI (banks) is an ads + financing-inbox surface — deliberately **not** a dealer storefront.

## 4. OPS gate (owner-side, not code)
1. Merge PR #8 (or treat `virgen/main` as canonical).
2. Coolify: deploy → run **once** `docker compose --profile migrate run --rm migrate` (creates `import_orders`) → set `OBJECT_STORAGE_PROVIDER=s3` + secrets.
3. Clerk prod: real `pk_live` + Allowed Origins + enable Google / Apple / **Facebook** (Meta app).
4. **Rotate the GitHub token** shared in chat.

## 5. Verification standard used on every change
`mobile tsc` + **all 7 mobile gates** (section-guard 48/48, icons, i18n-usage, lib-hardening, resilience, session-restore, universal-links) + `api-server tsc` when the server is touched + **CI on PR #8** (API tests on real Postgres, typecheck, mobile regression, web build) as the authoritative run.
**Plus (2026-07-27): re-export `web-preview` and confirm the bundle hash changed** whenever the change is visible. A green test the owner cannot see is not delivered.

## 6. ROOT CAUSE — "أنا يُعرض أمامي نسخة غلط" (2026-07-27, measured)
The owner reviews `http://localhost:8099`, served by `npx serve -s web-preview` / `scratchpad/static-server.mjs` from `artifacts/banco-mobile/web-preview`.
That folder is a **static Expo export — a frozen snapshot with no HMR**. Measured: the folder was built **10:52**, while the code had moved on to **11:46+** (header spark `f769262`, decoupling `532ce0c`). So the owner was reviewing a build that predated the work being discussed.
Aggravating factor: **8 copies of the mobile app exist on this machine** (`bancoo-prod`, `BANCO-CA-OOM`, `bancoo-forensic-20260722`, `B-OOM`, `aws-virgen`, `banco done`, `banco-c-oom-wep-update`, `BANCO-CA-OOM-strongest-20260722`). Only **`bancoo-prod` @ `532ce0c`** carries current work; the rest are 6–19 days stale, and `BANCO-CA-OOM` even holds its own 19-day-old `dist/`.
**Rule (§0.11):** re-export after every visible change; the preview is part of the deliverable, not a convenience.

## 7. Compactness divergence — measured, not estimated (2026-07-27)
Country + currency control, per section:

| Section | Control | padH/padV | flag / country / currency (pt) | Width on screen |
|---|---|---|---|---|
| Stay | `MarketCountryButton` | 12 / 8 | 16 / 13 / 12 | ~140 px |
| Cars | `MarketCountryButton` | 12 / 8 | 16 / 13 / 12 | ~140 px |
| Facilities | `MarketCountryButton` | 12 / 8 | 16 / 13 / 12 | ~140 px |
| **Real-estate** | **spread `re-market-matrix`** | 9 / 5 ×21 cells | 13 / 11.5 / 10.5 | **~2,300 px (≈6 screens)** |
| **Materials** | **spread `materials-market-matrix`** | 9 / 5 ×21 cells | 13 / 11.5 / 10.5 | **~2,300 px (≈6 screens)** |

`MARKET_COUNTRIES` = 21 (EG SA AE KW QA JO OM LY BH IQ LB MA TN SD TR GB US FR DE ES IT). Both spread strips already render a `…more` button that opens the very same picker the compact button uses — so collapsing loses no capability.
Owner decision **2026-07-20** (guard @270) already stated: *"currency is display/valuation of the market's money, NOT a search axis. Country + currency collapse into ONE compact icon — **same pattern as every section**"*. It was applied to Stay only; guards @442 and @517 then froze the old spread layout in RE + Materials, and @517 justifies it as the "Stay/RE pattern" — wording that is now stale, since Stay no longer has it.
**Action:** finish the 2026-07-20 decision in the two sections it never reached; rewrite the two stale guards to the new contract.

**DONE + verified live in the running app (2026-07-27, not claimed — measured in the browser):**
| Check | Real-estate | Materials |
|---|---|---|
| wide 21-country strip present | **no** | **no** |
| compact `search-market-country-btn` present | **yes** | **yes** |
| button content | `🇪🇬 Egypt EGP` | `🇪🇬 Egypt EGP` |
| measured button width | **134 px** (was ~2,300 px) | **134 px** |
| stacked strips left edge | all **12 px** | all **12 px** |

Bundle-level proof: the old bundle `entry-187088c6…` contains `re-market-matrix`; the new `entry-dff0878b…` does **not**, and does contain `search-market-country-btn`. The fix is in the artifact the owner loads, not only in source.
Also removed 6 style blocks in `BookingStaysApp` (`marketMatrix`, `matrixCell`, `matrixFlag`, `matrixCountry`, `matrixCurrency`, `matrixMore`) — proven dead by usage count (0 references each), left behind when Stay dropped its own matrix on 2026-07-20.

**Preview caveat, stated honestly:** the static export carries no `EXPO_PUBLIC_API_BASE_URL`, so cards stay as skeletons and Clerk reports the origin is unauthorised. **This is not a regression** — the previous 10:52 bundle carried the exact same condition and the same FATAL guard string. The preview is a *layout* preview, which is what the reported complaint is about; live data needs the API plus the OPS gate in §4.

## 8. Delivery order (architectural, strongest first — 2026-07-27)
| # | Step | Why it is at this rank |
|---|---|---|
| **D0** | Preview truth: re-export `web-preview` | Nothing below can be judged while the owner sees a stale build. Blocks all review. |
| **D1** | Collapse country/currency in RE + Materials (§7) | Owner-reported, owner-decided, measured. Pure UI, zero backend risk. |
| **D2** | Sweep every strip/filter row for the same divergence | The complaint says "بعض الأقسام" — one instance found by measurement, the rest must be measured too, not assumed. **Strips done; FilterSheet audited live → §11.** |
| **D3** | Maps: confirm every section mounts its own tool set | Foundation module (M3) that publish/booking sit on. **Measured 2026-07-27 → structurally satisfied**, see §9. |
| **D4** | CDN + cache + image transformation | Single highest-impact performance item; no app-code change. **Measured 2026-07-27 → §10.** |
| **D5** | OPS gate (§4) | Owner-side, external to code. |

## 9. D3 — maps per section (measured 2026-07-27, read-only audit)
Owner requirement: *"الخرايط يجب ان تعمل في كل الاقسام، كل قسم بيستخدم ادواتو الخاصة"*.
`SearchResultsMap` is mounted at exactly three places, which together cover every surface:
| Mount | Covers |
|---|---|
| `SectionSearchApp.tsx` | cars · real-estate · factories · materials (all 4 section mini-apps) |
| `BookingStaysApp.tsx` | Stay / booking |
| `app/(tabs)/search.tsx` | global search |

It is one engine that specialises off `criteria`, rather than five copies:
- **Two-layer render** — loaded items paint instantly as price pins, then the map reports its viewport and `GET /search/map` returns authoritative clusters for the whole viewport (not just the loaded page).
- **Viewport-keyed cluster cache** (`clusterCacheKey`: criteria signature + rounded bbox + zoom) so panning back is free.
- **Per-section pin tint** — exact listing category when it is on the loaded page, else the browsing section itself.
- **Near-me** — `nearMeEnabled` / `nearLat` / `nearLng` / `nearRadiusKm` drive the circle + radius chips (5/10/25/50/100 km).
- **Section-correct destination** — RE opens `/listing/:id?focus=booking`, others open plain.
Because the map consumes the same `criteria` object the strips write to, every section's own filters already apply to it. **No section is missing a map; no section shares another's tools.** Remaining depth (draw-on-map area select, tool offices) stays under M3.

## 10. D4 — cache + CDN (measured 2026-07-27, read-only audit)
**Cache headers: already production-grade — do not touch.**
| Endpoint | Header |
|---|---|
| feed | `public, max-age=30, stale-while-revalidate=60` |
| listing detail | `public, max-age=20, swr=60` |
| search | `public, max-age=20, swr=60` |
| facets / map clusters | `public, max-age=60, swr=120–300` |
| served objects | `public, max-age=86400` |
| object storage (per object) | `public|private, max-age=<ttl>` |

Critically, each of those flips to **`private, no-store` when the response is user-specific**. That is the exact discipline a shared CDN needs — without it, a cache could serve one user's personalised feed to another. It is already correct, so a CDN can be placed in front with **zero code change**.

**Image transformation: genuinely absent** — verified, not assumed: `sharp`, `jimp`, `imagemin`, `@squoosh/lib` are all *not installed*, and the only `webp` occurrence in the server is an entry in the allowed-content-type list. Uploads are validated (content-type + `MAX_IMAGE_BYTES`) and then served **as the original bytes**. A seller's 4 MB phone photo is therefore shipped whole to every viewer, for every card in the feed, on mobile data — across 21 markets.

**Conclusion:** one problem, one solution, and it is an **OPS change, not a code change** — put a CDN with edge image transformation (Cloudflare Images / Bunny / imgproxy) in front of the object-storage origin and request width-appropriate variants. No app code should grow an image pipeline; the headers that make this work are already in place.

## 11. FilterSheet audit (owner said "والفلاتر" — measured live in the app, 2026-07-27)
Measured with the sheet open on real-estate, 375×812. Rows were separated from the
section page showing through behind the overlay by depth-to-common-ancestor with
the Apply button: **depth ≤ 4 = sheet, depth 10 = page behind it.**

| Sheet row | first chip left | scrollWidth in 343px window | overflow |
|---|---|---|---|
| Sort | 16 | 572 | 229 |
| Market | 16 | **1485** | **1142** |
| Options (was "Filters") | 16 | 565 | 190 |
| Property type | 16 | 1206 | 863 |

**Alignment: correct — nothing to fix.** `engineWrap: { marginHorizontal: -16 }`
cancels the body's 16px padding so that row can scroll edge to edge; its content
container adds 16 back, so **every first chip in every row sits at exactly 16px**.
I nearly filed this as a misalignment off the raw row box (left 0 / width 375 vs
16 / 343) — measuring what the eye sees corrected it. Deliberate, and left alone.

**Fixed:** the sheet header and the RE refinement row both rendered `t("search.filters")`,
so a sheet titled "Filters" contained a section titled "Filters". Added `search.options`
("Options" / "خيارات") + a guard that fails if any `SectionLabel` reuses the sheet's
own title key. Guard count 49 → 50.

**The Market row — decision taken 2026-07-27: REMOVED.** It spread all 21 countries
(1485px inside a 343px window, ~4 screens of sideways scroll) and, once the header
button became universal earlier the same day, was a **second control writing the same
`marketCountry`**. Two recorded intents appeared to disagree:
- FilterSheet comment: *"a universal axis ... one compact, balanced inline row (not buried under rent only, not a separate oversized button)"*
- Guard @270, dated 2026-07-20: *"country + currency collapse into ONE compact icon — same pattern as every section"*

They do not actually disagree: the row **failed its own stated goal** — 1485px is not
"one compact, balanced inline row". That is what made it a defect rather than a matter
of taste. Owner chose "احذفه — الزر يكفي"; market answers *which marketplace am I in*,
not *narrow these results*, so it belongs to the chrome.
Nothing became unreachable — every market stays one tap away via `MarketCountryButton`,
and the guard asserts that button is mounted so a later edit cannot remove both.
Orphans removed with it (each verified at 1 occurrence = declaration only): imports
`MARKET_COUNTRIES` / `marketCountryLabel` / `sanitizeRentalTermForMarket`, styles
`chipSm` / `chipSmText`. Guard count 50 → 51.

### 11a. The downstream sweep caught a break I had just caused
`FilterSheet` has **three** consumers, not two — the section mini-app, Stay, and
**`app/(tabs)/search.tsx` (global search)**. The first two mount `MarketCountryButton`;
global search did not. It had its own 21-chip market row gated behind
`showRentalTerms = category === "real_estate" && offer_type !== "sale"`, so that row
only appeared for real-estate-to-rent. **Removing the sheet row therefore left cars,
materials, facilities and real-estate-for-sale in global search with no market control
at all.** Fixed by mounting the compact button unconditionally there, plus the picker,
and deleting the rent-gated spread row.

Two guards had to be corrected, and the corrections are the lesson:
- **My own new assertion was broken**: it scanned the raw 400 chars before the button for `showRentalTerms` and tripped on the *comment explaining the fix*. A guard that cannot tell code from prose is not a guard — it now strips comments before checking.
- **`lib-hardening` line 140** asserted `/MARKET_COUNTRIES/` in the search tab under the message *"must expose per-market rental chips"* — a proxy that silently locked the spread row. That test's real subject is the market-**scoped** rental taxonomy (`rentalTermsForSearch`, still asserted); the chips line was stale and now asserts the control by its current shape.

**Standing lesson:** before removing a shared component's feature, enumerate *every*
consumer and prove each one still has the capability by another route.
