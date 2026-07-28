/**
 * Server-side trust signals (see api-server BffService.buildTrustSignal):
 * "Top Dealer", "Verified Dealer", "Verified Company", "Verified Seller",
 * and "Private Seller" (the only unverified case).
 *
 * "Top Dealer" does not contain the word "verified", so a naive
 * includes("verified") check would wrongly exclude the highest-quality
 * verified dealers. This single predicate keeps the card and the
 * "Verified Sellers" feed rail in sync and truthful.
 */
export function isVerifiedSignal(trustSignal?: string | null): boolean {
  if (!trustSignal) return false;
  const s = trustSignal.toLowerCase();
  return s.includes("verified") || s.includes("top dealer");
}

/**
 * Extracts the numeric cash value from a server-formatted price_display.
 * The API (BffService/ListingService formatEGP) emits K/M-suffixed strings:
 * "2M EGP" → 2_000_000, "1.25M EGP" → 1_250_000, "850K EGP" → 850_000,
 * "500 EGP" → 500. Returns null when no positive amount can be parsed. Used to
 * order the "Best Deals" rail by real price; no fabricated discount is invented.
 */
export function parsePriceValue(priceDisplay?: string | null): number | null {
  if (!priceDisplay) return null;
  const match = priceDisplay.match(/([\d.,]+)\s*([MK])?/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(num) || num <= 0) return null;
  const unit = match[2]?.toUpperCase();
  const multiplier = unit === "M" ? 1_000_000 : unit === "K" ? 1_000 : 1;
  return num * multiplier;
}

/**
 * Case-insensitive match between a listing location string and a reference
 * city. Handles "Nasr City, Cairo" ⊇ "Cairo" in either direction.
 */
export function locationMatchesCity(
  location?: string | null,
  city?: string | null
): boolean {
  if (!location || !city) return false;
  const a = location.toLowerCase();
  const b = city.toLowerCase();
  return a.includes(b) || b.includes(a);
}

/** The most frequently occurring location string in a feed pool. */
export function mostCommonLocation(
  pool: { location?: string | null }[]
): string | null {
  const counts = new Map<string, number>();
  for (const it of pool) {
    const key = it.location?.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}
