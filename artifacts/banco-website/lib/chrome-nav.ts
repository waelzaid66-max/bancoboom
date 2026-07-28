import type { SiteLocale } from "./hub-config";
import { localizedPath } from "./hub-config";

/** Internal consumer-site destinations (locale-aware). */
export type BrowseNavItem = { href: string; label: string };

export type ExternalNavItem = { href: string; label: string };

type BrowseLabels = {
  home: string;
  search: string;
  cars: string;
  realEstate: string;
  industrial: string;
};

const BROWSE_LABELS: Record<SiteLocale, BrowseLabels> = {
  ar: {
    home: "الرئيسية",
    search: "بحث",
    cars: "سيارات",
    realEstate: "عقارات",
    industrial: "صناعي",
  },
  en: {
    home: "Home",
    search: "Search",
    cars: "Cars",
    realEstate: "Real Estate",
    industrial: "Industrial",
  },
};

export function browseNavItems(locale: SiteLocale): BrowseNavItem[] {
  const labels = BROWSE_LABELS[locale];
  return [
    { href: localizedPath("/", locale), label: labels.home },
    { href: localizedPath("/search", locale), label: labels.search },
    { href: localizedPath("/cars", locale), label: labels.cars },
    { href: localizedPath("/real-estate", locale), label: labels.realEstate },
    { href: localizedPath("/industrial", locale), label: labels.industrial },
  ];
}

/** Dealer OS (BANCO Market) — same paths as landing directory. */
export function marketNavItems(baseUrl: string, locale: SiteLocale): ExternalNavItem[] {
  const ar = locale === "ar";
  const join = (path: string) => `${baseUrl.replace(/\/+$/, "")}${path}`;
  return [
    { href: join("/"), label: ar ? "الرئيسية" : "Home" },
    { href: join("/listings"), label: ar ? "الإعلانات" : "Listings" },
    { href: join("/rfqs"), label: ar ? "طلبات التسعير" : "RFQs" },
    { href: join("/global-supply"), label: ar ? "التوريد العالمي" : "Global supply" },
    { href: join("/investments"), label: ar ? "الاستثمارات" : "Investments" },
    { href: join("/analytics"), label: ar ? "التحليلات" : "Analytics" },
  ];
}

/** Admin OS — linked only under the Management menu (custom NEXT_PUBLIC_ADMIN_URL). */
export function adminNavItems(baseUrl: string, locale: SiteLocale): ExternalNavItem[] {
  const ar = locale === "ar";
  const join = (path: string) => `${baseUrl.replace(/\/+$/, "")}${path}`;
  return [
    { href: join("/"), label: ar ? "دخول الإدارة" : "Admin sign-in" },
    { href: join("/overview"), label: ar ? "نظرة عامة" : "Overview" },
    { href: join("/users"), label: ar ? "المستخدمون" : "Users" },
    { href: join("/listings"), label: ar ? "الإعلانات" : "Listings" },
    { href: join("/moderation"), label: ar ? "الإشراف" : "Moderation" },
    { href: join("/revenue"), label: ar ? "الإيرادات" : "Revenue" },
    { href: join("/monitoring"), label: ar ? "المراقبة" : "Monitoring" },
  ];
}
