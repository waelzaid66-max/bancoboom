import { useEffect, useState } from "react";

/**
 * Which social sign-in providers this Clerk tenant *actually* has enabled.
 *
 * Why this exists: the auth sheet used to render Google / Facebook / Apple
 * buttons unconditionally. The BANCO production tenant (clerk.banco.today) has
 * an EMPTY social provider dictionary — email+password and email OTP only — so
 * every tap on those buttons made `startSSOFlow` throw and the user saw a bare
 * "Sign-in failed. Please try again." dialog with no way to succeed.
 *
 * We do NOT hardcode the buttons away: that would mean re-editing the app the
 * day the owner enables Google in the Clerk Dashboard. Instead we read the
 * tenant's own public environment document (the same one clerk-js loads on
 * boot) and render only the strategies it reports as enabled.
 *
 * Fails CLOSED: if the key is unreadable or the request fails, we return no
 * providers, so we never show a button we can't honour.
 */

const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Minimal base64 decode. Hermes does not guarantee a global `atob`, and pulling
 * a polyfill in for ~30 characters of key material is not worth the dependency.
 */
function decodeBase64(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, "");
  let out = "";
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((clean[i + 2] ? B64.indexOf(clean[i + 2]) : 0) << 6) |
      (clean[i + 3] ? B64.indexOf(clean[i + 3]) : 0);
    out += String.fromCharCode((n >> 16) & 0xff);
    if (clean[i + 2]) out += String.fromCharCode((n >> 8) & 0xff);
    if (clean[i + 3]) out += String.fromCharCode(n & 0xff);
  }
  return out;
}

/**
 * A Clerk publishable key is `pk_live_<base64(frontendApiHost + "$")>`.
 * Returns null when the key is missing or does not decode to a hostname.
 */
export function frontendApiFromPublishableKey(key: string): string | null {
  if (!key) return null;
  const payload = key.replace(/^pk_(live|test)_/, "");
  if (payload === key) return null;
  let host: string;
  try {
    host = decodeBase64(payload).replace(/\$+$/, "");
  } catch {
    return null;
  }
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? host : null;
}

export type SocialProvider = "google" | "apple" | "facebook";

const SUPPORTED: SocialProvider[] = ["google", "apple", "facebook"];

// Resolved once per app session — the tenant's provider set does not change
// mid-session, and the auth sheet can mount many times.
let cache: SocialProvider[] | null = null;
let inflight: Promise<SocialProvider[]> | null = null;

async function fetchEnabledProviders(): Promise<SocialProvider[]> {
  const fapi = frontendApiFromPublishableKey(
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""
  );
  if (!fapi) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://${fapi}/v1/environment?__clerk_api_version=2024-10-01&_clerk_js_version=5.0.0`,
      { signal: controller.signal }
    );
    if (!res.ok) return [];
    const body = (await res.json()) as {
      user_settings?: {
        social?: Record<string, { enabled?: boolean; strategy?: string }>;
      };
    };
    const social = body.user_settings?.social ?? {};
    return SUPPORTED.filter((p) => social[`oauth_${p}`]?.enabled === true);
  } catch {
    // Offline, DNS failure, abort — fail closed.
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function useSocialProviders(): {
  providers: SocialProvider[];
  resolved: boolean;
} {
  const [providers, setProviders] = useState<SocialProvider[]>(cache ?? []);
  const [resolved, setResolved] = useState(cache !== null);

  useEffect(() => {
    if (cache !== null) return;
    let active = true;
    if (!inflight) inflight = fetchEnabledProviders();
    inflight
      .then((list) => {
        cache = list;
        if (!active) return;
        setProviders(list);
        setResolved(true);
      })
      .catch(() => {
        if (active) setResolved(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { providers, resolved };
}
