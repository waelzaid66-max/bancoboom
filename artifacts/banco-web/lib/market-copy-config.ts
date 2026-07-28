/**
 * Phase 4 — BANCO Market copy inside banco-web (not dealer-os).
 * Default OFF so production nav keeps linking the classic Market surface.
 * Staging enables via NEXT_PUBLIC_WEB_MARKET_COPY=true.
 */
export function isWebMarketCopyEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WEB_MARKET_COPY === "true";
}
