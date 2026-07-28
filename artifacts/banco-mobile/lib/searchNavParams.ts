/**
 * Parse Search-tab navigation params (expo-router) into committed SearchCriteria.
 * Accepts snake_case (web parity) and legacy camelCase mobile keys.
 */
import {
  parseSearchCriteriaFromUrl,
  buildSearchUrlParams,
  type SearchCriteria,
} from "@workspace/search-contract";

type NavValue = string | string[] | undefined;
type NavRecord = Record<string, NavValue>;

const SKIP_KEYS = new Set(["ts"]);

/** Legacy camelCase keys emitted by older mobile screens. */
const CAMEL_TO_SNAKE: Record<string, string> = {
  minPrice: "min_price",
  maxPrice: "max_price",
  paymentType: "payment_type",
  engineKey: "engine",
  rentalTerm: "rental_term",
  fuelType: "fuel_type",
  minYear: "min_year",
  maxYear: "max_year",
  originType: "origin_type",
  industrialType: "industrial_type",
  marketCountry: "market_country",
  nearLat: "near_lat",
  nearLng: "near_lng",
  nearRadiusKm: "radius_km",
  listingMode: "listing_mode",
};

const SEARCH_PARAM_KEYS = new Set([
  "q",
  "category",
  "engine",
  "sort",
  "min_price",
  "max_price",
  "location",
  "payment_type",
  "rental_term",
  "brand",
  "model",
  "fuel_type",
  "transmission",
  "min_year",
  "max_year",
  "industry",
  "origin_type",
  "material",
  "industrial_type",
  "market_country",
  "near_lat",
  "near_lng",
  "radius_km",
  "listing_mode",
  ...Object.keys(CAMEL_TO_SNAKE),
]);

function normalizeNavRecord(params: NavRecord): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (SKIP_KEYS.has(key) || value == null) continue;
    const snake = CAMEL_TO_SNAKE[key] ?? key;
    out[snake] = Array.isArray(value) ? value[0] : String(value);
  }
  return out;
}

export function hasIncomingSearchNavParams(params: NavRecord): boolean {
  return Object.keys(params).some((key) => {
    if (SKIP_KEYS.has(key)) return false;
    const snake = CAMEL_TO_SNAKE[key] ?? key;
    return SEARCH_PARAM_KEYS.has(key) || SEARCH_PARAM_KEYS.has(snake);
  });
}

export function parseMobileSearchNavParams(params: NavRecord): SearchCriteria {
  return parseSearchCriteriaFromUrl(normalizeNavRecord(params));
}

/** Flat string map for expo-router `params` (saved searches, assistant). */
export function searchCriteriaToNavParams(
  criteria: SearchCriteria,
): Record<string, string> {
  const qs = buildSearchUrlParams(criteria);
  const flat: Record<string, string> = { ts: String(Date.now()) };
  // Use forEach (present on every URLSearchParams typing, Node + DOM) rather than
  // entries()/for-of, which needs DOM.Iterable — absent under expo/tsconfig.base
  // on CI (Linux), so the iterator form typechecks locally but fails there.
  qs.forEach((value: string, key: string) => {
    flat[key] = value;
  });
  return flat;
}
