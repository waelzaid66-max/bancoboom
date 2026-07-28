import { webPlugStatus } from "./web-plug-config";

/** Shared JSON body for /api/health and /api/healthz probes. */
export function buildWebHealthPayload() {
  return {
    status: "ok" as const,
    surface: "banco-web" as const,
    plug: webPlugStatus(),
    wave: "phase8-soft-launch",
    ts: new Date().toISOString(),
  };
}

/** Paths that must stay up when the website plug is OFF. */
export function isWebHealthPath(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname.startsWith("/api/health/") ||
    pathname === "/api/healthz" ||
    pathname.startsWith("/api/healthz/")
  );
}
