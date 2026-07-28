# BANCO Project Status
> Last updated: 2026-07-12 — for future Claude agents and contributors

## Architecture Summary

BANCO is a full-stack marketplace + B2B platform built as a pnpm monorepo.

```
artifacts/
├── api-server/          — Node.js + Hono REST API + Drizzle ORM (PostgreSQL)
├── banco-mobile/        — React Native (Expo Router) — primary user app
├── dealer-os/           — React + Vite — Dealer / BANCO Market portal  
├── admin-os/            — React + Vite — Admin Control Center
├── landing/             — React + Vite — banco.today root landing page
└── mockup-sandbox/      — Vite — design exploration canvas

lib/
├── api-client/          — Orval-generated fetch hooks (REST)
├── api-client-react/    — React-Query-wrapped hooks
└── db/                  — Drizzle schema + migrations (shared by api-server)
```

## Mobile App Architecture (banco-mobile)

### Navigation
```
app/
├── (tabs)/              — Main tab bar: Feed | Search | Messages | Saved | Profile
│   ├── index.tsx        — Feed (home) tab
│   ├── search.tsx       — Search tab — canonical search entry + SearchDiscover
│   ├── messages.tsx     — Chat/conversations
│   ├── saved.tsx        — Saved listings
│   └── profile.tsx      — Profile, settings, onboarding gate
├── business/            — B2B sub-apps
│   ├── supply-hub.tsx   — Global Supply Portal (RFQ, suppliers)
│   ├── global-supply.tsx — Import/Export hub
│   ├── banks.tsx        — Banks & Financiers portal (NEW, 2026-07-12)
│   ├── investments.tsx  — Investments section
│   └── onboarding.tsx   — Business/role upgrade onboarding
├── listing/[id].tsx     — Listing detail (guest-gated)
├── billing.tsx          — Wallet & billing
├── notifications.tsx    — In-app notification feed
└── messages/[id].tsx    — Chat thread
```

### SearchDiscover — CANONICAL ARCHITECTURE (DO NOT restructure)

`components/SearchDiscover.tsx` is the Search tab's main discovery page. It is a **clean portal directory** — NOT a feed/search results page.

**Correct structure (finalized 2026-07-12):**
```
SearchDiscover
  1. Section cards (2×2 grid): Cars | Real Estate | Factories | Materials
     └── [on expand] Engine chips (Cars: Gasoline/Electric/Hybrid; RE: Apartment/Villa/…)
  2. Booking & Stays (full-width, 5th portal)
  3. ── B2B separator ──
  4. Business Hub header
  5. Global Supply Portal → /business/supply-hub
  6. Global Importers → /business/global-supply
  7. Banks & Financiers → /business/banks  (gold, #C9A84C)
  8. CompanyOffers (company directory)
```

**What MUST NOT be added back to SearchDiscover:**
- Popular brand chips (Toyota, Nissan, BMW…) — belong inside Cars section UI
- Trending / Recently Viewed cards — belong in Feed (Home tab)
- Saved / Recent searches — belong in Search results chrome
- Car Import CTA — is a Cars filter, not a top-level portal
- Explore on Map CTA — is an inline affordance inside Real Estate section

### B-Reaction Button (BReactionButton.tsx) — finalized behavior
```
Tap  → onSave()    → immediate red B glyph (toggle bookmark)
Long Press → opens chip tray:
  ★ Potential (silver star-outline) → onPotential() → behavior signal "interested"
  👎 Not for me   (dark red thumbs-down) → onAngry() → behavior signal "reject"
```

### Section Card to Portal Mapping
| Card | Category | Route / System |
|------|----------|----------------|
| Cars | `car` | Search results filtered by car category |
| Real Estate | `real_estate` | Search results + map |
| Factories & Facilities | `facilities` → `industrial` | Search results |
| Raw Materials | `materials` → `industrial` | Search results |
| Booking & Stays | `real_estate` + `offer_type=rent` | Search results |
| Global Supply Portal | B2B only | `/business/supply-hub` |
| Global Importers | B2B only | `/business/global-supply` |
| Banks & Financiers | B2B / FI only | `/business/banks` |

