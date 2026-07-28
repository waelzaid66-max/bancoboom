/**
 * Phase 6 — website plug (kill-switch).
 *
 * Runtime-first so ops can unplug without rebuilding the image:
 *   WEB_PLUG_ENABLED=false
 *
 * Optional build-time override (previews / static bake):
 *   NEXT_PUBLIC_WEB_PLUG_ENABLED=false
 *
 * Default when unset: plugged IN (site serves normally) — fail-open for consumers.
 * Explicit false/0: plugged OUT (maintenance surface).
 */

function parseFlag(value: string | undefined): boolean | null {
  if (value === undefined || value === "") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "off") {
    return false;
  }
  if (normalized === "true" || normalized === "1" || normalized === "on") {
    return true;
  }
  return null;
}

/** True when the consumer website plug is connected (normal traffic). */
export function isWebPlugEnabled(): boolean {
  const runtime = parseFlag(process.env.WEB_PLUG_ENABLED);
  if (runtime !== null) return runtime;

  const baked = parseFlag(process.env.NEXT_PUBLIC_WEB_PLUG_ENABLED);
  if (baked !== null) return baked;

  return true;
}

export function webPlugStatus(): "on" | "off" {
  return isWebPlugEnabled() ? "on" : "off";
}

export function isWebPlugExemptPath(pathname: string): boolean {
  // Keep in sync with isWebHealthPath() in web-health.ts (avoid circular import).
  if (
    pathname === "/api/health" ||
    pathname.startsWith("/api/health/") ||
    pathname === "/api/healthz" ||
    pathname.startsWith("/api/healthz/")
  ) {
    return true;
  }
  if (pathname === "/maintenance" || pathname === "/en/maintenance") {
    return true;
  }
  if (pathname === "/robots.txt" || pathname === "/manifest.webmanifest") {
    return true;
  }
  return false;
}

export function maintenancePathFor(pathname: string): "/maintenance" | "/en/maintenance" {
  return pathname === "/en" || pathname.startsWith("/en/") ? "/en/maintenance" : "/maintenance";
}
