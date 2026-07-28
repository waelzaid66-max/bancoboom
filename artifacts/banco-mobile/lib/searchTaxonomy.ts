/**
 * Search-layer adapters over listing taxonomy — keeps multi-country rental
 * regimes aligned between create and browse without duplicating MARKET_COUNTRIES.
 */
import {
  DEFAULT_MARKET_COUNTRY,
  MARKET_COUNTRIES,
  rentalTermsForCountry,
} from "@/constants/listingCreateTaxonomy";

export { DEFAULT_MARKET_COUNTRY, MARKET_COUNTRIES };

export function rentalTermsForSearch(marketCountry: string) {
  return rentalTermsForCountry(marketCountry);
}

/** Drop a rental_term filter that is invalid for the selected market. */
export function sanitizeRentalTermForMarket(
  term: string | null,
  marketCountry: string,
): string | null {
  if (!term) return null;
  const allowed = rentalTermsForCountry(marketCountry);
  return allowed.some((t) => t.value === term) ? term : null;
}

export function marketCountryLabel(
  code: string,
  isRTL: boolean,
): string {
  const row = MARKET_COUNTRIES.find((c) => c.value === code);
  if (!row) return code;
  return isRTL ? row.ar : row.en;
}

/**
 * Initial Leaflet framing for an empty/default map keyed by market ISO.
 * Restored after 93b650b wiped it (originally b68c8af): without it every market
 * silently framed Egypt, so switching to Saudi/UAE/Morocco opened a map of the
 * wrong country. Covers exactly the MARKET_COUNTRIES catalog (21 markets);
 * Egypt stays the fallback for an unknown code.
 */
export function marketCountryMapCenter(code: string): {
  lat: number;
  lng: number;
  zoom: number;
} {
  const centers: Record<string, { lat: number; lng: number; zoom: number }> = {
    EG: { lat: 26.8, lng: 30.8, zoom: 6 },
    SA: { lat: 24.0, lng: 45.0, zoom: 5 },
    AE: { lat: 24.3, lng: 54.4, zoom: 7 },
    KW: { lat: 29.3, lng: 47.5, zoom: 8 },
    QA: { lat: 25.3, lng: 51.5, zoom: 9 },
    BH: { lat: 26.0, lng: 50.5, zoom: 10 },
    OM: { lat: 21.5, lng: 57.0, zoom: 6 },
    JO: { lat: 31.2, lng: 36.5, zoom: 7 },
    IQ: { lat: 33.2, lng: 44.0, zoom: 6 },
    LY: { lat: 27.0, lng: 17.0, zoom: 5 },
    LB: { lat: 33.85, lng: 35.85, zoom: 8 },
    MA: { lat: 31.8, lng: -7.1, zoom: 5 },
    TN: { lat: 34.0, lng: 9.5, zoom: 6 },
    SD: { lat: 15.5, lng: 32.5, zoom: 5 },
    TR: { lat: 39.0, lng: 35.0, zoom: 5 },
    FR: { lat: 46.5, lng: 2.5, zoom: 5 },
    DE: { lat: 51.1, lng: 10.4, zoom: 5 },
    ES: { lat: 40.2, lng: -3.7, zoom: 5 },
    IT: { lat: 42.5, lng: 12.5, zoom: 5 },
    GB: { lat: 54.0, lng: -2.0, zoom: 5 },
    US: { lat: 39.8, lng: -98.5, zoom: 4 },
  };
  return centers[code] ?? centers.EG;
}
