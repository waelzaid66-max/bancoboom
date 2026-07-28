# B-OOM — BANCO Opportunity Open Market

**A multi-vertical marketplace for Egypt & the GCC (11+ countries): Cars · Real Estate (sale & rent) · Industrial / Factories · B2B Supply.**

One backend, one typed API contract, four user surfaces. Built to publish anything tradeable ("the market is the source of truth" — never block a valid trade), then learn from the data it receives.

> 📋 **Live status & verification evidence:** [STATUS_REPORT.md](STATUS_REPORT.md) · [docs/DEPLOYMENT_GUIDES.md](docs/DEPLOYMENT_GUIDES.md) · Replit: [replit.md](replit.md) · Security: [SECURITY.md](SECURITY.md) · [threat_model.md](threat_model.md)

**Production GitHub repositories (same product, same `main` line):**

- **Primary:** `waelzaid66-max/-BANCO-CA-OOM-`
- **AWS deploy:** `waelzaid66-max/aws-virgen` (EC2 clone + tag-triggered CD)

---

## Surfaces

| Surface | Path | Stack | What it is |
|---|---|---|---|
| **BANCO Mobile** | `artifacts/banco-mobile` | Expo SDK 54 · React Native · expo-router | The consumer app — feed, search + map, listing create/publish, chat, wallet, plans, AI assistant (AR/EN) |
| **BANCO Admin Control** | `artifacts/admin-os` | React 18 · Vite 7 · Tailwind · shadcn/ui | Staff control center — users, moderation, reports, support, revenue, fraud, monitoring, **Plans & Pricing (economic control keys)**, payment/email/promo config |
| **BANCO Market** | `artifacts/dealer-os` | React 18 · Vite 7 | Dealer/business OS (reference surface) |
| **Landing** | `artifacts/landing` | React 18 · Vite 7 | Public site |
| **API Server** | `artifacts/api-server` | Node 24 · Express 5 · TypeScript | The single backend all surfaces talk to |

## Core technology

| Layer | Technology |
|---|---|
| **Database** | PostgreSQL + Drizzle ORM (`lib/db` — single schema, FK-safe cascades, jsonb specs) |
| **API contract** | `lib/api-spec/openapi.yaml` = source of truth → **orval** codegen → typed react-query client (`lib/api-client-react`) + zod (`lib/api-zod`). No hand-written fetch calls. |
| **Auth** | Clerk (mobile + web), staff-role RBAC (owner/admin/moderator/support) enforced server-side per endpoint |
| **Payments** | Paymob (HMAC-verified webhooks), wallet + plans + cost-per-lead billing, encrypted payment-config |
| **Media** | Object Storage with presigned uploads + server-side verification |
| **AI** | OpenAI (assistant grounded in live marketplace data, replies in the user's language AR/EN). Config: `OPENAI_API_KEY` (direct) **or** Replit AI integration; model via `OPENAI_MODEL` |
| **Email** | Resend (OTP / transactional) |
| **i18n** | Full EN/AR with compile-time parity (`ar: typeof en`) — a missing key fails typecheck |
| **Observability** | Structured error reporting (pino) + optional `ERROR_ALERT_WEBHOOK`, process-level crash capture (server) + global JS/React crash capture (mobile) |

## Signature features

- **Scalable map search (Booking-style):** `GET /v1/search/map` clusters listings server-side per viewport grid — the Leaflet/WebView map reports its viewport and receives authoritative clusters honoring the **exact** same filters as the list. `offer_type=rent` turns it into a rentals map for real estate, land and factories.
- **Adaptive Marketplace Data Philosophy:** tiny mandatory floor, unlimited custom specs (all saved, all searchable), publish-first-then-learn, Candidate-Attributes pipeline (observed → candidate → verified) that grows the taxonomy from real market data.
- **Unified search engine:** one filter pipeline (NLP free-text AR/EN + per-section engine filters) shared by list, map, and facets — a filter added once works everywhere, sections never conflict.
- **Marketplace lifecycle, proven:** publish → feed/search/SEO → contact → edit → bump → archive → republish → delete, executed end-to-end in integration tests against real Postgres.
- **Messenger:** reactions, replies, listing sharing, image attachments with preview, quick-emoji strip collapsed behind a Messenger-style toggle.
- **Admin "control keys":** every economic lever (plan pricing, quotas, CPL, boost, ranking) editable live from the Admin Control Center — no DB edits.

## Repository layout

```
artifacts/        api-server · banco-mobile · admin-os · dealer-os · landing
lib/              db (Drizzle schema) · api-spec (OpenAPI) · api-client-react ·
                  api-zod · integrations-openai-ai-server
.claude/          launch.json (dev-server configs)
STATUS_REPORT.md  living completion/verification report
```

## Running

**On Replit (primary environment):** the workspace workflows run the API server and surfaces; secrets (DATABASE_URL, Clerk, Paymob, Resend, Object Storage, `OPENAI_API_KEY`) live in the Replit secrets store. `.replit` + `replit.md` are checked in, so importing this repo boots without re-learning.

**Turbo (one command):**
```bash
./turbo.sh          # API server (Replit/Linux)   |   Windows: .\turbo.ps1
./turbo.sh all      # API + Admin + Market + Landing
./turbo.sh check    # typecheck everything + backend tests
```

**Locally (manual):**
```bash
pnpm install
# API (needs PORT + DATABASE_URL):
PORT=3000 DATABASE_URL=postgres://... pnpm --filter @workspace/api-server run dev
# Admin / Market / Landing:
pnpm --filter admin-os run dev
# Mobile:
cd artifacts/banco-mobile && npx expo start
# Verify:
pnpm -r --if-present run typecheck        # 0 errors across 7 packages
pnpm --filter @workspace/api-server test  # integration suite on real Postgres
```

## Environment variables (names only — values live in the environment)

`DATABASE_URL` · `PORT` · `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` · `PAYMOB_*` · `RESEND_API_KEY` · Object-Storage credentials · `OPENAI_API_KEY` (+ optional `OPENAI_MODEL`) **or** `AI_INTEGRATIONS_OPENAI_BASE_URL`+`AI_INTEGRATIONS_OPENAI_API_KEY` · `ERROR_ALERT_WEBHOOK` (optional alerts)

## Verification state

- Backend integration suite: **246+ passing** on real PostgreSQL (see STATUS_REPORT for the current exact count and the one documented flaky test)
- Typecheck: **0 errors across all 7 packages**
- API client: fully generated from the OpenAPI contract (additive-only regeneration policy)