## API Server

- **Runtime:** Node.js, Hono framework, Drizzle ORM, PostgreSQL
- **Auth:** Clerk (JWT validation via `@clerk/backend`)
- **Object Storage:** Replit Object Storage (GCS signed URLs via `@replit/object-storage`)
- **Push Notifications:** Expo Push Notification Service
- **Email:** Resend (`RESEND_API_KEY`)
- **Base URL:** same-origin in prod; `$REPLIT_DEV_DOMAIN` in dev

### Key Services
| Service | Responsibility |
|---------|---------------|
| `BffService` | Feed item formatting, price display (2dp), trust signals |
| `PaymentService` | Installment calculation (1dp/plain-K), Paymob integration |
| `AbuseService` | Shadow-ban, flagging, `publicVisibilityConditions()` |
| `NotificationService` | 14 types, Expo push + in-app feed |
| `WalletService` | Coins, boosts, billing |
| `SearchService` | Full-text + NLP, facets, map clusters |
| `LeadService` | Lead tracking (contact/apply/finance requests) |

### CORS & Security
- Allowlist: only BANCO-owned origins (never `*.replit.*`)
- Web: same-origin cookies; Mobile: Bearer tokens (no Origin header)
- Unsafe-method CSRF guard active
- api-server has **NO watch mode** — restart required for changes to apply

## Database

- **Drizzle ORM** — schema in `lib/db/schema.ts`
- **Migrations:** `pnpm --filter @workspace/lib run db:generate` then `db:push`
- **Post-merge:** Always run `push-force` (bare `push` hits interactive TTY prompt → silently fails)
- **Seed:** `pnpm --filter @workspace/api-server run seed`

### Known DB Issues (as of 2026-07-12)
1. **`financial_institution` not in `user_role` enum** — DB schema has only `individual|dealer|company`. Mobile profile.tsx + multiple services reference this role. Fix: `ALTER TYPE user_role ADD VALUE 'financial_institution'` + add to `lib/db/schema.ts` enum. **Task #18 (PROPOSED).**

## Mobile Auth & Role System

| Role | Access |
|------|--------|
| `individual` | Default for new signups; marketplace buyer |
| `dealer` | Seller; granted via role upgrade in-app after signup |
| `company` | Business account; same upgrade flow |
| `financial_institution` | Banks/financiers; signup → /business/onboarding |

### Role Selection Gate (`profile.tsx` — `needsAccountType` guard)
- Fires on first sign-in before role is set
- Shows 4 options (Individual / Dealer / Company / Financial Institution)
- Has a **Skip button** (added 2026-07-12) → defaults to `individual`
- `financial_institution` routes to `/business/onboarding` after selection

## Notifications (14 types — all handled)

| Type | Deep link |
|------|-----------|
| `message` | `/messages/[id]` |
| `rfq` | `/rfq/[id]` |
| `listing` | `/listing/[id]` |
| `booking` | `/bookings` |
| `billing` | `/billing` |
| `investment` | `/business/investments/[id]` |
| `global_supply` | `/business/global-supply/[id]` |
| `verification`, `account`, `business`, `dealer` | `/business/supply-hub` (approximate) |
| `review`, `comment` | `/listing/[id]` (via listing_id) |

### Minor notification gaps (non-blocking)
- Icons for `investment`, `global_supply`, `billing` use fallback bell
- `verification`/`account`/`dealer` notifs route to supply-hub instead of dedicated page

## Known Issues & Outstanding Tasks

### 🔴 Critical
| # | Issue | Fix |
|---|-------|-----|
| Task #18 | `financial_institution` TypeScript errors in 4 files (profile.tsx:560, AdminService.ts:104, PlanService.ts:22, UserService.ts:141) | DB migration + schema update |

