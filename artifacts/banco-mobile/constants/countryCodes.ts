/**
 * Phone country dial codes for the create-listing contact numbers (Task #89).
 *
 * RN-pure data module — NO react-native / icon imports — so it can be consumed
 * by both the wizard and the picker without pulling UI deps. Numbers are stored
 * and submitted as E.164 ("+<dial><national>"), the safest canonical form for
 * `tel:` / `wa.me` links the buyer side already builds.
 *
 * `trunk` is the national trunk prefix sellers habitually type (e.g. Egypt's
 * leading 0) which must be dropped before joining the dial code. `min`/`max` are
 * the national significant number length bounds used for lenient validation.
 */
export interface PhoneCountry {
  iso: string;
  dial: string;
  flag: string;
  nameEn: string;
  nameAr: string;
  /** National-format sample WITHOUT trunk prefix, shown as the format hint. */
  sample: string;
  min: number;
  max: number;
  trunk?: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "EG", dial: "20", flag: "🇪🇬", nameEn: "Egypt", nameAr: "مصر", sample: "1012345678", min: 10, max: 10, trunk: "0" },
  { iso: "SA", dial: "966", flag: "🇸🇦", nameEn: "Saudi Arabia", nameAr: "السعودية", sample: "512345678", min: 9, max: 9, trunk: "0" },
  { iso: "AE", dial: "971", flag: "🇦🇪", nameEn: "United Arab Emirates", nameAr: "الإمارات", sample: "501234567", min: 9, max: 9, trunk: "0" },
  { iso: "KW", dial: "965", flag: "🇰🇼", nameEn: "Kuwait", nameAr: "الكويت", sample: "50012345", min: 8, max: 8 },
  { iso: "QA", dial: "974", flag: "🇶🇦", nameEn: "Qatar", nameAr: "قطر", sample: "33123456", min: 8, max: 8 },
  { iso: "BH", dial: "973", flag: "🇧🇭", nameEn: "Bahrain", nameAr: "البحرين", sample: "36001234", min: 8, max: 8 },
  { iso: "OM", dial: "968", flag: "🇴🇲", nameEn: "Oman", nameAr: "عُمان", sample: "92123456", min: 8, max: 8 },
  { iso: "JO", dial: "962", flag: "🇯🇴", nameEn: "Jordan", nameAr: "الأردن", sample: "791234567", min: 9, max: 9, trunk: "0" },
  { iso: "LB", dial: "961", flag: "🇱🇧", nameEn: "Lebanon", nameAr: "لبنان", sample: "71123456", min: 7, max: 8, trunk: "0" },
  { iso: "IQ", dial: "964", flag: "🇮🇶", nameEn: "Iraq", nameAr: "العراق", sample: "7912345678", min: 10, max: 10, trunk: "0" },
  { iso: "PS", dial: "970", flag: "🇵🇸", nameEn: "Palestine", nameAr: "فلسطين", sample: "599123456", min: 9, max: 9, trunk: "0" },
  { iso: "SY", dial: "963", flag: "🇸🇾", nameEn: "Syria", nameAr: "سوريا", sample: "944567890", min: 9, max: 9, trunk: "0" },
  { iso: "SD", dial: "249", flag: "🇸🇩", nameEn: "Sudan", nameAr: "السودان", sample: "911231234", min: 9, max: 9, trunk: "0" },
  { iso: "LY", dial: "218", flag: "🇱🇾", nameEn: "Libya", nameAr: "ليبيا", sample: "912345678", min: 9, max: 9, trunk: "0" },
  { iso: "MA", dial: "212", flag: "🇲🇦", nameEn: "Morocco", nameAr: "المغرب", sample: "612345678", min: 9, max: 9, trunk: "0" },
  { iso: "DZ", dial: "213", flag: "🇩🇿", nameEn: "Algeria", nameAr: "الجزائر", sample: "551234567", min: 9, max: 9, trunk: "0" },
  { iso: "TN", dial: "216", flag: "🇹🇳", nameEn: "Tunisia", nameAr: "تونس", sample: "20123456", min: 8, max: 8 },
  { iso: "YE", dial: "967", flag: "🇾🇪", nameEn: "Yemen", nameAr: "اليمن", sample: "712345678", min: 9, max: 9, trunk: "0" },
  { iso: "TR", dial: "90", flag: "🇹🇷", nameEn: "Türkiye", nameAr: "تركيا", sample: "5012345678", min: 10, max: 10, trunk: "0" },
  { iso: "GB", dial: "44", flag: "🇬🇧", nameEn: "United Kingdom", nameAr: "بريطانيا", sample: "7400123456", min: 10, max: 10, trunk: "0" },
  { iso: "US", dial: "1", flag: "🇺🇸", nameEn: "United States", nameAr: "أمريكا", sample: "2015550123", min: 10, max: 10 },
];

export const DEFAULT_COUNTRY: PhoneCountry = PHONE_COUNTRIES[0];

export function countryByIso(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso === iso) ?? DEFAULT_COUNTRY;
}

/** Digits-only national number with the country's trunk prefix dropped once. */
export function toNationalDigits(raw: string, c: PhoneCountry): string {
  let d = raw.replace(/[^0-9]/g, "");
  if (c.trunk && d.startsWith(c.trunk)) d = d.slice(c.trunk.length);
  return d;
}

/** Canonical E.164, e.g. "+201012345678". */
export function toE164(raw: string, c: PhoneCountry): string {
  return `+${c.dial}${toNationalDigits(raw, c)}`;
}

export function isValidNationalNumber(raw: string, c: PhoneCountry): boolean {
  const d = toNationalDigits(raw, c);
  return d.length >= c.min && d.length <= c.max;
}

/**
 * Best-effort parse of a stored/account phone into a country + national number.
 * Recognizes an explicit "+<dial>" (longest dial match wins); otherwise defaults
 * to Egypt and keeps the raw national digits (trunk handled later on submit).
 */
export function parsePhone(
  raw: string | null | undefined,
): { iso: string; number: string } {
  const trimmed = (raw ?? "").trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/[^0-9]/g, "");
    const match = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((c) => digits.startsWith(c.dial));
    if (match) return { iso: match.iso, number: digits.slice(match.dial.length) };
  }
  return { iso: DEFAULT_COUNTRY.iso, number: trimmed.replace(/[^0-9]/g, "") };
}

export function countryLabel(c: PhoneCountry, isRTL: boolean): string {
  return isRTL ? c.nameAr : c.nameEn;
}
