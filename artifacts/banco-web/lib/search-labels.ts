import type { SearchCriteria, SearchSort } from "@workspace/search-contract";
import type { Category, IndustrialSubtype } from "@workspace/taxonomy/categories";
import { formatCategoryLabelAr, formatCategoryLabelEn } from "./category-labels";

export const ENGINE_LABEL_AR: Record<string, string> = {
  all: "الكل",
  new: "جديدة",
  used: "مستعملة",
  bank: "تقسيط بنكي",
  islamic: "تقسيط إسلامي",
  rent: "إيجار",
  sale: "تمليك",
  automatic: "أوتوماتيك",
  manual: "مانيوال",
  petrol: "بنزين",
  diesel: "ديزل",
  hybrid: "هايبرد",
  electric: "كهرباء",
  natural_gas: "غاز طبيعي",
  cvt: "CVT أوتوماتيك",
  villa: "فيلا",
  apartment: "شقة",
  land: "أرض",
  hotel: "فندق",
};

const SORT_LABEL_AR: Record<SearchSort, string> = {
  recommended: "موصى به",
  newest: "الأحدث",
  price_asc: "السعر: من الأقل",
  price_desc: "السعر: من الأعلى",
  popular: "الأكثر شعبية",
};

export const INDUSTRIAL_SUBTYPE_AR: Record<IndustrialSubtype, string> = {
  factory: "مصنع",
  warehouse: "مخزن",
  land: "أرض",
  production_line: "خط إنتاج",
  raw_material: "مواد خام",
  machine: "آلة",
};

/** Common facet API values → Arabic display labels. */
export const FACET_VALUE_AR: Record<string, string> = {
  car: "سيارات",
  real_estate: "عقارات",
  industrial: "صناعي",
  new: "جديد",
  used: "مستعمل",
  sale: "تمليك",
  rent: "إيجار",
  installment: "تقسيط",
  bank: "بنك",
  islamic: "إسلامي",
  direct: "مباشر",
  automatic: "أوتوماتيك",
  manual: "مانيوال",
  petrol: "بنزين",
  diesel: "ديزل",
  hybrid: "هايبرد",
  electric: "كهرباء",
  natural_gas: "غاز طبيعي",
  cvt: "CVT أوتوماتيك",
  factory: "مصنع",
  warehouse: "مخزن",
  land: "أرض",
  production_line: "خط إنتاج",
  raw_material: "مواد خام",
  machine: "آلة",
  villa: "فيلا",
  apartment: "شقة",
  furnished: "مفروش",
  compound: "كمبوند",
  local: "محلي",
  imported: "مستورد",
  food: "أغذية",
  beverage: "مشروبات",
  plastic: "بلاستيك",
  textile: "نسيج",
  pharmaceutical: "أدوية",
  chemical: "كيماويات",
  engineering: "هندسي",
  other: "أخرى",
  steel: "حديد",
  aluminum: "ألومنيوم",
  copper: "نحاس",
  plastic_resin: "بلاستيك خام",
  paper: "ورق",
  textile_fiber: "ألياف نسيجية",
  rubber: "مطاط",
  glass: "زجاج",
  wood: "خشب",
  cement: "أسمنت",
};

const SORT_LABEL_EN: Record<SearchSort, string> = {
  recommended: "Recommended",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  popular: "Most popular",
};

export const ENGINE_LABEL_EN: Record<string, string> = {
  all: "All",
  new: "New",
  used: "Used",
  bank: "Bank finance",
  islamic: "Islamic finance",
  rent: "Rent",
  sale: "Sale",
  automatic: "Automatic",
  manual: "Manual",
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  electric: "Electric",
  natural_gas: "Natural gas",
  cvt: "CVT",
  villa: "Villa",
  apartment: "Apartment",
  land: "Land",
  hotel: "Hotel",
};

export const INDUSTRIAL_SUBTYPE_EN: Record<IndustrialSubtype, string> = {
  factory: "Factory",
  warehouse: "Warehouse",
  land: "Land",
  production_line: "Production line",
  raw_material: "Raw material",
  machine: "Machine",
};

