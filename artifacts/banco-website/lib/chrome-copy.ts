import type { SiteLocale } from "./hub-config";
import { localizedPath } from "./hub-config";

export type ChromeCopy = {
  brandAria: string;
  navAria: string;
  appMenu: string;
  appAndroid: string;
  appIos: string;
  appSoon: string;
  marketMenu: string;
  marketSoon: string;
  managementMenu: string;
  browse: string;
  generalSearch: string;
  platforms: string;
  marketLabel: string;
  adminLabel: string;
  adminSoon: string;
  app: string;
  androidSoon: string;
  iosSoon: string;
  localeSwitch: string;
  homeHref: string;
  searchHref: string;
  carsHref: string;
  realEstateHref: string;
  industrialHref: string;
};

const COPY: Record<SiteLocale, ChromeCopy> = {
  ar: {
    brandAria: "BANCO الرئيسية",
    navAria: "التنقل الرئيسي",
    appMenu: "التطبيق",
    appAndroid: "Google Play",
    appIos: "App Store",
    appSoon: "التطبيق (قريباً)",
    marketMenu: "بانكو ماركت",
    marketSoon: "بانكو ماركت (قريباً)",
    managementMenu: "Management",
    browse: "تصفح",
    generalSearch: "بحث عام",
    platforms: "المنصات",
    marketLabel: "بانكو ماركت / Dealer OS",
    adminLabel: "الإدارة",
    adminSoon: "الإدارة (قريباً)",
    app: "التطبيق",
    androidSoon: "Android (قريباً)",
    iosSoon: "iOS (قريباً)",
    localeSwitch: "English",
    homeHref: "/",
    searchHref: "/search",
    carsHref: "/cars",
    realEstateHref: "/real-estate",
    industrialHref: "/industrial",
  },
  en: {
    brandAria: "BANCO home",
    navAria: "Main navigation",
    appMenu: "Mobile app",
    appAndroid: "Google Play",
    appIos: "App Store",
    appSoon: "App (soon)",
    marketMenu: "BANCO Market",
    marketSoon: "BANCO Market (soon)",
    managementMenu: "Management",
    browse: "Browse",
    generalSearch: "Search",
    platforms: "Platforms",
    marketLabel: "BANCO Market / Dealer OS",
    adminLabel: "Admin",
    adminSoon: "Admin (soon)",
    app: "App",
    androidSoon: "Android (soon)",
    iosSoon: "iOS (soon)",
    localeSwitch: "العربية",
    homeHref: "/en",
    searchHref: "/en/search",
    carsHref: "/en/cars",
    realEstateHref: "/en/real-estate",
    industrialHref: "/en/industrial",
  },
};

export function chromeCopy(locale: SiteLocale): ChromeCopy {
  return COPY[locale];
}

export function alternateLocalePath(pathname: string): string {
  if (pathname.startsWith("/listing/")) return pathname;

  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  if (isEn) {
    if (pathname === "/en") return "/";
    if (pathname === "/en/search") return "/search";
    if (pathname === "/en/directory") return "/directory";
    return pathname.replace(/^\/en/, "") || "/";
  }
  if (pathname === "/search") return "/en/search";
  if (pathname === "/directory") return "/en/directory";
  return localizedPath(pathname, "en");
}
