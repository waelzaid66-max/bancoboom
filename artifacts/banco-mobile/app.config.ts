import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Deep-link / universal-link origin for expo-router static rendering.
 *
 * - Dev / Replit: defaults to https://replit.com/ (matches current tunnel host).
 * - Production EAS: set EXPO_PUBLIC_ROUTER_ORIGIN=https://your-production-domain
 *   in the EAS production environment before `eas build --profile production`.
 *
 * Do NOT hardcode the production domain here — it would break local Expo Go dev.
 */
const routerOrigin =
  process.env.EXPO_PUBLIC_ROUTER_ORIGIN?.trim() ||
  process.env.EXPO_ROUTER_ORIGIN?.trim() ||
  "https://replit.com/";

/**
 * HTTPS app-link host for Universal Links (iOS) and App Links (Android).
 * Driven only by operator env — never hardcoded. Omitted when unset or replit.com.
 */
function webAppLinkHost(): string | null {
  for (const raw of [
    process.env.EXPO_PUBLIC_PUBLIC_APP_URL,
    process.env.EXPO_PUBLIC_ROUTER_ORIGIN,
    process.env.EXPO_ROUTER_ORIGIN,
  ]) {
    const t = raw?.trim();
    if (!t) continue;
    try {
      const url = t.includes("://") ? new URL(t) : new URL(`https://${t}`);
      const host = url.hostname;
      if (!host || host === "replit.com" || host.endsWith(".replit.dev")) {
        continue;
      }
      return host;
    } catch {
      /* try next */
    }
  }
  return null;
}

const webHost = webAppLinkHost();

function withRouterOrigin(plugins: ExpoConfig["plugins"]): ExpoConfig["plugins"] {
  return (plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === "expo-router") {
      const opts =
        typeof plugin[1] === "object" && plugin[1] !== null ? plugin[1] : {};
      return ["expo-router", { ...opts, origin: routerOrigin }];
    }
    return plugin;
  });
}

// Canonical dynamic-config pattern: `config` IS the parsed app.json, so the
// static store config (bundle ids, permissions, icons) stays the single source
// of truth and this file only layers the env-driven link/origin bits on top.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: withRouterOrigin(config.plugins),
  // Web static export served under a path prefix (e.g. /banco-mobile/ on the
  // Replit deployment). Set ONLY by scripts/build.js during `expo export -p web`;
  // absent in dev and native builds so nothing changes there.
  ...(process.env.EXPO_WEB_BASE_URL
    ? {
        experiments: {
          ...config.experiments,
          baseUrl: process.env.EXPO_WEB_BASE_URL.replace(/\/+$/, ""),
        },
      }
    : {}),
  ios: {
    ...config.ios,
    ...(webHost
      ? {
          associatedDomains: [
            `applinks:${webHost}`,
            `webcredentials:${webHost}`,
          ],
        }
      : {}),
  },
  android: {
    ...config.android,
    ...(webHost
      ? {
          intentFilters: [
            {
              action: "VIEW",
              autoVerify: true,
              data: [
                { scheme: "https", host: webHost, pathPrefix: "/l" },
                { scheme: "https", host: webHost, pathPrefix: "/listing" },
              ],
              category: ["BROWSABLE", "DEFAULT"],
            },
          ],
        }
      : {}),
  },
});
