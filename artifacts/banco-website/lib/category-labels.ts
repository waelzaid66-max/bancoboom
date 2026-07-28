import type { Category } from "@workspace/taxonomy/categories";

/** Browse-category labels (AR) — aligned with hub pages. */
const BROWSE_CATEGORY_AR: Record<Category, string> = {
  all: "الكل",
  car: "سيارات",
  real_estate: "عقارات",
  facilities: "منشآت",
  materials: "مواد خام",
};

const BROWSE_CATEGORY_EN: Record<Category, string> = {
  all: "All",
  car: "Cars",
  real_estate: "Real Estate",
  facilities: "Facilities",
  materials: "Materials",
};

/** API listing category labels (AR) — feed cards + JSON-LD. */
const API_CATEGORY_AR: Record<string, string> = {
  car: "سيارات",
  real_estate: "عقارات",
  industrial: "صناعي",
};

const API_CATEGORY_EN: Record<string, string> = {
  car: "Cars",
  real_estate: "Real Estate",
  industrial: "Industrial",
};

export function formatCategoryLabelAr(category: Category): string {
  return BROWSE_CATEGORY_AR[category] ?? category;
}

export function formatCategoryLabelEn(category: Category): string {
  return BROWSE_CATEGORY_EN[category] ?? category;
}

export function formatApiCategoryLabelAr(
  category: string | null | undefined,
): string {
  if (!category) return "إعلان";
  return API_CATEGORY_AR[category] ?? category;
}

export function formatApiCategoryLabelEn(
  category: string | null | undefined,
): string {
  if (!category) return "Listing";
  return API_CATEGORY_EN[category] ?? category;
}

export function formatApiCategoryLabel(
  category: string | null | undefined,
  locale: "ar" | "en",
): string {
  return locale === "en"
    ? formatApiCategoryLabelEn(category)
    : formatApiCategoryLabelAr(category);
}
