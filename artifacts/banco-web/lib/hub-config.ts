import type { GetFeedCategory } from "@workspace/api-client-react";

export type SiteLocale = "ar" | "en";

export type HubKey = "cars" | "real_estate" | "industrial";

export type HubLink = { href: string; label: string };

export type HubCopy = {
  metadataTitle: string;
  metadataDescription: string;
  path: string;
  h1: string;
  intro: string;
  cardTitle: string;
  links: HubLink[];
  feedTitle: string;
  searchHref: string;
  jsonLdName: string;
  jsonLdDescription: string;
  breadcrumbLabel: string;
};

type HubDefinition = {
  category: GetFeedCategory;
  ar: HubCopy;
  en: HubCopy;
};

export const HUB_DEFINITIONS: Record<HubKey, HubDefinition> = {
  cars: {
    category: "car",
    ar: {
      metadataTitle: "سيارات",
      metadataDescription: "تصفح سيارات للبيع والتقسيط في BANCO — جديد، مستعمل، وتمويل بنكي",
      path: "/cars",
      h1: "سيارات",
      intro: "مركز SEO للسيارات — كل الروابط تستخدم عقد البحث المشترك مع تطبيق الجوال.",
      cardTitle: "ابدأ التصفح",
      links: [
        { href: "/search?category=car", label: "كل السيارات" },
        { href: "/search?category=car&engine=new", label: "جديد" },
        { href: "/search?category=car&engine=used", label: "مستعمل" },
        { href: "/search?category=car&engine=bank", label: "تمويل بنكي" },
        { href: "/search?category=car&engine=islamic", label: "تمويل إسلامي" },
        { href: "/search?category=car&payment_type=installment", label: "تقسيط" },
      ],
      feedTitle: "أحدث السيارات",
      searchHref: "/search?category=car",
      jsonLdName: "سيارات | BANCO",
      jsonLdDescription: "تصفح سيارات للبيع والتقسيط في BANCO",
      breadcrumbLabel: "سيارات",
    },
    en: {
      metadataTitle: "Cars",
      metadataDescription: "Browse cars for sale and financing on BANCO — new, used, and bank plans",
      path: "/en/cars",
      h1: "Cars",
      intro: "SEO hub for cars — all links use the shared search contract with the mobile app.",
      cardTitle: "Start browsing",
      links: [
        { href: "/search?category=car", label: "All cars" },
        { href: "/search?category=car&engine=new", label: "New" },
        { href: "/search?category=car&engine=used", label: "Used" },
        { href: "/search?category=car&engine=bank", label: "Bank finance" },
        { href: "/search?category=car&engine=islamic", label: "Islamic finance" },
        { href: "/search?category=car&payment_type=installment", label: "Installment" },
      ],
      feedTitle: "Latest cars",
      searchHref: "/search?category=car",
      jsonLdName: "Cars | BANCO",
      jsonLdDescription: "Browse cars for sale and financing on BANCO",
      breadcrumbLabel: "Cars",
    },
  },
  real_estate: {
    category: "real_estate",
    ar: {
      metadataTitle: "عقارات",
      metadataDescription: "تصفح عقارات للبيع والإيجار في BANCO",
      path: "/real-estate",
      h1: "عقارات",
      intro: "مركز SEO للعقارات — بيع، إيجار، وفلاتر متوافقة مع الموبايل.",
      cardTitle: "ابدأ التصفح",
      links: [
        { href: "/search?category=real_estate", label: "كل العقارات" },
        { href: "/search?category=real_estate&engine=sale", label: "بيع" },
        { href: "/search?category=real_estate&engine=rent", label: "إيجار" },
        { href: "/search?category=real_estate&engine=rent&rental_term=new_law", label: "إيجار قانون جديد" },
        { href: "/search?category=real_estate&location=cairo", label: "القاهرة" },
      ],
      feedTitle: "أحدث العقارات",
      searchHref: "/search?category=real_estate",
      jsonLdName: "عقارات | BANCO",
      jsonLdDescription: "تصفح عقارات للبيع والإيجار في BANCO",
      breadcrumbLabel: "عقارات",
    },
    en: {
      metadataTitle: "Real Estate",
      metadataDescription: "Browse real estate for sale and rent on BANCO",
      path: "/en/real-estate",
      h1: "Real Estate",
      intro: "SEO hub for property — sale, rent, and mobile-compatible filters.",
      cardTitle: "Start browsing",
      links: [
        { href: "/search?category=real_estate", label: "All properties" },
        { href: "/search?category=real_estate&engine=sale", label: "Sale" },
        { href: "/search?category=real_estate&engine=rent", label: "Rent" },
        { href: "/search?category=real_estate&engine=rent&rental_term=new_law", label: "New-law rent" },
        { href: "/search?category=real_estate&location=cairo", label: "Cairo" },
      ],
      feedTitle: "Latest properties",
      searchHref: "/search?category=real_estate",
      jsonLdName: "Real Estate | BANCO",
      jsonLdDescription: "Browse real estate for sale and rent on BANCO",
      breadcrumbLabel: "Real Estate",
    },
  },
  industrial: {
    category: "industrial",
    ar: {
      metadataTitle: "صناعي",
      metadataDescription: "تصفح منشآت ومواد صناعية في BANCO",
      path: "/industrial",
      h1: "صناعي",
      intro: "مركز SEO للقطاع الصناعي — منشآت ومواد عبر نفس فلاتر الموبايل.",
      cardTitle: "ابدأ التصفح",
      links: [
        { href: "/search?category=facilities", label: "منشآت" },
        { href: "/search?category=materials", label: "مواد وخطوط" },
        { href: "/search?category=facilities&industrial_type=factory", label: "مصانع" },
        { href: "/search?category=facilities&industrial_type=warehouse", label: "مخازن" },
        { href: "/search?category=materials&industrial_type=raw_material", label: "مواد خام" },
      ],
      feedTitle: "أحدث الإعلانات الصناعية",
      searchHref: "/search?category=facilities",
      jsonLdName: "صناعي | BANCO",
      jsonLdDescription: "تصفح منشآت ومواد صناعية في BANCO",
      breadcrumbLabel: "صناعي",
    },
    en: {
      metadataTitle: "Industrial",
      metadataDescription: "Browse industrial facilities and materials on BANCO",
      path: "/en/industrial",
      h1: "Industrial",
      intro: "SEO hub for industrial assets — facilities and materials with shared mobile filters.",
      cardTitle: "Start browsing",
      links: [
        { href: "/search?category=facilities", label: "Facilities" },
        { href: "/search?category=materials", label: "Materials & lines" },
        { href: "/search?category=facilities&industrial_type=factory", label: "Factories" },
        { href: "/search?category=facilities&industrial_type=warehouse", label: "Warehouses" },
        { href: "/search?category=materials&industrial_type=raw_material", label: "Raw materials" },
      ],
      feedTitle: "Latest industrial listings",
      searchHref: "/search?category=facilities",
      jsonLdName: "Industrial | BANCO",
      jsonLdDescription: "Browse industrial facilities and materials on BANCO",
      breadcrumbLabel: "Industrial",
    },
  },
};

export function hubCopy(hub: HubKey, locale: SiteLocale): HubCopy {
  const copy = HUB_DEFINITIONS[hub][locale];
  if (locale === "ar") return copy;
  return {
    ...copy,
    links: copy.links.map((link) => ({
      ...link,
      href: localizeSearchHref(link.href, locale),
    })),
    searchHref: localizeSearchHref(copy.searchHref, locale),
  };
}

/** Prefix `/en` for search URLs on English hubs. */
export function localizeSearchHref(href: string, locale: SiteLocale): string {
  if (locale === "ar") return href;
  if (href.startsWith("/en/search")) return href;
  if (href.startsWith("/search")) return `/en${href}`;
  return href;
}

export function homePathForLocale(locale: SiteLocale): string {
  return locale === "en" ? "/en" : "/";
}

export function localeFromPathname(pathname: string): SiteLocale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ar";
}

/** Strip `/en` prefix to get the Arabic route path. */
export function arPathFromPathname(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname || "/";
}

export function localizedPath(arPath: string, locale: SiteLocale): string {
  const normalized = arPath.startsWith("/") ? arPath : `/${arPath}`;
  if (locale === "ar") return normalized;
  return normalized === "/" ? "/en" : `/en${normalized}`;
}
