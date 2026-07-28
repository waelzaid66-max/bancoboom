# BANCO / B‑OOM — Project Context & Working Constitution

**Read this before changing anything.** It exists so any agent (Replit, Claude,
future) understands the product, the goals, and the hard rules — and never
deviates. Keep it in sync.

## What this is
**B‑OOM = B(anco) + Owners Opportunity Market (بووم 💥).** A multi‑vertical
marketplace for **cars, real‑estate (sale + rent + land), industrial/factories,
and B2B supply/import**, launching across 11+ countries (Egypt first, then Gulf/
Levant, then worldwide). Buy · sell · exchange · new · used · direct import.
Benchmarks: Dubizzle/OLX/Cylndr (cars), Booking/Trivago (rent), Alibaba (supply).

## Architecture (don't fight it)
- pnpm monorepo, Node 24. **4 surfaces:** `banco-mobile` (Expo/React Native,
  expo‑router), `api-server` (Express, mounts API under **/api**), and three Vite
  apps `admin-os` / `dealer-os` (=Banco Market) / `landing`.
- PostgreSQL + Drizzle ORM; Clerk auth; Paymob payments; Resend email; Replit
  Object Storage; OpenAI assistant. Client types via **orval codegen** from
  `lib/api-spec/openapi.yaml` → `lib/api-client-react` + `lib/api-zod`.
- **Canonical repo = `b-banco`** (has the running env fixes). B‑OOM/b.deals are
  legacy mirrors. Commit + push to b‑banco; don't fork new lines.

## Core philosophy — Adaptive Marketplace (never violate)
1. **Never block trade** — publishing must never hard‑fail; degrade gracefully.
2. **Tiny floor** — minimal required fields; everything else optional.
3. **Save all specs** — free‑form specs kept in `listing_attributes.specs` jsonb.
4. **Publish then learn** — accept unknown values, learn them (candidate‑attributes,
   pending‑locations), promote after review. No hard taxonomy walls.
5. **No fabricated data — EVER.** Real data only. If a value/coord/logo isn't
   known, leave it null; never invent numbers, prices, or assets.

## HARD RULES (deviation = damage)
- **NEVER alter the original logo / app design.** The tab‑bar "B" is the exact
  cropped logo — no tint, no animation. (Only the reaction B may tint for state.)
- **Additive only.** No rebuild, no wide refactor, no renaming existing tables,
  no `DROP`, no deleting files or data. `push‑force` must be ADD‑only.
- **Don't change existing business logic or public APIs** unless fixing a real
  bug. New endpoints are fine; changing existing behaviour is not.
- **Before adding ANY OpenAPI schema/operationId: grep the namespace first**
  (a duplicate `Plan` once wiped the generated client). Validate YAML with
  js‑yaml BEFORE running orval; codegen must stay additive (no file wipe).
- **i18n parity is compile‑enforced** (`ar: typeof en`) in mobile and admin. Add
  every key to BOTH en and ar. Use logical RTL utilities (`me‑`, `start‑`,
  `text‑end`), never physical (`mr‑`, `left`).
- **Arabic needs the Cairo font** — Inter has NO Arabic glyphs (renders broken,
  one‑letter‑per‑glyph). Text uses `AppText`, inputs use `AppTextInput` (both
  swap Inter→Cairo in Arabic). Never pin Inter on a raw `<Text>`/`<TextInput>`
  that shows Arabic.
- **Icons go through `@/components/icons`** (the SVG/lucide shim), NOT
  `@expo/vector-icons` (icon fonts → Android tofu). Run
  `node --test tests/icons.test.mjs` after any icon change.
- **Tests pin `TZ=UTC`** (matches prod). Expected: **api suite green**.
- If in doubt, or on ANY conflict/error: **stop and ask — never force/reset/
  delete/hack around it.**

## Goal now: a stable production launch (Android · iOS · Web)
The code is feature‑complete and additive. What remains is **environment/
dashboard config**, not code:
- `OPENAI_API_KEY` = a REAL `sk-...` key (the assistant auto‑selects a valid
  model). Clerk dashboard: enable Email OTP + Google + Apple. `RESEND_API_KEY`
  for email. Paymob → live + domain. Mobile: EAS build for real devices (Expo Go
  over the Replit tunnel can't reach Metro — that's an env limit, not a bug);
  set `expo-router.origin` to the production domain. Grant your account a staff
  role for admin (RBAC is working, not a bug).

## Reference data (run after schema push, all idempotent)
`seed` → `seed:reference` (Egypt + Middle‑East, 257 places/8 countries) →
`seed:car-brands` (111) → `seed:car-models` (327) → `backfill:observations`.

## Deviation guard
When a task says "fix/complete", first READ the relevant code and this file.
Prefer the smallest change that fixes a real defect. Don't re‑implement what
already exists. Don't add features unless asked. When unsure which way to go on
a product decision, ask the owner — don't guess.
