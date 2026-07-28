/**
 * Shared browse-category taxonomy (pure data + pure helpers). The two industrial
 * groups ("facilities" and "materials") both map to API category=industrial and
 * are separated CLIENT-side by each listing's `industrial_type`. Moved here from
 * the mobile CategoryTabs component so the data layer (search/facets) and every
 * surface share ONE definition and can never drift.
 */

/** User-facing browse categories. */
export type Category = "all" | "car" | "real_estate" | "facilities" | "materials";

/** Concrete industrial sub-types backing the two industrial group categories. */
export type IndustrialSubtype =
  | "factory"
  | "warehouse"
  | "land"
  | "production_line"
  | "raw_material"
  | "machine";

/** "all" (whole group) plus the concrete sub-types. */
export type IndustrialType = IndustrialSubtype | "all";

/** The API listing-category enum (car | real_estate | industrial). */
export type ApiCategory = "car" | "real_estate" | "industrial";

// مصانع وأراضي — factories, warehouses & land.
export const FACILITIES_TYPES: IndustrialSubtype[] = ["factory", "warehouse", "land"];
// مواد خام وخطوط إنتاج — production lines, raw materials & machinery.
export const MATERIALS_TYPES: IndustrialSubtype[] = ["production_line", "raw_material", "machine"];

// Every industrial sub-type, used by the flat Industry Hub browser.
export const ALL_INDUSTRIAL_TYPES: IndustrialSubtype[] = [
  ...FACILITIES_TYPES,
  ...MATERIALS_TYPES,
];

/** The industrial sub-types backing a group category, or null for non-group categories. */
export function industrialGroupForCategory(cat: Category): IndustrialSubtype[] | null {
  if (cat === "facilities") return FACILITIES_TYPES;
  if (cat === "materials") return MATERIALS_TYPES;
  return null;
}

/** Maps a browse category to the API `category` enum (undefined = no filter / "all"). */
export function apiCategoryFor(cat: Category): ApiCategory | undefined {
  if (cat === "car") return "car";
  if (cat === "real_estate") return "real_estate";
  if (cat === "facilities" || cat === "materials") return "industrial";
  return undefined;
}

/**
 * Client-side membership test for a feed item under the active category +
 * optional sub-type. Non-group categories are already filtered server-side, so
 * they always pass. Group categories match by the item's `industrial_type`.
 */
export function feedItemMatchesCategory(
  itemIndustrialType: string | null | undefined,
  cat: Category,
  subtype: IndustrialType
): boolean {
  const group = industrialGroupForCategory(cat);
  if (!group) return true;
  if (subtype !== "all") return itemIndustrialType === subtype;
  return !!itemIndustrialType && (group as string[]).includes(itemIndustrialType);
}

export const CATEGORY_KEYS: { key: Category; i18nKey: string }[] = [
  { key: "all", i18nKey: "home.categories.all" },
  { key: "car", i18nKey: "home.categories.car" },
  { key: "real_estate", i18nKey: "home.categories.real_estate" },
  { key: "facilities", i18nKey: "home.categories.facilities" },
  { key: "materials", i18nKey: "home.categories.materials" },
];

/** Browse categories in canonical display order (data-presence gating input). */
export const CATEGORY_ORDER: Category[] = CATEGORY_KEYS.map((c) => c.key);