export const FACET_VALUE_EN: Record<string, string> = {
  car: "Cars",
  real_estate: "Real Estate",
  industrial: "Industrial",
  new: "New",
  used: "Used",
  sale: "Sale",
  rent: "Rent",
  installment: "Installment",
  bank: "Bank",
  islamic: "Islamic",
  direct: "Direct",
  automatic: "Automatic",
  manual: "Manual",
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  electric: "Electric",
  natural_gas: "Natural gas",
  cvt: "CVT",
  factory: "Factory",
  warehouse: "Warehouse",
  land: "Land",
  production_line: "Production line",
  raw_material: "Raw material",
  machine: "Machine",
  villa: "Villa",
  apartment: "Apartment",
  furnished: "Furnished",
  compound: "Compound",
  local: "Local",
  imported: "Imported",
  food: "Food",
  beverage: "Beverage",
  plastic: "Plastic",
  textile: "Textile",
  pharmaceutical: "Pharmaceutical",
  chemical: "Chemical",
  engineering: "Engineering",
  other: "Other",
  steel: "Steel",
  aluminum: "Aluminum",
  copper: "Copper",
  plastic_resin: "Plastic / resin",
  paper: "Paper",
  textile_fiber: "Textile fiber",
  rubber: "Rubber",
  glass: "Glass",
  wood: "Wood",
  cement: "Cement",
};

export function formatEngineLabelAr(engineKey: string): string {
  return ENGINE_LABEL_AR[engineKey] ?? engineKey;
}

export function formatEngineLabelEn(engineKey: string): string {
  return ENGINE_LABEL_EN[engineKey] ?? engineKey.replaceAll("_", " ");
}

export function formatSortLabelAr(sort: SearchSort): string {
  return SORT_LABEL_AR[sort] ?? sort;
}

export function formatSortLabelEn(sort: SearchSort): string {
  return SORT_LABEL_EN[sort] ?? sort;
}

export function formatIndustrialSubtypeAr(subtype: IndustrialSubtype): string {
  return INDUSTRIAL_SUBTYPE_AR[subtype] ?? subtype;
}

export function formatIndustrialSubtypeEn(subtype: IndustrialSubtype): string {
  return INDUSTRIAL_SUBTYPE_EN[subtype] ?? subtype;
}

export function formatFacetValueAr(value: string): string {
  return FACET_VALUE_AR[value] ?? value.replaceAll("_", " ");
}

export function formatFacetValueEn(value: string): string {
  return FACET_VALUE_EN[value] ?? value.replaceAll("_", " ");
}

export function formatEngineLabel(engineKey: string, locale: "ar" | "en"): string {
  return locale === "en" ? formatEngineLabelEn(engineKey) : formatEngineLabelAr(engineKey);
}

export function formatSortLabel(sort: SearchSort, locale: "ar" | "en"): string {
  return locale === "en" ? formatSortLabelEn(sort) : formatSortLabelAr(sort);
}

export function formatIndustrialSubtype(
  subtype: IndustrialSubtype,
  locale: "ar" | "en",
): string {
  return locale === "en"
    ? formatIndustrialSubtypeEn(subtype)
    : formatIndustrialSubtypeAr(subtype);
}

export function formatFacetValue(value: string, locale: "ar" | "en"): string {
  return locale === "en" ? formatFacetValueEn(value) : formatFacetValueAr(value);
}

export function formatCategoryLabel(category: Category, locale: "ar" | "en"): string {
  return locale === "en"
    ? formatCategoryLabelEn(category)
    : formatCategoryLabelAr(category);
}

export function buildSearchHeading(
  criteria: SearchCriteria,
  locale: "ar" | "en" = "ar",
): string {
  if (criteria.q.trim()) {
    return locale === "en"
      ? `Search: ${criteria.q.trim()}`
      : `بحث: ${criteria.q.trim()}`;
  }
  if (criteria.category !== "all") {
    const categoryLabel =
      locale === "en"
        ? formatCategoryLabelEn(criteria.category)
        : formatCategoryLabelAr(criteria.category);
    let heading = categoryLabel;
    if (criteria.engineKey !== "all") {
      const engine =
        locale === "en"
          ? formatEngineLabelEn(criteria.engineKey)
          : formatEngineLabelAr(criteria.engineKey);
      heading = `${heading} — ${engine}`;
    }
    return heading;
  }
  return locale === "en" ? "Search" : "البحث";
}
