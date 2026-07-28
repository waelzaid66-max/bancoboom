/**
 * Cross-origin trust policy for the BANCO API.
 *
 * Only BANCO-owned origins may make credentialed cross-origin browser
 * requests. The allowlist is built from explicit configuration plus this
 * Repl's own domains:
 *   - origins listed in CORS_ALLOWED_ORIGINS (comma/whitespace separated) —
 *     production deployment domains and custom domains
 *   - this Repl's own Replit domains from REPLIT_DOMAINS / REPLIT_DEV_DOMAIN
 *     (bare hostnames, served over HTTPS) — dev previews + Replit deployment
 *   - localhost / 127.0.0.1 / [::1] — local development only (never in prod)
 *
 * We deliberately do NOT trust every *.replit.app / *.replit.dev / *.repl.co
 * origin. Those are shared, third-party-registrable domains, so trusting the
 * whole suffix lets ANY Replit-hosted page read a signed-in victim's
 * credentialed API responses (cross-origin data theft) and trigger
 * cross-origin state changes.
 *
 * Requests without an Origin header (native mobile apps, server-to-server,
 * curl/health probes) are allowed — CORS only governs browser cross-origin
 * access, and the native app authenticates with a bearer token, not cookies.
 */

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Normalize an origin or bare host into a canonical `scheme://host[:port]`. */
function normalizeOrigin(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    // Bare hostnames (e.g. REPLIT_DOMAINS entries) carry no scheme — Replit
    // serves them over HTTPS.
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).origin.toLowerCase();
  } catch {
    return null;
  }
}

function buildAllowedOrigins(): Set<string> {
  const out = new Set<string>();
  for (const value of [
    ...splitList(process.env.CORS_ALLOWED_ORIGINS),
    ...splitList(process.env.REPLIT_DOMAINS),
    ...splitList(process.env.REPLIT_DEV_DOMAIN),
  ]) {
    const norm = normalizeOrigin(value);
    if (norm) out.add(norm);
  }
  return out;
}

// Computed once at startup from the environment.
const ALLOWED_ORIGINS = buildAllowedOrigins();

/**
 * Local development only — never a deployed/production environment. We require
 * BOTH signals because NODE_ENV is not guaranteed to be set to "production" in a
 * Replit deployment, so we additionally fail closed on REPLIT_DEPLOYMENT.
 */
function isDevEnvironment(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.REPLIT_DEPLOYMENT) return false;
  return true;
}

function isLocalhostOrigin(origin: string): boolean {
  if (!isDevEnvironment()) return false;
  try {
    return LOCALHOST_HOSTNAMES.has(new URL(origin).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * True when the browser `Origin` is a BANCO-owned origin (or absent, i.e. a
 * non-browser client). Used by the `cors` middleware to decide whether to
 * reflect `Access-Control-Allow-Origin`.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  const norm = normalizeOrigin(origin);
  if (norm && ALLOWED_ORIGINS.has(norm)) return true;
  return isLocalhostOrigin(origin);
}

/** True when `origin`'s host matches the request's own `Host` header. */
export function isSameOrigin(origin: string, host: string | undefined): boolean {
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.trim().toLowerCase();
  } catch {
    return false;
  }
}

/**
 * CSRF defense-in-depth: decide whether a state-changing request must be
 * rejected because it carries a cross-origin browser `Origin`.
 *
 * CORS stops attackers from READING credentialed responses, but a cross-origin
 * "simple" request (e.g. a POST with no JSON body / no custom headers) is NOT
 * preflighted, so the browser still sends it with the victim's cookies and the
 * side effect runs. We therefore reject unsafe-method requests whose Origin is
 * present but is neither allowlisted nor same-origin with the target host.
 *
 *   - No Origin header (native mobile bearer client, server-to-server) → allow.
 *   - Safe methods (GET/HEAD/OPTIONS) → never rejected here; reads are governed
 *     by CORS and the OPTIONS preflight is handled by the cors middleware.
 *   - Same-origin browser mutations pass via host match without needing the
 *     deployment origin to be pre-configured.
 */
export function shouldRejectUnsafeOrigin(
  method: string,
  origin: string | undefined,
  host: string | undefined,
): boolean {
  if (!UNSAFE_METHODS.has(method.toUpperCase())) return false;
  if (!origin) return false;
  if (isAllowedOrigin(origin)) return false;
  if (isSameOrigin(origin, host)) return false;
  return true;
}
