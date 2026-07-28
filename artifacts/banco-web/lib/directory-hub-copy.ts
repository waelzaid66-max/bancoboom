import type { SiteLocale } from "./hub-config";

export type DirectoryHubCopy = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  tagline: string;
  missionNote: string;
  appCardTitle: string;
  appCardBody: string;
  browseCardTitle: string;
  browseCardBody: string;
  marketCardTitle: string;
  marketCardBody: string;
  adminCardTitle: string;
  adminCardBody: string;
  openBrowse: string;
  openMarket: string;
  openAdmin: string;
  soonSuffix: string;
  googlePlay: string;
  appStore: string;
  localeSwitch: string;
  localeSwitchHref: string;
};

const COPY: Record<SiteLocale, DirectoryHubCopy> = {
  ar: {
    metaTitle: "دليل منصات BANCO",
    metaDescription:
      "بوابة تكميلية: التطبيق هو التجربة الكاملة؛ الموقع للتصفح والمشاركة والاحتياطي — روابط ماركت والإدارة والمتاجر.",
    title: "بانكو — سوق واحد لكل شيء",
    tagline:
      "سيارات · عقارات وحجز يومي · صناعة وتوريد · أعمال B2B — التطبيق أولاً، والويب للدعم والمشاركة",
    missionNote:
      "التطبيق هو المصدر الأساسي للتجربة. فصل الموقع أو تعطّله لا يؤثر على نشر الموبايل أو أدائه.",
    appCardTitle: "تطبيق بانكو",
    appCardBody: "التجربة الكاملة — كل الأقسام والخدمات:",
    browseCardTitle: "تصفّح السوق (ويب)",
    browseCardBody: "موقع تكميلي — بحث، إعلانات، ومشاركة SEO:",
    marketCardTitle: "بانكو ماركت",
    marketCardBody: "منصة الويب للتجار والشركات:",
    adminCardTitle: "لوحة التحكم",
    adminCardBody: "إدارة المنصة (للفريق فقط):",
    openBrowse: "افتح موقع التصفح",
    openMarket: "افتح بانكو ماركت",
    openAdmin: "افتح لوحة التحكم",
    soonSuffix: "قريباً",
    googlePlay: "Google Play",
    appStore: "App Store",
    localeSwitch: "English",
    localeSwitchHref: "/en/directory",
  },
  en: {
    metaTitle: "BANCO platform directory",
    metaDescription:
      "Supplementary hub: the mobile app is the full experience; web is for browse, share, and fallback — market, admin, and store links.",
    title: "BANCO — one market for everything",
    tagline:
      "Cars · real estate & daily booking · industry & supply · B2B — app first, web for support and sharing",
    missionNote:
      "The app is the primary experience. Website outage or separation does not affect mobile release or performance.",
    appCardTitle: "BANCO mobile app",
    appCardBody: "Full experience — all sections and services:",
    browseCardTitle: "Consumer browse (web)",
    browseCardBody: "Supplementary site — search, listings, and SEO sharing:",
    marketCardTitle: "BANCO Market",
    marketCardBody: "Web platform for dealers and companies:",
    adminCardTitle: "Admin console",
    adminCardBody: "Platform operations (team only):",
    openBrowse: "Open consumer site",
    openMarket: "Open BANCO Market",
    openAdmin: "Open admin console",
    soonSuffix: "soon",
    googlePlay: "Google Play",
    appStore: "App Store",
    localeSwitch: "العربية",
    localeSwitchHref: "/directory",
  },
};

export function directoryHubCopy(locale: SiteLocale): DirectoryHubCopy {
  return COPY[locale];
}
