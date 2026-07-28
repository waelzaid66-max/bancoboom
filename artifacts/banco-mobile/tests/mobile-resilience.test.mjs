// P2-12 — mobile crash/offline resilience regression (static guards).
// Run: pnpm --filter @workspace/banco-mobile run test:resilience

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.dirname(__dirname);

const LAYOUT = path.join(APP_ROOT, "app", "_layout.tsx");
const CRASH_LOG = path.join(APP_ROOT, "lib", "crashLog.ts");
const ERROR_BOUNDARY = path.join(APP_ROOT, "components", "ErrorBoundary.tsx");
const SESSION = path.join(APP_ROOT, "context", "SessionContext.tsx");
const PACKAGE = path.join(APP_ROOT, "package.json");
const DEV_START = path.join(APP_ROOT, "scripts", "start-dev.sh");

test("root layout installs global crash handler and ErrorBoundary", () => {
  const layout = fs.readFileSync(LAYOUT, "utf8");
  assert.match(layout, /installGlobalCrashHandler/, "must install global JS crash handler");
  assert.match(layout, /ErrorBoundary/, "must wrap app in ErrorBoundary");
  assert.match(layout, /logClientCrash/, "must log render crashes from boundary");
});

test("crashLog exposes logClientCrash and installGlobalCrashHandler", () => {
  const src = fs.readFileSync(CRASH_LOG, "utf8");
  assert.match(src, /export function logClientCrash/, "logClientCrash must be exported");
  assert.match(src, /export function installGlobalCrashHandler/, "installGlobalCrashHandler exported");
  assert.match(src, /\[crash\]/, "crash tag for log filtering");
});

test("ErrorBoundary resets on retry and reports errors", () => {
  const src = fs.readFileSync(ERROR_BOUNDARY, "utf8");
  assert.match(src, /getDerivedStateFromError/, "class boundary pattern");
  assert.match(src, /componentDidCatch/, "must catch render errors");
});

test("Expo Go startup keeps Clerk configuration and avoids unsupported push imports", () => {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE, "utf8"));
  const startScript = fs.readFileSync(DEV_START, "utf8");
  const feed = fs.readFileSync(path.join(APP_ROOT, "app", "(tabs)", "index.tsx"), "utf8");
  const push = fs.readFileSync(
    path.join(APP_ROOT, "hooks", "usePushNotifications.tsx"),
    "utf8",
  );

  assert.match(packageJson.scripts.dev, /bash scripts\/start-dev\.sh/);
  assert.doesNotMatch(
    packageJson.scripts.dev,
    /EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=\$CLERK_PUBLISHABLE_KEY/,
    "the development command must never overwrite the shared public key",
  );
  assert.match(
    startScript,
    /EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required/,
    "startup must fail before Metro can create a bad bundle",
  );
  assert.match(
    startScript,
    /EXPO_PUBLIC_API_BASE_URL=.*:8080/,
    "physical Expo clients need the API workflow's public port",
  );
  assert.doesNotMatch(
    feed,
    /^import\s+\*\s+as\s+Notifications\s+from\s+["']expo-notifications["'];/m,
    "Expo Go must not load notifications at feed module initialization",
  );
  assert.doesNotMatch(
    push,
    /^import\s+\*\s+as\s+Notifications\s+from\s+["']expo-notifications["'];/m,
    "Expo Go must not load notification APIs at push bridge initialization",
  );
  assert.match(push, /ExecutionEnvironment\.StoreClient/);
});

test("SessionContext documents offline-friendly cache path", () => {
  const src = fs.readFileSync(SESSION, "utf8");
  assert.match(src, /offline/i, "session layer must mention offline behavior");
  assert.match(src, /AsyncStorage/, "must use AsyncStorage for local persistence");
});

test("notification routing avoids sheet-only billing paths", () => {
  const src = fs.readFileSync(path.join(APP_ROOT, "lib", "notificationRouting.ts"), "utf8");
  assert.doesNotMatch(src, /openSheet.*billing/i, "billing must be full-page hub");
});

