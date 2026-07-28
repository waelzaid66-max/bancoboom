import { useGetFacets, type FacetCounts } from "@workspace/api-client-react";
import {
  type Category,
  type IndustrialSubtype,
  apiCategoryFor,
  industrialGroupForCategory,
} from "@workspace/taxonomy/categories";
import { type EngineDef, enginesForCategory } from "@workspace/search-contract/engines";

/** Static commodity chips — API facet counts for `material` not yet exposed. */
export const MATERIAL_FACET_OPTIONS = [
  "steel",
  "aluminum",
  "copper",
  "plastic_resin",
  "paper",
  "chemical",
  "textile_fiber",
  "rubber",
  "glass",
  "wood",
  "cement",
  "other",
] as const;

/** Facet counts, or undefined while loading / on error. */
export type Facets = FacetCounts | undefined;

/**
 * Live inventory facet counts — mirrors mobile `lib/facets.ts` so the web
 * browse company gates empty sections the same way (fail OPEN until loaded).
 */
export function useInventoryFacets(category: Category): {
  globalFacets: Facets;
  scopedFacets: Facets;
  loading: boolean;
} {
  const apiCat = apiCategoryFor(category);
  const globalQuery = useGetFacets();
  const scopedQuery = useGetFacets(apiCat ? { category: apiCat } : undefined);

  const globalFacets = globalQuery.data?.data;
  const scopedFacets = apiCat ? scopedQuery.data?.data : globalFacets;

  return {
    globalFacets,
    scopedFacets,
    loading: globalQuery.isLoading || scopedQuery.isLoading,
  };
}

export function visibleCategories(
  categories: Category[],
  globalFacets: Facets,
): Category[] {
  if (!globalFacets) return categories;
  return categories.filter((cat) => {
    if (cat === "all") return true;
    const group = industrialGroupForCategory(cat);
    if (group) {
      return group.some((ty) => (globalFacets.industrial_type[ty] ?? 0) > 0);
    }
    const apiCat = apiCategoryFor(cat);
    return apiCat ? (globalFacets.category[apiCat] ?? 0) > 0 : true;
  });
}

export function visibleIndustrialTypes(
  types: IndustrialSubtype[],
  scopedFacets: Facets,
): IndustrialSubtype[] {
  if (!scopedFacets) return types;
  return types.filter((ty) => (scopedFacets.industrial_type[ty] ?? 0) > 0);
}

function engineFacetCount(params: EngineDef["params"], f: FacetCounts): number {
  if (params.condition) return f.condition[params.condition] ?? 0;
  if (params.payment_plan) return f.payment_plan[params.payment_plan] ?? 0;
  if (params.property_type) return f.property_type[params.property_type] ?? 0;
  if (params.finishing_type) {
    return f.finishing_type[params.finishing_type] ?? 0;
  }
  if (params.compound) return f.compound;
  if (params.furnished) return f.furnished;
  if (params.fuel_type) return f.fuel_type[params.fuel_type] ?? 0;
  if (params.transmission) return f.transmission[params.transmission] ?? 0;
  if (params.industry) return f.industry[params.industry] ?? 0;
  if (params.origin_type) return f.origin_type[params.origin_type] ?? 0;
  if (params.offer_type) return f.offer_type[params.offer_type] ?? 0;
  return 1;
}

export function engineMatchesFacets(engine: EngineDef, facets: Facets): boolean {
  if (Object.keys(engine.params).length === 0) return true;
  if (!facets) return !engine.requiresFacet;
  return engineFacetCount(engine.params, facets) > 0;
}

export function visibleEngines(
  category: Category,
  scopedFacets: Facets,
): EngineDef[] {
  const engines = enginesForCategory(category);
  if (!engines) return [];
  return engines.filter((engine) => engineMatchesFacets(engine, scopedFacets));
}
