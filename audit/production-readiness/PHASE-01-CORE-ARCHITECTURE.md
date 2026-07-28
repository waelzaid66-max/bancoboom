# Phase 01 — Core Architecture

**Status:** `pass_with_fixes`  
**Date:** 2026-07-08  
**Scope:** pnpm workspace boundaries, dependency hygiene, lockfile/CI alignment, TypeScript project refs — no feature removal.

---

## Architecture summary

| Layer | Packages | Orchestration |
|-------|----------|---------------|
| Root | `package.json`, `pnpm-workspace.yaml`, `tsconfig.json` | `pnpm -r` filters; **no** `turbo.json` (intentional) |
| Apps | `artifacts/*` (mobile, api-server, admin-os, dealer-os, landing, mockup-sandbox) | Per-package scripts + CI matrix |
| Shared libs | `lib/*` (db, api-zod, api-client-react, taxonomy, integrations) | `tsc --build` project references |
| Tooling | `scripts/`, root ESLint flat config | CI lint job on `scripts/**` |

Deploy surfaces unchanged: Replit (`.replit`), AWS (`deploy/aws/`, root `Dockerfile`), GCP (`deploy/gcp/`).

---

## Findings

### Critical

| ID | Finding | Resolution |
|----|---------|------------|
| — | None open after this phase | — |

### High

| ID | Finding | Resolution |
|----|---------|------------|
| H-01 | CI used `pnpm install --no-frozen-lockfile` while Docker/post-merge use `--frozen-lockfile` — lockfile drift not caught in CI | **Fixed:** `.github/workflows/ci.yml` → `--frozen-lockfile` on all four jobs |
| H-02 | `vitest` hoisted at workspace root; `@workspace/api-server` ran tests without declaring the dependency | **Fixed:** moved `vitest` to `artifacts/api-server/package.json` devDependencies; cleared root `dependencies` |
| H-03 | `esbuild` declared `0.27.3` in api-server while `pnpm-workspace.yaml` override pins `0.28.1` | **Fixed:** api-server devDependency aligned to `0.28.1` |
| H-04 | Root `package.json` listed `expo`, `expo-image`, `pnpm` as runtime dependencies — risk of duplicate Expo resolution vs `@workspace/banco-mobile` | **Fixed:** removed from root; mobile remains sole Expo owner |

### Medium

| ID | Finding | Resolution |
|----|---------|------------|
| M-01 | TypeScript `~5.9.2` in mobile vs `~5.9.3` at root | **Fixed:** mobile aligned to `~5.9.3` |
| M-02 | Root `preinstall` requires `sh` — native Windows `pnpm install` fails (known; documented in RC-1) | **Deferred:** Replit/CI/Linux are primary; see `MONOREPO-PACKAGE-GUIDE.md` § Windows |
| M-03 | No Turborepo — builds sequential via pnpm | **Accepted:** not required; CI already parallelizes jobs |
| M-04 | ESLint covers `scripts/` + optional `lint:report`; artifacts not fully lint-gated in CI | **Deferred:** Phase 15 (CI/CD) |

### Low

| ID | Finding | Resolution |
|----|---------|------------|
| L-01 | `mockup-sandbox` Radix versions newer than admin/dealer (intentional sandbox) | **Accepted:** private dev tool |
| L-02 | `wouter` in landing/dealer/admin not in pnpm catalog | **Deferred:** no drift risk observed |

---

## What was fixed (file paths)

| Change | Files |
|--------|-------|
| CI lockfile enforcement | `.github/workflows/ci.yml` |
| Root dependency cleanup | `package.json` |
| api-server test + build deps | `artifacts/api-server/package.json` |
| TypeScript version alignment | `artifacts/banco-mobile/package.json` |
| Lockfile sync | `pnpm-lock.yaml` |
| Mobile search/map performance (prior session, stable) | `artifacts/banco-mobile/app/(tabs)/index.tsx`, `search.tsx`, `components/search/SearchResultsMap.tsx`, `context/SessionContext.tsx`, `hooks/useSearchMiniApp.ts` |
| Status note | `STATUS_REPORT.md` |

---

## Deferred (and why)

| Item | Why deferred | Target phase |
|------|--------------|--------------|
| Windows-friendly `preinstall` | Replit + GitHub Actions are Linux; changing script risks Replit merge hook | 15 |
| Full-artifact ESLint in CI | Scope creep; scripts gate already green | 15 |
| Turborepo adoption | No measured build pain; pnpm filters sufficient | — |
| Paymob/Stripe enablement | Explicitly out of scope — verify structure only | 09 |

---

## Targeted tests run + results

| Command | Environment | Result |
|---------|-------------|--------|
| `node --test tests/lib-hardening.test.mjs tests/mobile-resilience.test.mjs` | Windows, `artifacts/banco-mobile` | **PASS** (17/17) |
| `npx tsc --build` | Windows, repo root | **PASS** |
| `npx tsc -p artifacts/banco-mobile/tsconfig.json --noEmit` | Windows | **PASS** |
| Full `pnpm run typecheck` / API vitest | Not re-run | Prior CI green @ `7cb7a1b`; api-server source unchanged except `package.json` |

> Windows note: `pnpm --filter …` may trigger `preinstall` (`sh` missing). Direct `npx tsc` / `node --test` used for local verification. CI runs on Ubuntu with frozen lockfile.

---

## Mobile unaffected confirmation

Phase 1 architecture changes are **dependency and CI wiring only**:

- No API routes, publish mutations, or taxonomy defaults changed.
- Mobile performance edits (search debounce, map cluster cache, session context) are **additive UX/perf** — regression tests (`test:lib`, `test:resilience`) pass.
- Expo SDK, bundle id, and EAS profiles untouched.
- Paymob/Stripe not enabled.

---

## References

- [MONOREPO-PACKAGE-GUIDE.md](./MONOREPO-PACKAGE-GUIDE.md)
- [README.md](./README.md) — 21-phase index
- `.agents/memory/banco-pnpm-overrides.md` — override precedence (pnpm v11)