// Single router for in-app feed + remote push — booking role stamps stay consistent.
test("in-app and push notification taps share routeForNotification", () => {
  const feed = fs.readFileSync(path.join(APP_ROOT, "app", "notifications.tsx"), "utf8");
  const push = fs.readFileSync(
    path.join(APP_ROOT, "hooks", "usePushNotifications.tsx"),
    "utf8",
  );
  assert.match(
    feed,
    /routeForNotificationItem/,
    "in-app notifications feed must route via shared helper",
  );
  assert.match(
    push,
    /routeForNotification\s*\(/,
    "push tap handler must route via shared helper",
  );
  assert.match(
    feed,
    /from\s+["']@\/lib\/notificationRouting["']/,
    "feed must import from notificationRouting",
  );
  assert.match(
    push,
    /from\s+["']@\/lib\/notificationRouting["']/,
    "push must import from notificationRouting",
  );
});

test("bookings screen honors role query param (guest|host)", () => {
  const src = fs.readFileSync(path.join(APP_ROOT, "app", "bookings.tsx"), "utf8");
  assert.match(src, /useLocalSearchParams/, "must read role from route params");
  assert.match(
    src,
    /roleParam\s*===\s*["']host["']\s*\?\s*["']host["']\s*:\s*["']guest["']/,
    "missing/unknown role param defaults to guest trips (intentional)",
  );
  assert.match(
    src,
    /roleParam\s*===\s*["']host["']\s*\|\|\s*roleParam\s*===\s*["']guest["']/,
    "must accept explicit guest|host from notification deep-links",
  );
});

// The production Clerk tenant (clerk.banco.today) has an EMPTY social provider
// dictionary — email+password and email OTP only. Rendering Google/Facebook/
// Apple buttons unconditionally made startSSOFlow throw and showed the user a
// dead-end "Sign-in failed. Please try again." dialog. Buttons must be gated on
// what the tenant actually reports as enabled.
test("social sign-in buttons are gated on tenant-enabled providers", () => {
  const src = fs.readFileSync(path.join(APP_ROOT, "app", "(tabs)", "profile.tsx"), "utf8");
  assert.match(
    src,
    /useSocialProviders\s*\(/,
    "auth sheet must resolve enabled providers from the Clerk tenant",
  );
  for (const provider of ["google", "facebook", "apple"]) {
    assert.match(
      src,
      new RegExp(`socialProviders\\.includes\\(["']${provider}["']\\)`),
      `${provider} button must be gated on the tenant having it enabled`,
    );
  }
  // A generic retry prompt on a dashboard-misconfigured strategy is an infinite
  // loop for the user — the real Clerk reason must reach the alert.
  assert.match(
    src,
    /longMessage/,
    "SSO failures must surface the real Clerk error, not only a generic retry",
  );
});

// Clerk sign-in is a multi-step state machine. The live banco.today tenant
// verifies the password and then returns `needs_second_factor` with an
// email_code (proven against the live tenant: prepare_second_factor -> 200,
// verification_otp/email_code). Code that only honoured `status === "complete"`
// silently dropped every correct email+password, so no real user could sign in.
// Each non-complete status must be driven to its next step, never ignored.
test("sign-in handles every non-complete Clerk status", () => {
  const src = fs.readFileSync(path.join(APP_ROOT, "app", "(tabs)", "profile.tsx"), "utf8");
  assert.match(
    src,
    /needs_second_factor/,
    "password sign-in must handle needs_second_factor, not just complete",
  );
  assert.match(
    src,
    /signIn\.mfa\.sendEmailCode\s*\(/,
    "email second factor must be dispatched before asking for the code",
  );
  assert.match(
    src,
    /signIn\.mfa\.verifyEmailCode\s*\(/,
    "email second-factor code must be verified",
  );
  // A user with an authenticator app or recovery codes must not be locked out
  // just because this tenant currently prefers email.
  for (const fn of ["verifyTOTP", "verifyBackupCode", "verifyPhoneCode"]) {
    assert.match(
      src,
      new RegExp(`signIn\\.mfa\\.${fn}\\s*\\(`),
      `${fn} must be supported so enrolled users are never stranded`,
    );
  }
  assert.match(
    src,
    /step\s*===\s*"mfa"/,
    "a second-factor screen must exist to collect the code",
  );
  assert.match(
    src,
    /needs_new_password/,
    "needs_new_password must route into the reset flow instead of dead-ending",
  );
});

// Auto-selecting one second factor with no escape hatch is itself a lockout:
// a user enrolled in TOTP + backup_code who wiped their authenticator would
// have no way to reach the factor they can still use. The MFA screen must let
// them switch to any OTHER enrolled factor.
test("users with multiple second factors can switch method", () => {
  const src = fs.readFileSync(path.join(APP_ROOT, "app", "(tabs)", "profile.tsx"), "utf8");
  assert.match(
    src,
    /selectSecondFactor\s*[=(]/,
    "a single entry point must open the MFA step on a chosen strategy",
  );
  assert.match(
    src,
    /handleSwitchMfaMethod/,
    "the MFA screen must expose a handler for switching factor",
  );
  assert.match(
    src,
    /otherSecondFactors/,
    "the other enrolled factors must be offered as alternatives",
  );
  // The alternatives list must be derived from what the tenant actually
  // reports for this user, never a hardcoded menu.
  assert.match(
    src,
    /supportedSecondFactors/,
    "alternatives must come from signIn.supportedSecondFactors",
  );
  // Switching must exclude the strategy already in use, or the list renders a
  // no-op entry that looks broken.
  assert.match(
    src,
    /!==\s*mfaStrategy/,
    "the current strategy must be excluded from the alternatives",
  );
  // Every strategy the app can auto-pick needs a switch label, or the button
  // renders a raw i18n key.
  const i18n = fs.readFileSync(path.join(APP_ROOT, "constants", "i18n.ts"), "utf8");
  for (const s of ["totp", "email_code", "phone_code", "backup_code"]) {
    const occurrences = i18n.split(`mfaMethod_${s}:`).length - 1;
    assert.equal(
      occurrences,
      2,
      `mfaMethod_${s} must be translated in BOTH en and ar (found ${occurrences})`,
    );
  }
});

test("social provider resolution fails closed", () => {
  const src = fs.readFileSync(path.join(APP_ROOT, "hooks", "useSocialProviders.ts"), "utf8");
  assert.match(
    src,
    /enabled\s*===\s*true/,
    "only strategies explicitly enabled by the tenant may render",
  );
  assert.match(src, /AbortController/, "environment probe must be time-bounded");
  assert.doesNotMatch(
    src,
    /return\s+SUPPORTED\s*;/,
    "must never fall back to assuming all providers are available",
  );
});
