---
name: BANCO install on Replit + env/secret placement
description: How to install this monorepo's deps within the 120s command limit, and where Clerk/Expo/AI values must live on Replit
---

# Installing deps within the 120s command limit

A plain `pnpm install` on this monorepo (~1393 pkgs) exceeds the agent's 120s bash limit — the per-file **store integrity checksum** is what blows the budget, not the network.

Command that finishes (~76s):
```
CI=true corepack pnpm@11.9.0 install --frozen-lockfile --offline --ignore-scripts \
  --config.verify-store-integrity=false --config.package-import-method=hardlink
```
**Why:** `verify-store-integrity=false` skips the slow per-file checksum; `--offline` + hardlink reuse the warm store. `--ignore-scripts` then requires a follow-up `pnpm rebuild -r` to run the 4 allow-listed postinstall builds (esbuild, @clerk/shared, core-js, browser-tabs-lock).
**How to apply:** any time deps must be (re)installed here, including post-merge reconciliation. `packageManager` is pinned `pnpm@11.9.0` in root package.json.

# DB schema for a fresh Replit DB
`corepack pnpm@11.9.0 --filter @workspace/db run push` applies the drizzle schema (fixes "relation \"users\" does not exist"). For the MERGED/main DB use `push-force` (no TTY) — see post-merge-drizzle-push.md.

# Where env values must live on Replit (client/server separation)
- `setEnvVars({environment:"shared"})` writes **plaintext into `.replit`**, which is committed to git. Only put **public/non-sensitive** values there: `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, dummy `AI_INTEGRATIONS_OPENAI_API_KEY=_DUMMY_API_KEY_`, object-storage paths, `ADMIN_EMAILS`, `PAYMOB_MODE`.
- **Sensitive** values (`CLERK_SECRET_KEY`, `EXPO_TOKEN`, any real API key) must go to the **encrypted secret store** via `requestEnvVar({requestType:"secret"})` — you CANNOT write secrets programmatically. Never leave them in `.replit`, and never commit an uploaded secrets doc (e.g. attached_assets/*secrets*.docx).
**Why:** a sk_test_/sk_live_ Clerk key or Expo token in committed `.replit`/history is a credential leak; rotate if exposed.

# AI gateway is dev-only
`AI_INTEGRATIONS_OPENAI_BASE_URL=http://localhost:1106/modelfarm/openai` is Replit's dev model-farm sidecar. It does NOT exist in an autoscale deployment — production needs a reachable AI endpoint + key (or `OPENAI_API_KEY`). The OpenAI client in `lib/integrations-openai-ai-server/src/_client.ts` is lazy (checks `AI_INTEGRATIONS_OPENAI_API_KEY` then `OPENAI_API_KEY`) so missing AI config no longer crashes non-AI startup.

# Workflows
configureWorkflow is unreliable here (stale ghost-workflow limit); use the top-level `restart_workflow` tool. The artifact system auto-injects `PORT` for each app. The 6 apps: api-server(:8080), dealer-os "BANCO Market"(/dealer-os/), admin-os "BANCO Control Center"(/admin-os/), landing(/), banco-mobile expo(Metro), mockup-sandbox. Expo web bundles on first request — warm it with a curl before screenshotting or the shot cancels mid-compile.
