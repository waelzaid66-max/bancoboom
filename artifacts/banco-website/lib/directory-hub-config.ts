import type { SiteLocale } from "./hub-config";
import { adminNavItems, browseNavItems, marketNavItems } from "./chrome-nav";

/** Mobile-only highlights — listed for discovery, not replicated on web. */
export const APP_FEATURE_SECTIONS: Record<SiteLocale, string[]> = {
  ar: [
    "السيارات",
    "العقارات — بيع وإيجار وحجز يومي",
    "الصناعة والتوريد",
    "سوق الأعمال B2B",
    "الرسائل",
    "المساعد الذكي",
  ],
  en: [
    "Cars",
    "Real estate — sale, rent & daily booking",
    "Industry & supply",
    "B2B market",
    "Messenger",
    "AI assistant",
  ],
};

export type DirectoryDest = { href: string; label: string; path: string };

export function webDirectoryDests(locale: SiteLocale): DirectoryDest[] {
  return browseNavItems(locale).map((item) => ({
    href: item.href,
    label: item.label,
    path: item.href.replace(/^\/en/, "") || "/",
  }));
}

export function marketDirectoryDests(
  baseUrl: string,
  locale: SiteLocale,
): DirectoryDest[] {
  const join = (path: string) => `${baseUrl.replace(/\/+$/, "")}${path}`;
  const ar = locale === "ar";
  const core = marketNavItems(baseUrl, locale);
  const extra: DirectoryDest[] = [
    {
      href: join("/privacy"),
      label: ar ? "الخصوصية" : "Privacy",
      path: "/privacy",
    },
    {
      href: join("/terms"),
      label: ar ? "الشروط" : "Terms",
      path: "/terms",
    },
  ];
  return [
    ...core.map((item) => ({
      href: item.href,
      label: item.label,
      path: item.href.replace(baseUrl, "") || "/",
    })),
    ...extra,
  ];
}

export function adminDirectoryDests(
  baseUrl: string,
  locale: SiteLocale,
): DirectoryDest[] {
  const base = baseUrl.replace(/\/+$/, "");
  return adminNavItems(baseUrl, locale).slice(1).map((item) => ({
    href: item.href,
    label: item.label,
    path: item.href.replace(base, "") || "/",
  }));
}

const MARKET_PATH_FALLBACK: Array<{ path: string; ar: string; en: string }> = [
  { path: "/", ar: "الرئيسية", en: "Home" },
  { path: "/listings", ar: "الإعلانات", en: "Listings" },
  { path: "/rfqs", ar: "طلبات التسعير", en: "RFQs" },
  { path: "/global-supply", ar: "التوريد العالمي", en: "Global supply" },
  { path: "/investments", ar: "الاستثمارات", en: "Investments" },
  { path: "/analytics", ar: "التحليلات", en: "Analytics" },
  { path: "/privacy", ar: "الخصوصية", en: "Privacy" },
  { path: "/terms", ar: "الشروط", en: "Terms" },
];

const ADMIN_PATH_FALLBACK: Array<{ path: string; ar: string; en: string }> = [
  { path: "/overview", ar: "نظرة عامة", en: "Overview" },
  { path: "/users", ar: "المستخدمون", en: "Users" },
  { path: "/listings", ar: "الإعلانات", en: "Listings" },
  { path: "/moderation", ar: "الإشراف", en: "Moderation" },
  { path: "/revenue", ar: "الإيرادات", en: "Revenue" },
  { path: "/monitoring", ar: "المراقبة", en: "Monitoring" },
];

export function marketPathLabels(locale: SiteLocale): DirectoryDest[] {
  const ar = locale === "ar";
  return MARKET_PATH_FALLBACK.map((entry) => ({
    href: entry.path,
    label: ar ? entry.ar : entry.en,
    path: entry.path,
  }));
}

export function adminPathLabels(locale: SiteLocale): DirectoryDest[] {
  const ar = locale === "ar";
  return ADMIN_PATH_FALLBACK.map((entry) => ({
    href: entry.path,
    label: ar ? entry.ar : entry.en,
    path: entry.path,
  }));
}
