---
name: BANCO production web build & serve
description: How banco-mobile ships a browser (web) build in production, Clerk origin gating, and long-build execution on Replit
---

## Production web serving (fixed July 2026)
- Deploy build (`scripts/build.js`) runs `exportWebBuild()` — `expo export --platform web` into `static-build/web` with `EXPO_WEB_BASE_URL=/banco-mobile` (feeds `experiments.baseUrl` in app.config.ts, set ONLY during web export; dev/native untouched) and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` mapped from `CLERK_PUBLISHABLE_KEY`. Build fails loudly if index.html missing.
- `server/serve.js`: browsers (no `expo-platform` header) get the web SPA (index no-cache, `/_expo/*` immutable); Expo Go manifest flow unchanged; QR landing page moved to `/expo-go`; SPA fallback only for extension-less paths; native static-build files still served.
- **Why:** previously prod served the QR page to browsers — there was never a web build; users saw "the app doesn't work".
- `static-build/` is gitignored (build container regenerates it).

## Clerk single-origin rule (critical)
- `_layout.tsx` wraps EVERYTHING in `<ClerkLoaded>`. With pk_live (instance clerk.banco.today), any non-authorized origin (localhost, *.replit.dev, banco.autos, banco.deals) → clerk-js never loads → **infinite white screen, zero console errors**.
- **How to apply:** white screen + "Running application main" + no errors = Clerk origin, not a code bug. Prod on banco.today works (verified `/v1/environment` 200 with that Origin). Dev web preview sign-in needs pk_test/sk_test (user must fetch from Clerk dashboard). banco.autos/banco.deals redirect to banco.today paths via landing DomainRouter — do NOT "restore" them as standalone origins unless Clerk satellite domains get configured.

## Double /api regression (root cause of July 2026 outage)
- NEVER set `EXPO_PUBLIC_API_BASE_URL` to a value ending in `/api` — the orval client already emits `/api/v1/...` full paths. Correct config: leave it UNSET; `EXPO_PUBLIC_DOMAIN=banco.today` (prod) / `$REPLIT_DEV_DOMAIN` (dev script) is the fallback base.

## Long builds on Replit workspace
- Detached shell processes (nohup/setsid+disown) get REAPED when the ShellExec session ends — silent death, no exit code. Run long builds as a temp **console workflow** (`configureWorkflow` → poll → `removeWorkflow`). Memory headroom: stop banco-web (next-server ~700MB) and kill tsserver (~1.4GB, restarts on demand) first; container is 8GB/2 cores.

## White-screen root cause + render gates (Jul 2026)
- clerk-js live keys hard-fail on ANY origin except banco.today ("Production Keys are only allowed for domain banco.today"); `<ClerkLoaded>` then blanked the WHOLE app forever (dev preview, 127.0.0.1, banco.autos…).
- Fix in app/_layout.tsx: ClerkLoadGate (renders as signed-out after 2.5s, hydrates auth if clerk loads later) + font wait cap 2s (fonts load slowly on web but DO load; system-font fallback then swap). Both timers run in PARALLEL from mount. AuthTokenBridge getToken().catch(()=>null).
- Never reintroduce unconditional `return null` gates (fonts/Clerk/anything): every gate needs a timeout + console.error.
- Screenshot tool captures ~1-2s after load — too early for timeout gates; verify freshness by curling the entry bundle and grepping for new identifiers instead.
