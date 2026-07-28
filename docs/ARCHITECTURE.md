# ARCHITECTURE — BANCO / B-OOM

> Phase 4.5 · repo `bancoo` @ `66d2949`.

## 1. What the platform is
A multi-vertical marketplace (Cars · Real-estate/Stays · Industrial/Supply · Banks/Financing) for Egypt + GCC, delivered as: an **Expo/React-Native mobile app** (flagship), a **Node/Express API**, and several **web surfaces** (Banco Market, marketing website, admin console, dealer console, landing). Multi-country, multi-currency, bilingual (AR/EN + RTL).

## 2. Layered architecture
```
┌─────────────────────────── CLIENTS ───────────────────────────┐
│ banco-mobile (Expo/RN)  banco-web  banco-website  dealer-os    │
│ admin-os  landing                                              │
└───────────────┬───────────────────────────────────────────────┘
                │  generated React-Query client (lib/api-client-react)
                ▼
┌─────────────────────────── API (api-server) ──────────────────┐
│ Express · /api/v1/* · Clerk auth middleware · Zod validation   │
│ (lib/api-zod) · rate limiters · helmet/CORS · services layer   │
└───────────────┬───────────────────────────────────────────────┘
                │ Drizzle ORM (lib/db)          │ integrations
                ▼                               ▼
┌── Postgres (pg_trgm) ──┐   ┌ Clerk · Paymob · Resend · OpenAI · Object Storage ┐
└────────────────────────┘   └───────────────────────────────────────────────────┘
```

## 3. Contract-first design
The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single contract. `orval` generates the typed React-Query client (`api-client-react`) and Zod validators (`api-zod`). This keeps every client and the server in lockstep — but makes the codegen step a hard dependency (see risks).

## 4. Key domain subsystems (in api-server)
- **Listings / Feed / Search** — catalogue, facets, `GET /v1/search/map` viewport clusters, per-listing currency + `market_country`.
- **Financing (FI)** — buyer finance request → admin filtration → auto-handoff to bank seats (branches/seats/inbox, membership-scoped).
- **Bookings** — furnished/daily rental = date/nights booking; long-term rent = plain listing.
- **Conversations / Messenger** — chat + offer/negotiation.
- **Notifications** — bilingual, per-category mute, push fan-out + email (Resend).
- **Billing / Payments** — Paymob webhook (HMAC-verified) → plan/quota activation.
- **Accounts** — 4 types: individual / dealer / company / financial_institution; Play-compliant deletion (anonymize + PII wipe + chat purge).

## 5. Mobile app shape
- Expo Router file-based routes. Section mini-apps (`/section/car|real-estate|factories|materials|booking`) isolated from the shared Search tab (anti-"melt" guard test).
- Country + currency collapse into a compact `MarketCountryButton` icon (currency = display/valuation of the market's money, NOT a search axis); rental term = compact picker button.
- Icons via an SVG registry (anti-Android-tofu) with a test gate; i18n usage test gate.

## 6. Cross-cutting
- **i18n:** AR/EN + RTL everywhere; `constants/i18n.ts` + usage test.
- **Taxonomy:** markets/currencies/categories centralized in `lib/taxonomy` (config, not hardcoded).
- **Security:** Clerk bearer (mobile) + session; helmet CSP + CORS allowlist + 100kb body cap + rate limiters; Paymob HMAC; payment-config encryption; IDOR-scoped queries.

## 7. Design principles observed (keep)
- Contract-first + generated clients (no hand-written API types).
- Config-driven markets/currencies (taxonomy) — expansion by data, not code.
- Guard tests lock owner-approved UI/structure decisions.
- Additive changes; never delete working features.
