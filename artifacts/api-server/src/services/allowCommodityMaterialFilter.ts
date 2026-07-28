/**
 * Commodity material filter is materials-company inventory only.
 * Drop when category is car/RE, or when industrial_type is facilities-only.
 * Pure helper — safe to unit-test without DB.
 */

/** Facilities subtypes — commodity `material` must never apply here. */
const FACILITIES_SUBTYPES = new Set<string>(["factory", "warehouse", "land"]);

export function allowCommodityMaterialFilter(f: {
  category?: string;
  industrial_type?: readonly string[];
  material?: string;
}): boolean {
  if (!f.material) return false;
  if (f.category === "car" || f.category === "real_estate") return false;
  if (f.industrial_type?.length) {
    const onlyFacilities = f.industrial_type.every((t) =>
      FACILITIES_SUBTYPES.has(t),
    );
    if (onlyFacilities) return false;
  }
  return true;
}
