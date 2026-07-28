/**
 * Web search market + rental-term catalog — mirrors mobile
 * `listingCreateTaxonomy` markets without importing RN app code.
 * Growing a country = one row here; API already treats rental_term as free string.
 */

export const DEFAULT_MARKET_COUNTRY = "EG";

export const WEB_MARKET_COUNTRIES: {
  value: string;
  en: string;
  ar: string;
  rentalTerms: string[];
}[] = [
  { value: "EG", en: "Egypt", ar: "مصر", rentalTerms: ["furnished_daily", "new_law", "old_law"] },
  { value: "SA", en: "Saudi Arabia", ar: "السعودية", rentalTerms: ["furnished_daily", "annual_contract"] },
  { value: "AE", en: "UAE", ar: "الإمارات", rentalTerms: ["furnished_daily", "annual_contract"] },
  { value: "KW", en: "Kuwait", ar: "الكويت", rentalTerms: ["furnished_daily", "annual_contract"] },
  { value: "QA", en: "Qatar", ar: "قطر", rentalTerms: ["furnished_daily", "annual_contract"] },
  { value: "JO", en: "Jordan", ar: "الأردن", rentalTerms: ["furnished_daily", "annual_contract"] },
  { value: "OM", en: "Oman", ar: "عُمان", rentalTerms: ["furnished_daily", "annual_contract"] },
  { value: "LY", en: "Libya", ar: "ليبيا", rentalTerms: ["furnished_daily", "annual_contract"] },
];

const RENTAL_TERM_LABELS: Record<string, { en: string; ar: string }> = {
  furnished_daily: {
    en: "Furnished — from 1 day",
    ar: "مفروش — من يوم واحد",
  },
  new_law: {
    en: "New-law lease — up to 5 years",
    ar: "إيجار قانون جديد — حتى 5 سنوات",
  },
  old_law: {
    en: "Old-law lease — up to 59 years",
    ar: "إيجار قانون قديم — حتى 59 سنة",
  },
  annual_contract: { en: "Annual contract", ar: "عقد إيجار سنوي" },
};

export function rentalTermsForWebMarket(country: string): {
  value: string;
  en: string;
  ar: string;
}[] {
  const market =
    WEB_MARKET_COUNTRIES.find((c) => c.value === country) ?? WEB_MARKET_COUNTRIES[0];
  return market.rentalTerms.map((value) => ({
    value,
    en: RENTAL_TERM_LABELS[value]?.en ?? value,
    ar: RENTAL_TERM_LABELS[value]?.ar ?? value,
  }));
}

export function sanitizeRentalTermForWebMarket(
  term: string | null,
  country: string,
): string | null {
  if (!term) return null;
  const allowed = rentalTermsForWebMarket(country);
  return allowed.some((t) => t.value === term) ? term : null;
}

export function marketCountryLabel(code: string, locale: "ar" | "en"): string {
  const row = WEB_MARKET_COUNTRIES.find((c) => c.value === code);
  if (!row) return code;
  return locale === "en" ? row.en : row.ar;
}
