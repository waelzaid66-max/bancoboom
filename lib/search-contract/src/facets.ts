import type {
  SearchListingsFuelType,
  SearchListingsIndustry,
  SearchListingsOriginType,
  SearchListingsTransmission,
} from "@workspace/api-client-react";
import type { Category, IndustrialType } from "@workspace/taxonomy/categories";

import { enginesForCategory } from "./engines";
import { CLEAR_SECTION_ATTRS, type SearchCriteria } from "./types";

/**
 * Map a facet bucket click into committed search criteria (URL-safe).
 * Shared by web facets panel and any future mobile facet UX.
 */
export function applyFacetToCriteria(
  criteria: SearchCriteria,
  section: string,
  value: string,
): SearchCriteria {
  const next = { ...criteria };

  if (section === "category") {
    const cat = value as Category;
    if (
      cat === "car" ||
      cat === "real_estate" ||
      cat === "facilities" ||
      cat === "materials" ||
      cat === "all"
    ) {
      // Same wipe as SearchControls / mobile category tabs — never keep fuel,
      // rent term, material, or industry when the browse company changes.
      Object.assign(next, CLEAR_SECTION_ATTRS);
      next.category = cat;
    }
    return next;
  }

  if (section === "condition") {
    if (value === "new" || value === "used") {
      next.engineKey = value;
    }
    return next;
  }

  if (section === "offer_type") {
    if (value === "sale" || value === "rent") {
      next.engineKey = value;
      if (value === "sale") next.rentalTerm = null;
    }
    return next;
  }

  if (section === "payment_plan" || section === "payment") {
    const engines = enginesForCategory(next.category as Category) ?? [];
    const match = engines.find((e) => e.params.payment_plan === value);
    if (match) next.engineKey = match.key;
    return next;
  }

  if (section === "property_type") {
    // Prefer criteria.propertyType (composes with sale/rent engines) — same
    // axis as mobile RE/Stay type strips. Keep legacy engine-key mapping when
    // a property-type engine still exists for older web chips.
    next.propertyType = value;
    const engines = enginesForCategory(next.category as Category) ?? [];
    const match = engines.find((e) => e.params.property_type === value);
    if (match) next.engineKey = match.key;
    return next;
  }

  if (section === "industrial_type") {
    next.industrialType = value as IndustrialType;
    if (
      next.category === "materials" &&
      (value === "all" || value === "raw_material")
    ) {
      next.industry = null;
    }
    if (
      next.category === "materials" &&
      value !== "all" &&
      value !== "raw_material"
    ) {
      next.material = null;
    }
    return next;
  }

  if (section === "fuel_type") {
    if (next.category !== "car") return next;
    next.fuelType = value as SearchListingsFuelType;
    next.engineKey = "all";
    return next;
  }

  if (section === "transmission") {
    if (next.category !== "car") return next;
    next.transmission = value as SearchListingsTransmission;
    next.engineKey = "all";
    return next;
  }

  if (section === "industry") {
    if (next.category !== "facilities" && next.category !== "materials") {
      return next;
    }
    if (
      next.category === "materials" &&
      (next.industrialType === "all" || next.industrialType === "raw_material")
    ) {
      return next;
    }
    next.industry = value as SearchListingsIndustry;
    return next;
  }

  if (section === "origin_type") {
    if (next.category !== "materials") return next;
    next.originType = value as SearchListingsOriginType;
    return next;
  }

  if (section === "material") {
    if (next.category !== "materials") return next;
    if (
      next.industrialType !== "all" &&
      next.industrialType !== "raw_material"
    ) {
      return next;
    }
    next.material = value;
    return next;
  }

  return next;
}

/** Facet bucket keys returned by GET /facets. */
export const FACET_SECTION_KEYS = [
  "category",
  "offer_type",
  "payment_plan",
  "property_type",
  "condition",
  "fuel_type",
  "transmission",
  "industrial_type",
  "industry",
  "origin_type",
  "material",
] as const;

export type FacetSectionKey = (typeof FACET_SECTION_KEYS)[number];

/**
 * Which facet sections belong to each browse company — mirrors mobile
 * FilterSheet gating so web never surfaces car fuel chips on real-estate.
 */
export function facetSectionsForCategory(
  category: Category,
): FacetSectionKey[] {
  switch (category) {
    case "car":
      return ["condition", "payment_plan", "fuel_type", "transmission"];
    case "real_estate":
      return ["offer_type", "property_type", "payment_plan"];
    case "facilities":
      return ["industrial_type", "industry"];
    case "materials":
      return ["industrial_type", "origin_type", "material", "industry"];
    case "all":
    default:
      return [
        "category",
        "offer_type",
        "condition",
        "payment_plan",
        "property_type",
        "industrial_type",
      ];
  }
}
