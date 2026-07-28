# Maintenance Wave 1 — Upload, CI, EAS, Health

**Date:** 2026-07-07  
**Scope:** Critical path fixes only — no identity/deep-link changes, no store submission.

## Changes

| Area | Fix | Files |
|------|-----|-------|
| CI typecheck | `LIKE … ESCAPE` via `sql` template (Drizzle `like()` is 2-arg) | `uploadController.ts` |
| Health probes | Mount `/api/healthz`, `/livez`, `/readyz` **before** Clerk middleware | `app.ts`, `routes/index.ts` |
| Upload claims | Extend TTL to 60m after successful `POST /v1/uploads/verify` | `uploadClaims.ts`, `uploadController.ts` |
| Listing create UX | Distinct i18n for expired claim / too large / network on per-tile upload errors | `lib/upload.ts`, `create.tsx`, `i18n.ts` |
| Drizzle (Windows) | `fileURLToPath` for schema path in ESM config | `lib/db/drizzle.config.ts` |
| EAS | `ios.autoIncrement` on production profile; `submit.production`; `ios.buildNumber` | `eas.json`, `app.json` |

## Verify locally

```powershell
pnpm run typecheck
pnpm --filter @workspace/api-server exec vitest run src/lib/uploadClaims.test.ts
```

## Verify CI (after push)

- Job **Typecheck & build** must pass on `main`.
- Job **API tests (Postgres)** must remain green (`upload_claims` table via migrate/push in CI).

## EAS checklist (manual — no submission yet)

1. `eas secret:create` — `EXPO_PUBLIC_DOMAIN`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
2. `eas build --profile production --platform all`
3. Deep link `origin` in `app.json` — change only when production domain is approved (deferred).

## Next wave (section-specific, no clutter)

- Search/maps: per-category filters (cars near-me, RE rental terms, industrial subtypes) — mirror existing taxonomy only.
- No listing edit screen yet — out of scope unless product approves.
