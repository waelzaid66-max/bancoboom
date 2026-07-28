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
