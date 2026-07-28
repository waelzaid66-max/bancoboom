# B-OOM — BANCO Opportunity Open Market

Multi-vertical marketplace (Cars · Real Estate incl. rent/booking · Industrial ·
B2B Supply) for Egypt & the GCC. One Express API + one typed OpenAPI contract +
four surfaces (mobile, admin, market, landing). See README.md for the product
overview, STATUS_REPORT.md for verification evidence, threat_model.md for security.

## Run & Operate (Replit / Linux)

> **Fresh import?** Run `./scripts/replit-dev-setup.sh` once — it installs pnpm
> (not pre-installed on a fresh repl), installs workspace deps, ensures the
> `pg_trgm` extension, pushes the Drizzle schema, and seeds all data. After that
> the six workflows (api-server, landing, admin-os, dealer-os, banco-mobile,
> mockup-sandbox) run the app. Deployment uses the Replit **artifacts router**
> (`router = "application"` in `.replit`) — all surfaces publish together, routed
> by path (`/` landing · `/admin-os/` · `/dealer-os/` · `/api` · `/banco-mobile/`).

> The API **requires** `PORT` and `DATABASE_URL` (it throws at boot without
> `PORT`). On Replit these come from the workspace/secrets — do NOT hardcode a
> port. There is NO fixed "port 5000".

- **API (dev = build + start):**
  `PORT=$PORT DATABASE_URL=$DATABASE_URL pnpm --filter @workspace/api-server run dev`
  (the `dev` script runs `pnpm build` then `node dist/index.mjs`).
- **One-command boot:** `./turbo.sh` (API) · `./turbo.sh all` (API + admin +
  market + landing) · `./turbo.sh check` (typecheck + backend tests).
- **Web surfaces:** `pnpm --filter admin-os run dev` (also dealer-os / landing) —
  each needs a `PORT` env; Vite configs read `process.env.PORT`.
- **Typecheck everything:** `pnpm run typecheck` (0 errors across all packages).
- **Build everything:** `pnpm run build`.
- **Regenerate API client from the spec:** `pnpm --filter @workspace/api-spec run codegen`
  (orval → api-client-react + api-zod). Additive-only policy; grep the namespace
  before adding a schema/operationId.
- **DB schema (dev):** `pnpm --filter @workspace/db run push` (Drizzle push).
  Fresh DB also needs `CREATE EXTENSION pg_trgm` + the seeds
  (`pnpm --filter @workspace/api-server run seed` / `seed:reference` /
  `seed:car-brands` / `seed:admin`).
- **Backend tests (real Postgres):** `pnpm --filter @workspace/api-server test`.

## Stack

- pnpm workspaces · **Node.js 24** (pnpm 11.9 uses `node:sqlite`) · TypeScript 5.9
- API: **Express 5**; bundled by esbuild to **ESM** (`dist/index.mjs`, not CJS)
- DB: PostgreSQL + Drizzle ORM (`lib/db`); requires the `pg_trgm` extension
- Validation: Zod (`zod/v4`) + drizzle-zod
- API codegen: Orval from `lib/api-spec/openapi.yaml` (source of truth)
- Auth: Clerk · Payments: Paymob (HMAC webhooks) · Email: Resend · AI: OpenAI
- Object storage: presigned uploads (Replit sidecar in dev; **S3 adapter** on AWS
  via `OBJECT_STORAGE_PROVIDER=s3` — see deploy/aws/)

## Where things live (source of truth)

- DB schema → `lib/db/src/schema/index.ts`
- API contract → `lib/api-spec/openapi.yaml` (→ generated client, never hand-write fetch)
- Startup/health → `artifacts/api-server/src/index.ts` (binds port BEFORE DB
  extensions), health routes `artifacts/api-server/src/routes/health.ts`
  (`/api/healthz` liveness, `/api/readyz` readiness)
- Scheduled jobs → `artifacts/api-server/src/jobs/` (in-process node-cron +
  Postgres advisory locks; no external queue)
- AWS deployment → `deploy/aws/` (Dockerfiles, compose, EB, reports) + root
  `Dockerfile` (Elastic Beanstalk)

## Architecture decisions (non-obvious)

- **Bind the port before ensuring DB extensions** — a past deploy failed because
  startup awaited a DB extension and the port never opened.
- **Health ≠ readiness:** liveness never touches the DB; `/api/readyz` returns 503
  when the DB is down so load balancers drain the instance.
- **Adaptive data:** never block a valid trade; save all specs; publish-then-learn.
- **One search/filter pipeline** shared by list, map, and facets.
- **i18n parity** compile-enforced (`ar: typeof en`) — a missing key fails typecheck.

## Gotchas

- Always `PORT` + `DATABASE_URL` before running the API.
- After editing `openapi.yaml`, run codegen; grep the namespace first (a dup name
  once wiped generated files).
- Backend tests pin `TZ=UTC` (matches CI/prod; fixes an off-UTC timestamp flake).
- Icons are SVG (lucide) — never `@expo/vector-icons` fonts (Android tofu). Run
  `node --test tests/icons.test.mjs` after icon changes.

## Pointers

- Deploy: `deploy/aws/reports/00-README.md` (AWS) · `deploy/gcp/reports/00-README.md` (GCP) · `release/STORE_PUBLISHING_GUIDE.md` (app stores/EAS).
- **Primary agent handoff:** `release/PRIMARY_AGENT_HANDOFF.md` · unified ops: `release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md`.
