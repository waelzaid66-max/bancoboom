---
name: Broken pnpm-workspace.yaml takes down ALL workflows
description: Why a bad catalog/allowBuilds entry makes every artifact server fail at once, and how it masquerades as an app UI bug
---

# A broken `pnpm-workspace.yaml` downs every workflow at once

Every artifact workflow runs a pre-run pnpm **deps status check** (`runDepsStatusCheck` → `pnpm install`) before its dev command. If the workspace install cannot resolve, **all 6 workflows fail simultaneously** — not just the one you changed.

**Two failure shapes seen together (both from a merged task editing the workspace file):**
- `[ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC] No catalog entry '<pkg>' was found` — a package.json references `<pkg>: catalog:` but the catalog in `pnpm-workspace.yaml` has no such key. Fix: add the key to the `catalog:` block. (Real case: a `banco-web` Next.js artifact referenced `next: catalog:` with no `next` in the catalog.)
- `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: <pkg>` **followed by exit code 1** — `allowBuilds:` had a literal placeholder value `<pkg>: set this to true or false` (pnpm writes this when it wants a human decision). That non-boolean value makes the deps check exit non-zero. Fix: set it to a real boolean (`sharp: true`).

**Why it's dangerous / non-obvious:** the *symptom* on device looks like an app bug — section pages show empty/black content (api-server is down → no feed) and the phone shows the *old UI with wrong assets* (Metro server is down → device serves a stale cached bundle, i.e. "the running version lies"). The code can be completely correct while the user sees a frozen, data-less old build. Check workflow health FIRST before believing a UI-regression report.

**Root `pnpm install` can OOM:** node's default old-space (~2GB) is not enough for this monorepo's full resolution — install dies with "Ineffective mark-compacts near heap limit". Run `NODE_OPTIONS="--max-old-space-size=4096" pnpm install --no-frozen-lockfile`.

**After fixing the config:** clear Metro cache (`rm -rf /tmp/metro-cache /tmp/metro-file-map-* /tmp/haste-map-*`) and restart `banco-mobile` so the device pulls a fresh bundle instead of the stale one; restart all other workflows too.

**Prevention:** `scripts/post-merge.sh` uses `pnpm install --no-frozen-lockfile` so a merged task that legitimately adds deps doesn't wedge the whole repl on a frozen-lockfile mismatch.

**Why:** a merged task (adding a `next`/Next.js web artifact) edited `pnpm-workspace.yaml`, left a `sharp: set this to true or false` placeholder and omitted the `next` catalog entry, taking down all 6 servers; the user experienced it as the mobile app being "broken and lying".
