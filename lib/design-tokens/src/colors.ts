/** BANCO brand palette — shared across web surfaces (W0.5). */
export const bancoBrand = {
  red: "#E8002D",
  black: "#000000",
  white: "#FFFFFF",
  muted: "#888888",
  card: "#111111",
  border: "#222222",
} as const;

/**
 * Per-section accent — aligned with mobile `sectionTheme.ts`.
 * Each browse category reads as its own company within the BANCO family.
 */
export const sectionAccent = {
  all: "#7A0C12",
  car: "#8A0E14",
  real_estate: "#7A1840",
  facilities: "#6A1410",
  materials: "#7A2A0C",
} as const;

/** SEO hub pages → accent (industrial hub uses facilities tone). */
export const hubAccent = {
  cars: sectionAccent.car,
  real_estate: sectionAccent.real_estate,
  industrial: sectionAccent.facilities,
  general: sectionAccent.all,
} as const;

export function accentForCategory(
  category: keyof typeof sectionAccent | string | null | undefined,
): string {
  if (!category || category === "all") return sectionAccent.all;
  if (category in sectionAccent) {
    return sectionAccent[category as keyof typeof sectionAccent];
  }
  return sectionAccent.all;
}

export const bancoCssVariables = `
:root {
  --banco-primary: ${bancoBrand.red};
  --banco-bg: ${bancoBrand.black};
  --banco-fg: ${bancoBrand.white};
  --banco-muted: ${bancoBrand.muted};
  --banco-card: ${bancoBrand.card};
  --banco-border: ${bancoBrand.border};
  --banco-radius: 12px;
  --banco-section-accent: ${sectionAccent.all};
}
`.trim();
