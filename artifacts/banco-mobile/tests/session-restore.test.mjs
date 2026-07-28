/**
 * Session restore flow — static regression guards.
 *
 * These tests verify the cold-start session restore sequence in Expo Go by
 * asserting that each critical structural property is present in the source.
 * They run in CI (no device/emulator needed) and are the fastest way to catch
 * a regression in the auth / biometric / session restore chain before the app
 * ships.
 *
 * What is validated:
 *  1. tokenCache → Clerk persists tokens to SecureStore so sessions survive
 *     Expo Go being closed and reopened (no re-login prompt for valid sessions).
 *  2. ClerkLoaded → auth-sensitive providers only render once Clerk has fully
 *     resolved the stored session, so `isSignedIn` is always definitive.
 *  3. Provider order → AuthGateProvider > SessionProvider > BiometricProvider.
 *     SessionContext calls useAuthGate(), so the gate MUST sit above the
 *     session provider; inverting this creates a context cycle.
 *  4. Biometric hydration gate → an opaque cover is shown during the async boot
 *     window (hardware probe + AsyncStorage read) so a biometric-enabled user
 *     never sees real content before the lock is applied.
 *  5. Guest lock (listing detail) → the catch-all full-screen guest gate fires
 *     only after Clerk has resolved (isLoaded && !isSignedIn), and the fetch
 *     effect early-returns for guests to avoid unauthenticated API calls.
 *  6. Server save reconciliation → only runs when the user is signed in; guests
 *     must never trigger backend calls.
 *
 * Run: pnpm --filter @workspace/banco-mobile run test:session-restore
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.dirname(__dirname);

const LAYOUT = path.join(APP_ROOT, "app", "_layout.tsx");
const BIOMETRIC = path.join(APP_ROOT, "context", "BiometricContext.tsx");
const AUTH_GATE = path.join(APP_ROOT, "hooks", "useAuthGate.tsx");
const SESSION = path.join(APP_ROOT, "context", "SessionContext.tsx");
const LISTING = path.join(APP_ROOT, "app", "listing", "[id].tsx");

const layout = fs.readFileSync(LAYOUT, "utf8");
const biometric = fs.readFileSync(BIOMETRIC, "utf8");
const authGate = fs.readFileSync(AUTH_GATE, "utf8");
const session = fs.readFileSync(SESSION, "utf8");
const listing = fs.readFileSync(LISTING, "utf8");

// ─── 1. Token cache → session survives Expo Go restart ───────────────────────

test("Saving a search reaches the SERVER, or the new-listing alert stays dark", () => {
  const ctx = fs.readFileSync(
    path.join(APP_ROOT, "context", "SessionContext.tsx"),
    "utf8",
  );
  // The whole "a new listing matches your saved search" pipeline already existed
  // server-side: the saved_searches table, the new_match notification type, the
  // four CRUD endpoints, the per-user email channel, and notifyNewMatch running
  // on every publish. It produced nothing for anyone, because the app wrote
  // saved searches to AsyncStorage and never called the API — so every user's
  // server row set was empty and the matcher had nothing to match. This guard
  // exists because that failure is SILENT: no crash, no error, just an alert
  // that never arrives, which is exactly the kind of break that survives review.
  assert.match(
    ctx,
    /createSavedSearch\s*\(/,
    "saveSearch must POST the search to the server — local-only leaves new_match dark",
  );
  assert.match(
    ctx,
    /alerts_enabled:\s*true/,
    "the row must be created with alerts enabled, or notifyNewMatch skips it",
  );
  assert.match(
    ctx,
    /deleteSavedSearch\s*\(/,
    "removeSearch must delete the server row, or alerts outlive the search",
  );
  assert.match(
    ctx,
    /remoteId/,
    "the server id must be stored locally, or removeSearch cannot delete the row",
  );
  // Server enum is car | real_estate | industrial; facilities and materials both
  // collapse into industrial. Sending a raw browse category would be rejected —
  // or worse, stored and then never matched.
  assert.match(
    ctx,
    /apiCategoryFor\s*\(/,
    "the browse category must be mapped through apiCategoryFor before being sent",
  );
});

test("ClerkProvider configured with tokenCache (SecureStore-backed session persistence)", () => {
  assert.match(
    layout,
    /tokenCache.*from.*clerk\/expo\/token-cache/,
    "tokenCache must be imported from @clerk/expo/token-cache — this is what persists " +
      "the Clerk session token to SecureStore so the user is not asked to log in again " +
      "after closing and reopening Expo Go"
  );
  assert.match(
    layout,
    /tokenCache=\{tokenCache\}/,
    "tokenCache must be passed to <ClerkProvider> — without it, sessions are in-memory " +
      "only and are lost every time Expo Go is closed"
  );
});

// ─── 2. ClerkLoaded guards all auth-sensitive providers ──────────────────────

test("all auth-sensitive providers are rendered inside <ClerkLoaded>", () => {
  assert.match(
    layout,
    /<ClerkLoaded>/,
    "_layout must render <ClerkLoaded> to ensure Clerk has fully resolved the stored " +
      "session before any provider reads isSignedIn"
  );

  const clerkLoadedIdx = layout.indexOf("<ClerkLoaded>");
  const authGateIdx = layout.indexOf("<AuthGateProvider>");
  const sessionIdx = layout.indexOf("<SessionProvider>");
  const biometricIdx = layout.indexOf("<BiometricProvider>");

  assert.ok(clerkLoadedIdx !== -1, "<ClerkLoaded> must be present in _layout");
  assert.ok(
    authGateIdx > clerkLoadedIdx,
    "<AuthGateProvider> must be a descendant of <ClerkLoaded> so requireAuth() " +
      "never sees isSignedIn===undefined during session restore"
  );
  assert.ok(
    sessionIdx > clerkLoadedIdx,
    "<SessionProvider> must be inside <ClerkLoaded>"
  );
  assert.ok(
    biometricIdx > clerkLoadedIdx,
    "<BiometricProvider> must be inside <ClerkLoaded>"
  );
});

// ─── 3. Provider order is load-bearing ───────────────────────────────────────

test("provider order: AuthGateProvider wraps SessionProvider wraps BiometricProvider", () => {
  const authGateIdx = layout.indexOf("<AuthGateProvider>");
  const sessionIdx = layout.indexOf("<SessionProvider>");
  const biometricIdx = layout.indexOf("<BiometricProvider>");

  assert.ok(
    authGateIdx < sessionIdx,
    "AuthGateProvider must appear BEFORE SessionProvider in the tree — " +
      "SessionContext calls useAuthGate(), so the gate must sit above it to " +
      "avoid a context cycle and undefined requireAuth"
  );
  assert.ok(
    sessionIdx < biometricIdx,
    "SessionProvider must appear before BiometricProvider"
  );
});

// ─── 4. Biometric hydration gate covers the async boot window ────────────────

test("BiometricContext hydrated flag initialises to false", () => {
  assert.match(
    biometric,
    /const \[hydrated, setHydrated\] = useState\(false\)/,
    "hydrated must start false — before the hardware probe + AsyncStorage read " +
      "complete, we cannot know whether a biometric lock should apply, so the " +
      "gate must be closed by default"
  );
});

test("BiometricContext sets hydrated=true only after hardware + storage resolved", () => {
  assert.match(
    biometric,
    /setHydrated\(true\)/,
    "setHydrated(true) must be called once the async boot sequence finishes"
  );

  const hwIdx = biometric.indexOf("hasHardwareAsync");
  const storageIdx = biometric.indexOf("AsyncStorage.getItem");
  const hydratedIdx = biometric.indexOf("setHydrated(true)");
  assert.ok(
    hwIdx !== -1,
    "biometric hardware check (hasHardwareAsync) must be present"
  );
  assert.ok(
    storageIdx !== -1,
    "AsyncStorage.getItem must be used to read the saved biometric preference"
  );
  assert.ok(
    hwIdx < hydratedIdx,
    "hardware check must complete before setHydrated(true) — hydration gate " +
      "must cover the full async window, not just the storage read"
  );
  assert.ok(
    storageIdx < hydratedIdx,
    "AsyncStorage read must complete before setHydrated(true) — both the " +
      "hardware state AND the persisted preference must be resolved before the " +
      "gate opens, or a biometric-enabled user may see content before the lock"
  );
});

test("BiometricContext render pattern: !hydrated → HydrationGate, locked → LockOverlay", () => {
  assert.match(
    biometric,
    /!hydrated.*HydrationGate/,
    "HydrationGate must be rendered when !hydrated so the app is visually blocked " +
      "during the cold-boot window — prevents real content flashing before a " +
      "potential biometric lock is applied"
  );
  assert.match(
    biometric,
    /locked \? <LockOverlay/,
    "LockOverlay must render when locked is true — the user must pass biometric " +
      "authentication before the app content is revealed"
  );
});

test("HydrationGate uses theme background color (no white flash on cold boot)", () => {
  assert.match(
    biometric,
    /colors\.background/,
    "HydrationGate must use colors.background (defaults to dark) so there is " +
      "never a white flash during the async hydration window"
  );
});

test("HydrationGate sets pointerEvents=none on web (native biometrics are mobile-only)", () => {
  // On web we render the gate but make it non-interactive so it doesn't block
  // the UI — native biometrics do not run in a browser.
  assert.match(
    biometric,
    /Platform\.OS === "web".*"none"/,
    "HydrationGate must set pointerEvents to none on web — native biometrics " +
      "are unavailable there so the gate must not block interaction"
  );
});

// ─── 5. Auth gate reads definitive isSignedIn; guest path opens modal ────────

test("AuthGateProvider reads isSignedIn from Clerk useAuth", () => {
  assert.match(
    authGate,
    /useAuth\b/,
    "AuthGateProvider must read from Clerk useAuth — this is the authoritative " +
      "source of session state after ClerkLoaded resolves"
  );
  assert.match(
    authGate,
    /isSignedIn/,
    "requireAuth must gate on isSignedIn — never on a local boolean that could " +
      "be stale during session restore"
  );
});

test("AuthGateProvider opens modal for guests and skips action (does not run action for unauthenticated users)", () => {
  // requireAuth must: (a) run the action and return true when signed in, OR
  // (b) open the marketing modal and return false when signed out.
  // If the modal mechanism is removed, guests bypass the funnel silently.
  assert.match(
    authGate,
    /setOpen\(true\)/,
    "requireAuth must call setOpen(true) for guests to open the auth modal — " +
      "this is the single funnel that prevents unauthenticated actions"
  );
  assert.match(
    authGate,
    /return false/,
    "requireAuth must return false for guests so callers can guard their action"
  );
  assert.match(
    authGate,
    /return true/,
    "requireAuth must return true for signed-in users so callers proceed normally"
  );
});

test("provider order verified by closing-tag order (nesting integrity)", () => {
  // Closing tags appear in reverse order of nesting. If BiometricProvider closes
  // before AuthGateProvider, Biometric is an inner child as required.
  const closeAuthGate = layout.indexOf("</AuthGateProvider>");
  const closeSession = layout.indexOf("</SessionProvider>");
  const closeBiometric = layout.indexOf("</BiometricProvider>");

  assert.ok(closeAuthGate !== -1, "</AuthGateProvider> must be in layout");
  assert.ok(closeSession !== -1, "</SessionProvider> must be in layout");
  assert.ok(closeBiometric !== -1, "</BiometricProvider> must be in layout");

  assert.ok(
    closeBiometric < closeSession,
    "</BiometricProvider> must close before </SessionProvider> — confirming " +
      "BiometricProvider is nested inside SessionProvider"
  );
  assert.ok(
    closeSession < closeAuthGate,
    "</SessionProvider> must close before </AuthGateProvider> — confirming " +
      "SessionProvider is nested inside AuthGateProvider"
  );
});

// ─── 6. Listing detail — catch-all full-screen guest lock ────────────────────

test("listing detail renders guest lock only after Clerk has fully loaded (isLoaded && !isSignedIn)", () => {
  assert.match(
    listing,
    /isLoaded && !isSignedIn/,
    "listing/[id] must check isLoaded before !isSignedIn — during session restore " +
      "isLoaded is false and isSignedIn is undefined; gating on !isSignedIn alone " +
      "would flash the guest lock for a user whose session is being restored"
  );
});

test("listing detail fetch effect guards on both !isLoaded and !isSignedIn", () => {
  // Both guards must be present: the isLoaded guard prevents a fetch while the
  // session is still being restored, and the isSignedIn guard blocks guests.
  // Removing either lets unauthenticated API calls through or causes a flash.
  assert.match(
    listing,
    /if \(!isLoaded\) return/,
    "load effect must early-return when Clerk hasn't finished resolving (session restore window)"
  );
  assert.match(
    listing,
    /if \(!isSignedIn\) return/,
    "load effect must also early-return for confirmed guests to avoid unauthenticated API calls"
  );
  // Both guards must appear in the same effect (close together in the file).
  const isLoadedIdx = listing.indexOf("if (!isLoaded) return");
  const isSignedInIdx = listing.indexOf("if (!isSignedIn) return");
  assert.ok(
    Math.abs(isSignedInIdx - isLoadedIdx) < 200,
    "both guards must be in the same effect block (within 200 chars of each other)"
  );
});

// ─── 7. Server save reconciliation is gated on signed-in state ───────────────

test("SessionContext server reconciliation only runs for signed-in users", () => {
  assert.match(
    session,
    /if \(!isSignedIn\) return/,
    "the server-side save reconciliation useEffect must early-return when the " +
      "user is not signed in — guests must never trigger backend sync"
  );
});
