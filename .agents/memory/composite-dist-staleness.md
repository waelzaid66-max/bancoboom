---
name: Composite dist staleness after merges
description: Why a freshly-added generated export can appear "missing" in an isolated artifact typecheck, and the force-rebuild fix
---

Workspace libs (`lib/api-client-react`, `lib/api-zod`, `lib/db`) are `composite: true` + `emitDeclarationOnly` and are consumed by artifacts via TS **project references**. Their declaration output lives in a **gitignored** `dist/` (so it is a per-environment build artifact, never committed).

**Symptom:** an isolated artifact typecheck (e.g. `pnpm --filter @workspace/banco-mobile run typecheck`) reports `Module '@workspace/api-client-react' has no exported member 'X'` for an export that is clearly present in `src/generated/*.ts`. Only the most-recently-added export is affected; older exports resolve fine.

**Cause:** after a task merge that changes only `src`, incremental `tsc --build` (the `typecheck:libs` script) can decide `dist` is up to date (stale `.tsbuildinfo` / merge-produced timestamps) and not re-emit the declarations. The artifact then reads the stale `dist/generated/*.d.ts`.

**Fix:** `pnpm exec tsc -b <lib> --force` (e.g. `lib/api-client-react`) to re-emit declarations, then re-typecheck.

**Why it matters:** this class of bug has recurred. The root `pnpm run typecheck` runs `typecheck:libs` (= `tsc --build`) first so it usually self-heals, but isolated/per-artifact typechecks do not — so when an export "isn't there" but the source has it, force-rebuild the lib before deeper debugging.

**How to apply:** when a generated export is missing in an artifact but present in lib `src`, suspect stale composite dist first.

**Hardening applied (mobile):** the `@workspace/banco-mobile` `typecheck` script now prepends `tsc -b ../../lib/api-client-react --force &&` before its `tsc -p tsconfig.json --noEmit`, so the referenced lib's `dist` is force-rebuilt every run and can never serve stale declarations. The `typecheck-mobile` validation workflow runs that same script, so CI inherits the guarantee. **Other artifacts' isolated typechecks still lack this** — extend the same pattern if they show phantom stale-cache errors. (The root `pnpm run typecheck` self-heals only because it runs `typecheck:libs` = `tsc --build` first, but that is incremental, not `--force`.)
