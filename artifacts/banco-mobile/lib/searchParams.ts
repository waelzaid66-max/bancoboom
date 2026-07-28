import {
  searchListings,
  getMapClusters,
  type SearchListingsCategory,
  type SearchListingsFuelType,
  type SearchListingsTransmission,
  type SearchListingsIndustry,
  type SearchListingsOriginType,
} from "@workspace/api-client-react";

import {
  type Category,
  type IndustrialType,
  apiCategoryFor,
  industrialGroupForCategory,
} from "@/components/CategoryTabs";
import { engineByKey } from "@/constants/engines";
import { DEFAULT_MARKET_COUNTRY } from "@/constants/listingCreateTaxonomy";
import { DEFAULT_NEAR_RADIUS_KM } from "@/lib/nearMe";

/** Result ordering — mirrors the backend SearchListingsSort enum 1:1. */
export type SearchSort =
  | "recommended"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "popular";

export type PaymentType = "any" | "installment";

/** Browse sale listings vs buyer requests (maps to API is_request). */
export type ListingMode = "all" | "sale" | "buy";

/**
 * The committed search criteria for the Search mini-app. This is the single
 * source of truth the data hook fetches from — every field maps to a real,
 * backend-supported query param (see api-server SearchService). Free-text edits
 * and bottom-sheet edits flow through here before they ever hit the network, so
 * the tab search and the pushed /search-results browse produce identical params.
 */
export interface SearchCriteria {
  q: string;
  category: Category;
  /** Selected engine chip key within the category ("all" = no engine filter). */
  engineKey: string;
  sort: SearchSort;
  minPrice: string;
  maxPrice: string;
  location: string;
  paymentType: PaymentType;
  /** Real-estate rental system (specs.rental_term) — furnished_daily / new_law /
   *  old_law / annual_contract; null = any. */
  rentalTerm: string | null;
  /** Real-estate property type (specs.property_type) — apartment / villa /
   *  studio / chalet / …; null = any. Drives the Booking & Stays type tabs. */
  propertyType: string | null;
  /** Car brand/model — matched against the English listing title server-side. */
  brand: string | null;
  model: string | null;
  /** Car attribute filters. */
  fuelType: SearchListingsFuelType | null;
  transmission: SearchListingsTransmission | null;
  minYear: string;
  maxYear: string;
  /** Industrial attribute filters. */
  industry: SearchListingsIndustry | null;
  originType: SearchListingsOriginType | null;
  /** Commodity material filter — materials company only (never facilities/cars/RE). */
  material: string | null;
  /** Facilities/materials sub-type within the industrial group ("all" = whole group). */
  industrialType: IndustrialType;
  /** UI-only market selector for rental-term chips (not sent to API). */
  marketCountry: string;
  /** Near-me geo filter — all three coords + radius sent when enabled. */
  nearMeEnabled: boolean;
  nearLat: number | null;
  nearLng: number | null;
  nearRadiusKm: number;
  /** Sale vs buyer-request filter — maps to API is_request when not "all". */
  listingMode: ListingMode;
}

export const DEFAULT_CRITERIA: SearchCriteria = {
  q: "",
  category: "all",
  engineKey: "all",
  sort: "recommended",
  minPrice: "",
  maxPrice: "",
  location: "",
  paymentType: "any",
  rentalTerm: null,
  propertyType: null,
  brand: null,
  model: null,
  fuelType: null,
  transmission: null,
  minYear: "",
  maxYear: "",
  industry: null,
  originType: null,
  material: null,
  industrialType: "all",
  marketCountry: DEFAULT_MARKET_COUNTRY,
  nearMeEnabled: false,
  nearLat: null,
  nearLng: null,
  nearRadiusKm: DEFAULT_NEAR_RADIUS_KM,
  listingMode: "all",
};

/**
 * True when the criteria express any real intent to filter/search. When false
 * the mini-app shows the Discover surface instead of issuing a network request —
 * an empty query with default filters is never a "no results" state, it's idle.
 */
export function hasActiveCriteria(c: SearchCriteria): boolean {
  return (
    !!c.q.trim() ||
    c.category !== "all" ||
    c.engineKey !== "all" ||
    c.sort !== "recommended" ||
    !!c.minPrice ||
    !!c.maxPrice ||
    !!c.location ||
    c.paymentType !== "any" ||
    !!c.rentalTerm ||
    !!c.propertyType ||
    !!c.brand ||
    !!c.model ||
    !!c.fuelType ||
    !!c.transmission ||
    !!c.minYear ||
    !!c.maxYear ||
    !!c.industry ||
    !!c.originType ||
    !!c.material ||
    c.industrialType !== "all" ||
    c.nearMeEnabled ||
    c.listingMode !== "all"
  );
}

/**
 * Stable identity of the *filter set* (everything except pagination). The hook
 * resets the cursor and re-fetches only when this changes, so paginating never
 * re-triggers a reset and identical re-commits are cheap to detect.
 */
export function criteriaKey(c: SearchCriteria): string {
  return JSON.stringify([
    c.q.trim(),
    c.category,
    c.engineKey,
    c.sort,
    c.minPrice,
    c.maxPrice,
    c.location.trim(),
    c.paymentType,
    c.rentalTerm,
    c.propertyType,
    c.brand,
    c.model,
    c.fuelType,
    c.transmission,
    c.minYear,
    c.maxYear,
    c.industry,
    c.originType,
    c.material,
    c.industrialType,
    c.marketCountry,
    c.nearMeEnabled,
    c.nearLat,
    c.nearLng,
    c.nearRadiusKm,
    c.listingMode,
  ]);
}

