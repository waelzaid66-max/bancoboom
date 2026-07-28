---
name: BANCO pnpm override precedence
description: Where dependency overrides actually take effect in this monorepo (flipped by pnpm v11), and how minimumReleaseAge interacts with security pins
---

**As of pnpm v11+, the ONLY effective override source is `pnpm-workspace.yaml`'s `overrides:` block.** pnpm v11 stopped reading the `pnpm` field in root `package.json` entirely (it logs `[WARN] The "pnpm" field in package.json is no longer read`). This REVERSES the earlier rule (under pnpm 10.x, package.json `pnpm.overrides` won and the workspace.yaml block was shadowed).

**Why it matters / what broke:** after a pnpm upgrade, every merge's post-merge `pnpm install --frozen-lockfile` failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` — the lockfile still carried package.json's overrides while pnpm now computed overrides only from workspace.yaml. If you "fix" it by a naive reinstall WITHOUT migrating, you silently drop the package.json security pins and reactivate the stale `esbuild: 0.27.3` that lived in workspace.yaml.

**Resolution applied:** the package.json `pnpm.overrides` were migrated INTO `pnpm-workspace.yaml`'s `overrides:` (esbuild pinned to 0.28.1 overwriting the old 0.27.3; plus vite 7.3.5, uuid, qs, postcss, ws, form-data, js-yaml, @babel/core) and the `pnpm` field was removed from package.json. Then `pnpm install --no-frozen-lockfile` regenerated the lockfile; post-merge then went green.

**How to apply:**
- To pin/override ANY dependency version (security fixes included), edit `pnpm-workspace.yaml` `overrides:`, NOT package.json. A `pnpm` field in package.json is dead weight and just emits a WARN.
- After editing, `pnpm install --no-frozen-lockfile`, then confirm via the lockfile's top `overrides:` section + `runDependencyAudit()`.
- The esbuild platform-binary removals (`esbuild>@esbuild/*: '-'`) and the rollup/lightningcss/oxide/ngrok removals all live in this same block — keep them when touching it.

**minimumReleaseAge interaction (unchanged):** workspace.yaml sets `minimumReleaseAge: 1440` (1 day). A RANGE override (e.g. `esbuild: ">=0.25.0"`) won't pick a fix newer than 1 day. An EXACT-version override (e.g. `esbuild: 0.28.1`, `vite: 7.3.5`) installs fine even when <1 day old — exact pins bypass the age gate. Use exact pins for fresh security patches; no need to touch `minimumReleaseAgeExclude`.

**Installing under memory pressure (this sandbox):** with all dev-server workflows running, free RAM drops to ~125-330Mi and a normal `pnpm install` (resolution phase) gets **OOM-killed** silently — and `setsid`/`nohup`/`disown` background installs are reaped too. For a lock-only change (override added, deps already cached), `pnpm install --offline` (cache-only, foreground) completes in ~90s and is the reliable path — don't waste re-runs on plain/background installs. After a pnpm store-version bump the old `store/vN` dir (e.g. v10, ~1.1G of tiny files) is INERT (pnpm only reads the current `store path` = v11); `rm -rf` of it is IO-bound and may time out — it's safe to leave, not an installed duplicate.
