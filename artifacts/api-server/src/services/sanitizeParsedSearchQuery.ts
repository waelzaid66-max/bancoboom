import type { ParsedSearchQuery } from "./SearchService";
import { allowCommodityMaterialFilter } from "./allowCommodityMaterialFilter";

const FACILITIES_SUBTYPES = new Set(["factory", "warehouse", "land"]);

function isFacilitiesOnly(types?: readonly string[]): boolean {
  return !!types?.length && types.every((t) => FACILITIES_SUBTYPES.has(t));
}

function allowsIndustry(f: ParsedSearchQuery): boolean {
  if (f.category !== "industrial") return false;
  const types = f.industrial_type;
  if (!types?.length) return true;
  if (isFacilitiesOnly(types)) return true;
  return types.some((t) => t === "machine" || t === "production_line");
}

function allowsOrigin(f: ParsedSearchQuery): boolean {
  if (f.category === "car") return true;
  if (f.category !== "industrial") return false;
  const types = f.industrial_type;
  if (!types?.length) return false;
  return !isFacilitiesOnly(types);
}

function allowsInstallment(f: ParsedSearchQuery): boolean {
  return f.category === "car" || f.category === "real_estate" || f.category === undefined;
}

/**
 * Strip cross-section attribute filters that clients must not apply but crafted
 * queries could still send. Mirrors mobile `buildSearchParams` section gates.
 */
export function sanitizeParsedSearchQuery(f: ParsedSearchQuery): ParsedSearchQuery {
  const out: ParsedSearchQuery = { ...f };
  const cat = out.category;

  if (cat === "car") {
    delete out.property_type;
    delete out.finishing_type;
    delete out.compound;
    delete out.furnished;
    delete out.offer_type;
    delete out.rental_term;
    delete out.industry;
    delete out.material;
  } else if (cat === "real_estate") {
    delete out.fuel_type;
    delete out.transmission;
    delete out.brand;
    delete out.model;
    delete out.min_year;
    delete out.max_year;
    delete out.industry;
    delete out.origin_type;
    delete out.material;
  } else if (cat === "industrial") {
    delete out.fuel_type;
    delete out.transmission;
    delete out.brand;
    delete out.model;
    delete out.min_year;
    delete out.max_year;
    delete out.property_type;
    delete out.finishing_type;
    delete out.compound;
    delete out.furnished;
    delete out.offer_type;
    delete out.rental_term;
  }

  if (out.rental_term && out.offer_type !== "rent") {
    delete out.rental_term;
  }

  if (!allowsInstallment(out)) {
    delete out.has_installment;
    if (out.payment_plan === "installment") delete out.payment_plan;
  }

  if (!allowsIndustry(out)) delete out.industry;
  if (!allowsOrigin(out)) delete out.origin_type;
  if (!allowCommodityMaterialFilter(out)) delete out.material;

  return out;
}
