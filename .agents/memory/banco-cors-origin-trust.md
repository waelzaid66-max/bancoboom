---
name: BANCO CORS / browser-origin trust policy
description: Why the API CORS allowlist must be BANCO-owned origins only + the unsafe-method CSRF guard; how to extend safely.
---

# BANCO cross-origin trust policy (api-server)

**Rule:** The API's credentialed CORS allowlist (`artifacts/api-server/src/lib/cors.ts`)
must contain ONLY BANCO-owned origins: `CORS_ALLOWED_ORIGINS` (explicit prod/custom
domains) + this repl's own `REPLIT_DOMAINS` / `REPLIT_DEV_DOMAIN` + localhost (dev only,
gated on `NODE_ENV!=="production"` AND `!REPLIT_DEPLOYMENT`). Never trust broad
`*.replit.app` / `*.replit.dev` / `*.repl.co` suffix patterns. Requests with no Origin
header still pass (`if(!origin) return true`) — that's the native mobile/server path.

**Why:** Those Replit suffixes are shared, third-party-registrable domains; trusting the
whole suffix let ANY attacker-hosted `*.replit.app` page read a signed-in victim's
credentialed API responses (and trigger cross-origin state changes). Under `replit.app`
the attacker and victim are same-site, so `SameSite=Lax` cookies don't save you.

**Client topology (the reason this is safe):**
- dealer-os + admin-os call the API via ROOT-RELATIVE `/api/...` (no `setBaseUrl`) →
  SAME-ORIGIN through the Replit proxy in dev AND prod. They don't need CORS at all; they
  authenticate with the ambient Clerk cookie.
- banco-mobile (Expo) uses `setBaseUrl(https://EXPO_PUBLIC_DOMAIN)` + a bearer token
  (`setAuthTokenGetter`). React Native fetch sends NO browser Origin and isn't subject to
  CORS → relies on the no-Origin pass.
- So the broad suffix allowlist protected zero legitimate client; it was pure attack surface.

**CSRF guard (defense-in-depth, app.ts, after cors() before body parsers):** CORS blocks
credentialed READS and PREFLIGHTED writes, but a cross-origin "simple" POST (no JSON
body / no custom headers, e.g. a save-toggle) is NOT preflighted — the browser still sends
it with cookies and the side effect runs. So `shouldRejectUnsafeOrigin()` 403s
POST/PUT/PATCH/DELETE when an Origin is present AND it's neither allowlisted nor
same-origin (Origin.host === request Host header — use the Host header, a fetch can't forge
it cross-origin; do NOT trust X-Forwarded-Host). Same-origin host-match lets legit web
mutations pass WITHOUT pre-configuring the deployment origin; no-Origin (mobile/server)
passes.

**How to apply:**
- Adding a NEW separate-origin BANCO web client → add its origin to `CORS_ALLOWED_ORIGINS`,
  never a suffix pattern. Same-origin clients need nothing.
- Adding a state-changing endpoint → already covered by the guard; no per-route work.
- Verifying middleware/CORS changes: the api-server `dev` script BUILDS a bundle and runs
  `dist/` (`build && start`, esbuild — NO watch). Source edits are NOT hot-reloaded; you
  MUST `restart_workflow("artifacts/api-server: API Server")` before curl/browser will see
  the change. Unit tests (`vitest run src/lib/cors.test.ts`) read source directly and don't
  need the restart.
