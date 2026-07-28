import {
  searchListings,
  type SearchListingsCategory,
} from "@workspace/api-client-react";
import {
  apiCategoryFor,
  industrialGroupForCategory,
} from "@workspace/taxonomy/categories";
import { engineByKey } from "./engines";
import type { SearchCriteria } from "./types";

type SearchParams = NonNullable<Parameters<typeof searchListings>[0]>;

/**
 * Each browse category is its own product company. Stale deep-link / shared
 * criteria must never leak car fuel onto real-estate, rental systems onto
 * sale/villa chips, or factory industry onto raw-material commodities.
 */
function isCar(c: SearchCriteria): boolean {
  return c.category === "car";
}
function isRealEstate(c: SearchCriteria): boolean {
  return c.category === "real_estate";
}
function isIndustrial(c: SearchCriteria): boolean {
  return c.category === "facilities" || c.category === "materials";
}

/** Rent-regime filter only with explicit rent engine (offer_type=rent). */
function isRentBrowse(c: SearchCriteria): boolean {
  if (!isRealEstate(c)) return false;
  const engine = engineByKey(c.category, c.engineKey);
  return engine?.params.offer_type === "rent";
}

/** Factory-sector industry never applies to commodity raw_material browse. */
function allowIndustry(c: SearchCriteria): boolean {
  if (!isIndustrial(c)) return false;
  if (c.category === "materials") {
    return (
      c.industrialType === "machine" || c.industrialType === "production_line"
    );
  }
  return true;
}

/**
 * Local/imported origin: cars (engine or criteria), materials logistics, and
 * equipment subtypes — not bare facilities (factory/warehouse/land assets).
 */
function allowOriginCriteria(c: SearchCriteria): boolean {
  if (isCar(c)) return true;
  if (c.category === "materials") return true;
  return false;
}

export function buildSearchParams(
  c: SearchCriteria,
  cursor?: string,
  limit = 30,
): SearchParams {
  const sp: SearchParams = { limit };

  if (c.q.trim()) sp.q = c.q.trim();

  const apiCat = apiCategoryFor(c.category);
  if (apiCat) sp.category = apiCat as SearchListingsCategory;

  const group = industrialGroupForCategory(c.category);
  if (group) {
    sp.industrial_type =
      c.industrialType === "all" ? group.join(",") : c.industrialType;
  }

  const engine = engineByKey(c.category, c.engineKey);
  if (engine) Object.assign(sp, engine.params);

  // Explicit property-type selection (RE / Stay type strips). Assigned AFTER
  // engine params so a user's explicit choice wins over an engine preset.
  // Mirrors mobile `artifacts/banco-mobile/lib/searchParams.ts` (Claude M-1).
  if (isRealEstate(c) && c.propertyType) {
    sp.property_type = c.propertyType;
  }

  if (c.sort !== "recommended") sp.sort = c.sort;

  const minNum = Number(c.minPrice);
  if (c.minPrice && !Number.isNaN(minNum)) sp.min_price = minNum;
  const maxNum = Number(c.maxPrice);
  if (c.maxPrice && !Number.isNaN(maxNum)) sp.max_price = maxNum;

  if (c.location.trim()) sp.location = c.location.trim();
  // Installment is a car / real-estate financing axis — never emit for
  // facilities/materials even if stale criteria still says installment.
  if (
    c.paymentType === "installment" &&
    (c.category === "car" ||
      c.category === "real_estate" ||
      c.category === "all")
  ) {
    sp.has_installment = true;
  }
  if (c.marketCountry.trim()) {
    sp.market_country = c.marketCountry.trim().toUpperCase();
  }

  // Section-gated attributes — never trust stale criteria from URL/deep links.
  if (isRealEstate(c) && c.rentalTerm && isRentBrowse(c)) {
    sp.rental_term = c.rentalTerm;
  }

  if (isCar(c)) {
    if (c.brand) sp.brand = c.brand;
    if (c.model) sp.model = c.model;
    if (c.fuelType) sp.fuel_type = c.fuelType;
    if (c.transmission) sp.transmission = c.transmission;
    const minY = Number(c.minYear);
    if (c.minYear && !Number.isNaN(minY)) sp.min_year = minY;
    const maxY = Number(c.maxYear);
    if (c.maxYear && !Number.isNaN(maxY)) sp.max_year = maxY;
  }

  if (allowIndustry(c) && c.industry) sp.industry = c.industry;

  // Origin axis: car import engine already assigned via engine.params; materials
  // (and car criteria latch) may add originType. Facilities never own this axis.
  if (allowOriginCriteria(c) && c.originType) {
    sp.origin_type = c.originType;
  }
  if (c.category === "facilities") {
    delete (sp as { origin_type?: string }).origin_type;
  }

  // Commodity material — materials company only (never facilities / cars / RE).
  if (c.category === "materials" && c.material) {
    (sp as SearchParams & { material?: string }).material = c.material;
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

  if (c.listingMode === "sale") sp.is_request = false;
  if (c.listingMode === "buy") sp.is_request = true;

  if (cursor) sp.cursor = cursor;
  return sp;
}