### 🟡 Planned
| # | Issue |
|---|-------|
| Task #7 | Add Paymob sandbox credentials so payment checkout can be tested |
| Task #11 | Keep feed populated after DB reset without manual steps (auto-seed on startup) |
| Task #12 | Confirm seed works after full wipe |
| Task #19 | Booking & Stays card has no real photo (gradient-only) — needs `assets/images/categories/booking.jpg` |
| Task #20 | Rental-term chips (يومي/شهري/سنوي) auto-appear in Booking portal |

### 🟢 Resolved Recently
| What | When |
|------|------|
| SearchDiscover redesigned as clean portal directory | 2026-07-12 |
| Banks & Financiers B2B CTA + portal page added | 2026-07-12 |
| B-Reaction button: tap=save (red), long-press=menu | 2026-07-12 |
| Role selection Skip button added | 2026-07-12 |
| 5 rental seed listings added | 2026-07-12 |
| Root landing artifact (`/`) ships | 2026-07-12 |
| Arabic localization throughout | done |
| Push + in-app notifications (14 types) | done |
| Map view (WebView+Leaflet/OSM) | done |
| Business verification (KYC camera flow) | done |
| Chat soft-hide per participant | done |
| Fullscreen image viewer with pinch-zoom | done |
| Listing image cropper (Expo Go) | done |

## Infrastructure Notes

### Replit Environment
- **Package manager:** pnpm v11 — overrides live ONLY in `pnpm-workspace.yaml` (not package.json)
- **Secrets:** `CLERK_SECRET_KEY`, `EXPO_TOKEN`, `RESEND_API_KEY`, `SESSION_SECRET`, object storage vars
- **GitHub push:** Branch protection on `main` — push to feature branch; no PAT configured for automated push
- **Object Storage:** `DEFAULT_OBJECT_STORAGE_BUCKET_ID` from `.replit` `[objectStorage]` defaultBucketID

### Dev Workflow
```bash
# Start all services
pnpm --filter @workspace/api-server run dev    # API on port 3000
pnpm --filter @workspace/banco-mobile run dev  # Expo on port 8081
pnpm --filter @workspace/dealer-os run dev     # Dealer portal on port 5173
pnpm --filter @workspace/admin-os run dev      # Admin portal

# Seed database
pnpm --filter @workspace/api-server run seed

# Typecheck
pnpm --filter @workspace/banco-mobile exec tsc --noEmit

# Regenerate API client (after schema changes)
cd artifacts/api-server && pnpm run codegen
```

### Critical Rules for Future Agents
1. **Never add content back between SearchDiscover section cards and Business Hub** — it was intentionally removed (Popular Brands, Trending, Car Import, Map CTA all belong elsewhere).
2. **Always use `push-force` in post-merge scripts** — bare `push` hits TTY prompt and silently fails.
3. **AbuseService `publicVisibilityConditions()` must be spread on EVERY public query** — shadow-banned content leaks otherwise.
4. **React Compiler component order:** helper components must be defined BEFORE use (compiler removes hoisting).
5. **Icons are SVG (`@/components/icons`)** — never revert to icon fonts; never nest icons in `<AppText>`.
6. **`financial_institution` is not yet in the DB enum** — any code touching this role will fail at runtime until Task #18 is done.
7. **Orval codegen post-processes binary bodies** — `api-spec/postprocess.mjs` restores raw bodies that orval JSON.stringifies.
8. **Composite dist can be stale** — if a lib export seems "missing" in typecheck, run `tsc -b lib --force`.
9. **Clerk on Expo Go:** pin `@clerk/expo` to exact `3.3.1` — 3.4.x+ crashes with native module error.
10. **pnpm overrides must be in `pnpm-workspace.yaml`**, not `package.json` — pnpm v11 ignores package.json overrides.
