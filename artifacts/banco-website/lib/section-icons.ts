/** Visual keys aligned with mobile CategoryIcon (lucide SVG glyphs). */
export type SectionIconVariant =
  | "all"
  | "search"
  | "car"
  | "cars"
  | "real_estate"
  | "facilities"
  | "materials"
  | "industrial";

/** Derive section SVG icon from a search hub URL (shared contract paths). */
export function iconForSearchHref(href: string): SectionIconVariant {
  if (href.includes("category=materials")) return "materials";
  if (href.includes("category=facilities")) return "facilities";
  if (href.includes("category=real_estate")) return "real_estate";
  if (href.includes("category=car")) return "car";
  if (href.includes("/cars")) return "cars";
  if (href.includes("/real-estate")) return "real_estate";
  if (href.includes("/industrial")) return "industrial";
  return "search";
}
