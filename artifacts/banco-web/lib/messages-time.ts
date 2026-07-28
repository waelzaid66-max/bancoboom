/** Relative time labels — ported from banco-mobile messages inbox. */

import type { SiteLocale } from "./hub-config";

export function relativeTime(iso: string | null | undefined, locale: SiteLocale): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return locale === "ar" ? "الآن" : "now";
  if (min < 60) return locale === "ar" ? `${min} د` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return locale === "ar" ? `${hr} س` : `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return locale === "ar" ? `${day} ي` : `${day}d`;
  try {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
