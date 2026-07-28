import type { SiteLocale } from "./hub-config";

export const LOCALE_STORAGE_KEY = "banco-web-locale";

export function readStoredLocale(): SiteLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return value === "en" || value === "ar" ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: SiteLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private browsing */
  }
}
