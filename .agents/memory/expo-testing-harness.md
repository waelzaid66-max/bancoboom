---
name: Expo app not reachable by the Playwright test harness
description: runTest (testing skill) navigates the main proxy host, which does not route to the Expo dev server; verify Expo apps via the screenshot tool instead.
---

# The automated e2e harness cannot reach an Expo artifact

`runTest` (testing skill) drives a Playwright browser against the main proxy
host (`<id>.janeway.replit.dev/<path>`, path-based routing). Expo apps bypass
that shared proxy and serve from a separate domain
(`<id>.expo.janeway.replit.dev`, i.e. `REPLIT_EXPO_DEV_DOMAIN`).

**Symptom:** the test agent hits the main host and gets the API server's
`{"error":{"code":"NOT_FOUND","message":"Route not found: GET /<path>"}}`
instead of the Expo UI, then reports all routes unresolved.

**How to apply:** Do not spend a `runTest` on the Expo mobile app expecting it
to reach the UI. Verify Expo screens with the `screenshot` tool (it correctly
targets `REPLIT_EXPO_DEV_DOMAIN`). `runTest` is fine for the proxied web
artifacts (dealer-os, etc.). Interactive Expo flows that screenshots can't
drive (typing, toggles) currently have no automated harness — reason about them
from typecheck + architect review instead.

# banco-mobile cinematic splash hijacks every screenshot

The banco-mobile app shows a ~2.5s full-screen `CinematicIntro` overlay on cold
start. The `screenshot` tool always opens a fresh session, so it lands mid-splash
and you only ever capture the black intro — NOT a sign the app is broken.

**How to apply:** append `?noIntro=1` to the screenshot path (e.g.
`/listing/<id>?noIntro=1`, `/?noIntro=1`) to skip the intro and capture real
content. The intro is gated in `app/_layout.tsx` (`shouldSkipIntro()`): on web it
also self-suppresses after the first play via `sessionStorage` key
`banco_intro_seen`, so a real user/canvas iframe only sees it once per session.
Native always plays it.

# banco-mobile dynamic routes (/listing/[id]) cold-load WHITE in screenshots

Even with `?noIntro=1`, deep-linking the `screenshot` tool straight to a dynamic
route like `/listing/<id>` frequently captures a pure-WHITE frame, while the
index route `/?noIntro=1` renders reliably. This is a cold-load timing artifact
(web font gate + route-chunk load paints white before first content), NOT a
crash, and retries usually reproduce the white frame for that route.

**How to tell it's a flake, not a bug:** the detail screen's loading, error, and
ErrorBoundary→ErrorFallback views ALL use `colors.background` (#000). So a real
loading / error / crash state screenshots DARK. A pure-WHITE capture means
nothing painted yet (pre-paint) = timing. Don't burn repeated screenshots on it:
verify such routes via typecheck + architect review + the raw API response shape,
plus one reliable index-route render and (if you get one) a single warm detail
render.

This also applies to the STATIC tab routes (`/search`, `/saved`, `/profile`,
`/messages`), not just dynamic ones. Cold-loading any non-index tab via the
screenshot tool's direct URL repeatedly paints pure-WHITE while `/` (index)
renders fine — even for tabs you never touched. Proof it's the harness and not
your code: the untouched `/saved` and `/profile` capture just as blank, yet their
browser logs still emit render-stage warnings (`props.pointerEvents is
deprecated`, RN `Animated useNativeDriver`) that only fire when the tree actually
mounts and renders. So a blank non-index tab capture is NOT evidence of a crash.
Verify those screens via typecheck + careful review; only `/` is reliably
screenshot-verifiable.

# Replit in-browser "Simulate on Android" can show a blank phone ≠ app bug

The Replit preview pane's "Simulate on Android" boots a cloud Android emulator
that must connect to Metro and load the app through Expo Go. When it shows a
blank/textured phone frame AND the Metro log has logged ZERO Android bundle
requests (only "Web Bundled"), the emulator never actually connected — the app
was never loaded, so this is a preview/connection limitation, NOT a render crash
or a Clerk/env bug. Don't chase it as a code defect.

**How to tell + what to do:** confirm the app is healthy independently (clean
`Web Bundled`, no `Cannot find native module`/Clerk errors, `Metro waiting on
exp://<id>.expo.janeway.replit.dev`). The reliable, Replit-recommended path to
actually see an Expo app is scanning that public `exp://` QR with Expo Go on a
PHYSICAL phone (force-close Expo Go first to drop any cached crashed session).
A `restart_workflow` gives the emulator a clean Metro to reconnect to, but you
cannot drive or deep-debug the in-browser emulator from agent tools.

**The "Retry" screen is NOT a project binding bug — stop chasing `--localhost`.**
Metro binds to ALL interfaces even WITH `expo start --localhost` (proven:
`curl http://<hostname -I>:23351/` AND `127.0.0.1:23351` BOTH return 200 with
`expo-platform: android`). The Android manifest is also clean — `hostUri` and
`debuggerHost` resolve to the public `<id>.expo.janeway.replit.dev` domain, NOT
localhost (the `EXPO_PACKAGER_PROXY_URL`/`REACT_NATIVE_PACKAGER_HOSTNAME` env
vars override the advertised host regardless of `--localhost`). So "make it bind
non-localhost" is a non-fix; the server is already reachable. **Replit's
documented fix for a persistent Android Retry is clearing the Metro cache** (docs
say `expo start --clear`). Apply it WITHOUT permanently changing the canonical
dev command: temporarily append `--clear` to the package.json `dev` script,
`restart_workflow` (log confirms `Bundler cache is empty, rebuilding`), then
revert the script — the already-running cleared session is unaffected by the
file revert. After that, only the user can click "Simulate on Android"; watch the
Metro log for a first `Android Bundling` line (Android cold build is slower than
iOS's ~32s, so wait 60s+).

**Decisive real-render check that beats the white-capture quirk:** the
`screenshot` tool with `type:"external_url"` pointed at the PUBLIC expo web URL
`https://<REPLIT_EXPO_DEV_DOMAIN>/?noIntro=1` uses a patient real browser
(Firecrawl, waits for content) and reliably captures the FULLY rendered Expo Web
app (logo, tabs, feed skeletons, tab bar) where the `app_preview` headless tool
only ever returns pre-paint white. Use this to prove an Expo app renders and to
hand the user a working computer-screen view — that same public HTTPS expo
domain serves Expo Web to any normal browser tab, bypassing the flaky cloud
emulator entirely. (The domain is ephemeral — it changes on workflow restart.)

Related red herring: a missing/empty `CLERK_PROXY_URL` in DEV is EXPECTED (dev
hits Clerk's dev FAPI directly; proxy is prod-only — per clerk-auth skill). The
whole Expo tree is gated behind `<ClerkLoaded>`, so a blank screen tempts a
"Clerk env is broken" diagnosis — but if the publishable key exists and there
are no Clerk errors in browser logs, Clerk is fine; look at preview/connection.

# Dev workflows share ports and orphan on restart

The api-server (8080), dealer-os (vite), expo (metro), and mockup-sandbox
workflows intermittently fail with EADDRINUSE / "Port X is being used" after a
checkpoint or merge because a prior process still holds the port. Expo also
hangs on an interactive "Use port NNNN instead? (Y/n)" prompt. Fix: just
`restart_workflow` the affected workflow — SIGTERM/SIGKILL frees the port and
rebinds cleanly. This is environmental, not a code regression.
