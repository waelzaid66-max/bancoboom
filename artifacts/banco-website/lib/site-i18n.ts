import { getSiteUrl } from "./site-env";

/** Primary public locale — Arabic (Egypt). English mirrors live under `/en/*`. */
export const PRIMARY_LOCALE = "ar-EG" as const;
export const EN_LOCALE = "en" as const;

export const SITE_HTML_LANG = "ar" as const;
export const SITE_HTML_DIR = "rtl" as const;

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function absoluteUrl(base: string, path: string): string {
  const normalized = normalizePath(path);
  return normalized === "/" ? base.replace(/\/+$/, "") : `${base.replace(/\/+$/, "")}${normalized}`;
}

/** Strip `/en` prefix to get the Arabic route path. */
export function toArabicPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/en") return "/";
  if (normalized.startsWith("/en/")) return normalized.slice(3) || "/";
  return normalized;
}

export function toEnglishPath(arPath: string): string {
  const normalized = normalizePath(arPath);
  if (normalized === "/") return "/en";
  return `/en${normalized}`;
}

function englishUrl(base: string, arPath: string): string {
  const external = process.env.NEXT_PUBLIC_SITE_URL_EN?.trim().replace(/\/+$/, "");
  if (external) {
    return absoluteUrl(external, arPath);
  }
  return absoluteUrl(base, toEnglishPath(arPath));
}

/**
 * hreflang map for Next.js `metadata.alternates.languages`.
 * `path` may be Arabic (`/cars`) or English (`/en/cars`) — both resolve to the same pair.
 */
export function buildHreflangAlternates(path: string): Record<string, string> {
  const base = getSiteUrl();
  const arPath = toArabicPath(path);
  const arUrl = absoluteUrl(base, arPath);
  const enUrl = englishUrl(base, arPath);

  return {
    [PRIMARY_LOCALE]: arUrl,
    [EN_LOCALE]: enUrl,
    "x-default": arUrl,
  };
}

export function buildCanonicalUrl(path: string): string {
  return absoluteUrl(getSiteUrl(), path);
}