type SearchParams = Parameters<typeof searchListings>[0];

/**
 * Translates committed criteria into the searchListings query params. Centralised
 * so the tab and the pushed browse screen stay in lockstep (category→api mapping,
 * industrial-group expansion, engine param merge, sort, attribute filters).
 */
/** When section/engine/market changes, exit sticky map (not on every filter tweak). */
export function mapAnchorKey(c: SearchCriteria): string {
  return `${c.category}|${c.engineKey}|${c.marketCountry}`;
}

/**
 * Section-scoped attributes cleared when the browse category changes. Prevents
 * fuel/rent/material leaking across car ↔ real-estate ↔ facilities ↔ materials.
 * Mirrors @workspace/search-contract's CLEAR_SECTION_ATTRS 1:1.
 */
export const CLEAR_SECTION_ATTRS: Partial<SearchCriteria> = {
  engineKey: "all",
  brand: null,
  model: null,
  fuelType: null,
  transmission: null,
  minYear: "",
  maxYear: "",
  industry: null,
  originType: null,
  material: null,
  industrialType: "all",
  rentalTerm: null,
  /** RE type-strip selection (Stay-parallel); must not leak across sections. */
  propertyType: null,
};

export function buildSearchParams(
  c: SearchCriteria,
  cursor?: string,
  limit = 30,
): SearchParams {
  const sp: SearchParams = { limit };

  if (c.q.trim()) sp.q = c.q.trim();

  const apiCat = apiCategoryFor(c.category);
  if (apiCat) sp.category = apiCat as SearchListingsCategory;

  // Industrial groups (facilities/materials) share the `industrial` category and
  // split by industrial_type — filter by the whole group so paginated section
  // results never false-empty and the two groups never bleed together.
  const group = industrialGroupForCategory(c.category);
  if (group) {
    sp.industrial_type =
      c.industrialType === "all" ? group.join(",") : c.industrialType;
  }

  // Engine chip params (condition / payment_plan / property_type / compound / …).
  const engine = engineByKey(c.category, c.engineKey);
  if (engine) Object.assign(sp, engine.params);

  // Explicit property-type selection (Booking & Stays type tabs). Assigned
  // AFTER engine params so a user's explicit choice wins over an engine preset.
  // SearchParams already includes property_type from generated API schemas (Claude M-2).
  if (c.category === "real_estate" && c.propertyType) {
    sp.property_type = c.propertyType;
  }

  // recommended is the server default — omit it to keep params minimal.
  if (c.sort !== "recommended") sp.sort = c.sort;

  const minNum = Number(c.minPrice);
  if (c.minPrice && !Number.isNaN(minNum)) sp.min_price = minNum;
  const maxNum = Number(c.maxPrice);
  if (c.maxPrice && !Number.isNaN(maxNum)) sp.max_price = maxNum;

  if (c.location.trim()) sp.location = c.location.trim();
  if (c.paymentType === "installment") sp.has_installment = true;
  if (c.rentalTerm) sp.rental_term = c.rentalTerm;

  if (c.brand) sp.brand = c.brand;
  if (c.model) sp.model = c.model;
  if (c.fuelType) sp.fuel_type = c.fuelType;
  if (c.transmission) sp.transmission = c.transmission;

  const minY = Number(c.minYear);
  if (c.minYear && !Number.isNaN(minY)) sp.min_year = minY;
  const maxY = Number(c.maxYear);
  if (c.maxYear && !Number.isNaN(maxY)) sp.max_year = maxY;

  if (c.industry) sp.industry = c.industry;
  if (c.originType) sp.origin_type = c.originType;

  // Commodity material — materials company only (never facilities / cars / RE).
  if (c.category === "materials" && c.material) {
    (sp as SearchParams & { material?: string }).material = c.material;
  }

  // Sale vs buyer-request browse — mirrors @workspace/search-contract.
  if (c.listingMode === "sale") {
    (sp as SearchParams & { is_request?: boolean }).is_request = false;
  }
  if (c.listingMode === "buy") {
    (sp as SearchParams & { is_request?: boolean }).is_request = true;
  }

  if (
    c.nearMeEnabled &&
    c.nearLat != null &&
    c.nearLng != null &&
    c.nearRadiusKm > 0
  ) {
    sp.near_lat = c.nearLat;
    sp.near_lng = c.nearLng;
    sp.radius_km = c.nearRadiusKm;
  }

  if (cursor) sp.cursor = cursor;
  return sp;
}

type MapClusterParams = Parameters<typeof getMapClusters>[0];

/** The visible map bounding box + zoom that drive server-side clustering. */
export interface MapViewport {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  zoom: number;
}

/**
 * Map-cluster query params for the current viewport. Reuses buildSearchParams so
 * the map honours the EXACT same filter set as the list (category, engine chip,
 * price, offer_type, brand, …) and can never drift from it — it just drops
 * pagination and adds the visible bounding box + zoom the /search/map endpoint
 * clusters by.
 */
export function buildMapClusterParams(
  c: SearchCriteria,
  viewport: MapViewport,
): MapClusterParams {
  const filters: Record<string, unknown> = { ...buildSearchParams(c) };
  delete filters.limit;
  delete filters.cursor;
  return { ...filters, ...viewport } as MapClusterParams;
}
