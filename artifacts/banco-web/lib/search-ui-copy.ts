import type { SiteLocale } from "./hub-config";

export type SearchUiCopy = {
  controlsTitle: string;
  controlsIntro: string;
  queryLabel: string;
  queryPlaceholder: string;
  categoryLabel: string;
  sortLabel: string;
  cityLabel: string;
  minPriceLabel: string;
  maxPriceLabel: string;
  limitLabel: string;
  brandLabel: string;
  modelLabel: string;
  minYearLabel: string;
  maxYearLabel: string;
  fuelLabel: string;
  transmissionLabel: string;
  anyOption: string;
  industrialTypeLabel: string;
  allChip: string;
  paymentLabel: string;
  installmentChip: string;
  rentalTermLabel: string;
  engineLabel: string;
  industryLabel: string;
  originLabel: string;
  materialLabel: string;
  listingModeLabel: string;
  listingModeAll: string;
  listingModeSale: string;
  listingModeBuy: string;
  marketCountryLabel: string;
  apply: string;
  reset: string;
  copyUrl: string;
  copied: string;
  nearMe: string;
  nearMeActive: string;
  nearMePending: string;
  nearMeDenied: string;
  viewToggleAria: string;
  viewList: string;
  viewMap: string;
  facetsTitle: string;
  facetsDisabled: string;
  facetsIntro: string;
  facetsLoading: string;
  facetsEmpty: string;
  facetsError: string;
  previewNote: string;
  stateLoading: string;
  stateEmpty: string;
  stateError: string;
  hubsAria: string;
  paginationFirst: string;
  paginationNext: string;
  paginationLiveNext: string;
  paginationNoNext: string;
  paginationPreview: string;
  hubCars: string;
  hubRealEstate: string;
  hubIndustrial: string;
  hubCarsHref: string;
  hubRealEstateHref: string;
  hubIndustrialHref: string;
  mapDisabledTitle: string;
  mapDisabledBody: string;
  mapMockTitle: string;
  mapMockBody: string;
  mapLiveTitle: string;
  mapLoadingClusters: string;
  mapError: string;
  mapEmpty: string;
  mapLoadingSurface: string;
  mapAria: string;
  mapPreviewAria: string;
  mapClusterSingle: string;
  mapClusterMany: string;
  mapTotalInViewport: string;
  resultsTitle: string;
  resultsIntro: string;
  autocompleteDisabled: string;
  autocompleteLoading: string;
  autocompleteError: string;
  similarListingsTitle: string;
};

const MAP_TOTAL = (locale: SiteLocale, total: number) =>
  locale === "en" ? `In viewport: ${total}` : `إجمالي داخل الإطار: ${total}`;

export function formatMapClusterLabel(
  locale: SiteLocale,
  count: number,
  hasListingId: boolean,
): string {
  if (count === 1 && hasListingId) {
    return locale === "en" ? "1 listing" : "1 إعلان";
  }
  return locale === "en" ? `${count} listings` : `${count} إعلان`;
}

export function formatMapTotalInViewport(locale: SiteLocale, total: number): string {
  return MAP_TOTAL(locale, total);
}

const COPY: Record<SiteLocale, SearchUiCopy> = {
  ar: {
    controlsTitle: "البحث والفلاتر",
    controlsIntro: "نفس معايير تطبيق الجوال — التغييرات تنعكس على رابط الصفحة للمشاركة.",
    queryLabel: "نص البحث",
    queryPlaceholder: "مثال: corolla",
    categoryLabel: "الفئة",
    sortLabel: "الترتيب",
    cityLabel: "المدينة",
    minPriceLabel: "أقل سعر",
    maxPriceLabel: "أعلى سعر",
    limitLabel: "عدد النتائج (limit)",
    brandLabel: "الماركة",
    modelLabel: "الموديل",
    minYearLabel: "من سنة",
    maxYearLabel: "إلى سنة",
    fuelLabel: "الوقود",
    transmissionLabel: "ناقل الحركة",
    anyOption: "أي",
    industrialTypeLabel: "النوع الصناعي",
    allChip: "الكل",
    paymentLabel: "طريقة الدفع",
    installmentChip: "تقسيط",
    rentalTermLabel: "مدة الإيجار",
    engineLabel: "محرك التصفية (engine)",
    industryLabel: "القطاع الصناعي",
    originLabel: "الأصل",
    materialLabel: "الخامة",
    listingModeLabel: "نوع الإعلان",
    listingModeAll: "الكل",
    listingModeSale: "للبيع",
    listingModeBuy: "مطلوب شراء",
    marketCountryLabel: "سوق الدولة",
    apply: "تطبيق",
    reset: "إعادة ضبط",
    copyUrl: "نسخ رابط البحث",
    copied: "تم النسخ",
    nearMe: "قريب مني",
    nearMeActive: "قريب مني (مفعّل)",
    nearMePending: "جاري تحديد الموقع...",
    nearMeDenied: "يلزم السماح بالموقع للبحث بالقرب منك.",
    viewToggleAria: "طريقة عرض النتائج",
    viewList: "قائمة",
    viewMap: "خريطة",
    facetsTitle: "فلاتر سريعة",
    facetsDisabled: "الفلاتر التفاعلية متاحة عند تفعيل البحث الحي.",
    facetsIntro: "اضغط على أي خيار لتطبيقه فوراً على البحث.",
    facetsLoading: "جاري التحميل…",
    facetsEmpty: "لا توجد فلاتر متاحة حالياً.",
    facetsError: "تعذّر تحميل الفلاتر — جرّب تحديث الصفحة أو تعديل البحث.",
    previewNote:
      "معاينة محلية — فعّل NEXT_PUBLIC_WEB_SEARCH_LIVE=true لنتائج حية من الـ API.",
    stateLoading: "جاري تحميل النتائج…",
    stateEmpty: "لا توجد نتائج مطابقة. جرّب توسيع الفلاتر أو تصفّح مركزاً آخر.",
    stateError: "تعذّر تحميل النتائج. تحقق من الاتصال بالخادم وحاول مرة أخرى.",
    hubsAria: "مراكز التصفح",
    paginationFirst: "الصفحة الأولى",
    paginationNext: "التالي",
    paginationLiveNext: "متاح الانتقال بالـ cursor.",
    paginationNoNext: "لا يوجد cursor لاحق حالياً.",
    paginationPreview: "Pagination الحي متاح عند تفعيل NEXT_PUBLIC_WEB_SEARCH_LIVE=true",
    hubCars: "سيارات",
    hubRealEstate: "عقارات",
    hubIndustrial: "صناعي",
    hubCarsHref: "/cars",
    hubRealEstateHref: "/real-estate",
    hubIndustrialHref: "/industrial",
    mapDisabledTitle: "خريطة النتائج (Preview)",
    mapDisabledBody: "عرض الخريطة متاح عند تفعيل NEXT_PUBLIC_WEB_SEARCH_MAP=true.",
    mapMockTitle: "خريطة النتائج (Mock)",
    mapMockBody:
      "معاينة clusters داخل إطار القاهرة الافتراضي. بدون مفتاح Google Maps تُعرض معاينة CSS؛ مع المفتاح و NEXT_PUBLIC_WEB_SEARCH_LIVE=true يُفعَّل GET /search/map عند تحريك الخريطة.",
    mapLiveTitle: "خريطة النتائج (Live)",
    mapLoadingClusters: "جاري تحميل clusters...",
    mapError: "تعذر تحميل الخريطة حاليًا. سيتم الاستمرار بدون تعطيل الصفحة.",
    mapEmpty: "لا توجد نتائج على الخريطة لهذه المعايير.",
    mapLoadingSurface: "جاري تحميل الخريطة...",
    mapAria: "خريطة نتائج البحث",
    mapPreviewAria: "معاينة خريطة النتائج",
    mapClusterSingle: "1 إعلان",
    mapClusterMany: "إعلان",
    mapTotalInViewport: "إجمالي داخل الإطار",
    resultsTitle: "النتائج",
    resultsIntro: "بطاقات متوافقة مع عقد FeedItem وتربط إلى /listing/[id].",
    autocompleteDisabled: "Autocomplete مفعل فقط عند تشغيل NEXT_PUBLIC_WEB_SEARCH_LIVE=true.",
    autocompleteLoading: "جاري تحميل الاقتراحات...",
    autocompleteError: "تعذر تحميل الاقتراحات حاليًا.",
    similarListingsTitle: "إعلانات مشابهة",
  },
  en: {
    controlsTitle: "Search & filters",
    controlsIntro: "Same criteria as the mobile app — changes update the shareable page URL.",
    queryLabel: "Search text",
    queryPlaceholder: "e.g. corolla",
    categoryLabel: "Category",
    sortLabel: "Sort",
    cityLabel: "City",
    minPriceLabel: "Min price",
    maxPriceLabel: "Max price",
    limitLabel: "Results limit",
    brandLabel: "Brand",
    modelLabel: "Model",
    minYearLabel: "From year",
    maxYearLabel: "To year",
    fuelLabel: "Fuel",
    transmissionLabel: "Transmission",
    anyOption: "Any",
    industrialTypeLabel: "Industrial type",
    allChip: "All",
    paymentLabel: "Payment",
    installmentChip: "Installment",
    rentalTermLabel: "Rental term",
    engineLabel: "Browse engine",
    industryLabel: "Industry sector",
    originLabel: "Origin",
    materialLabel: "Material",
    listingModeLabel: "Listing type",
    listingModeAll: "All",
    listingModeSale: "For sale",
    listingModeBuy: "Wanted to buy",
    marketCountryLabel: "Market country",
    apply: "Apply",
    reset: "Reset",
    copyUrl: "Copy search link",
    copied: "Copied",
    nearMe: "Near me",
    nearMeActive: "Near me (on)",
    nearMePending: "Getting location…",
    nearMeDenied: "Location permission is required for near-me search.",
    viewToggleAria: "Results view mode",
    viewList: "List",
    viewMap: "Map",
    facetsTitle: "Quick filters",
    facetsDisabled: "Interactive facets are available when live search is enabled.",
    facetsIntro: "Tap a value to apply it to the search immediately.",
    facetsLoading: "Loading…",
    facetsEmpty: "No facets available right now.",
    facetsError: "Could not load facets — refresh or adjust your search.",
    previewNote:
      "Local preview — set NEXT_PUBLIC_WEB_SEARCH_LIVE=true for live API results.",
    stateLoading: "Loading results…",
    stateEmpty: "No matching results. Try broader filters or another hub.",
    stateError: "Could not load results. Check the server connection and retry.",
    hubsAria: "Browse hubs",
    paginationFirst: "First page",
    paginationNext: "Next",
    paginationLiveNext: "More results available via cursor.",
    paginationNoNext: "No further cursor available.",
    paginationPreview: "Live pagination requires NEXT_PUBLIC_WEB_SEARCH_LIVE=true",
    hubCars: "Cars",
    hubRealEstate: "Real Estate",
    hubIndustrial: "Industrial",
    hubCarsHref: "/en/cars",
    hubRealEstateHref: "/en/real-estate",
    hubIndustrialHref: "/en/industrial",
    mapDisabledTitle: "Results map (preview)",
    mapDisabledBody: "Map view is available when NEXT_PUBLIC_WEB_SEARCH_MAP=true.",
    mapMockTitle: "Results map (mock)",
    mapMockBody:
      "Cluster preview in the default Cairo viewport. Without a Google Maps key you see a CSS preview; with the key and NEXT_PUBLIC_WEB_SEARCH_LIVE=true, GET /search/map runs when you pan the map.",
    mapLiveTitle: "Results map (live)",
    mapLoadingClusters: "Loading clusters…",
    mapError: "Could not load the map. The page continues without blocking.",
    mapEmpty: "No map results for these filters.",
    mapLoadingSurface: "Loading map…",
    mapAria: "Search results map",
    mapPreviewAria: "Search results map preview",
    mapClusterSingle: "1 listing",
    mapClusterMany: "listings",
    mapTotalInViewport: "In viewport",
    resultsTitle: "Results",
    resultsIntro: "Cards aligned with the FeedItem contract, linking to /listing/[id].",
    autocompleteDisabled: "Autocomplete is enabled only when NEXT_PUBLIC_WEB_SEARCH_LIVE=true.",
    autocompleteLoading: "Loading suggestions…",
    autocompleteError: "Could not load suggestions right now.",
    similarListingsTitle: "Similar listings",
  },
};

export function searchUiCopy(locale: SiteLocale): SearchUiCopy {
  return COPY[locale];
}

export const FACET_SECTION_LABELS: Record<SiteLocale, Record<string, string>> = {
  ar: {
    category: "الفئة",
    offer_type: "نوع العرض",
    payment_plan: "الدفع",
    property_type: "نوع العقار",
    condition: "الحالة",
    fuel_type: "الوقود",
    transmission: "ناقل الحركة",
    industrial_type: "النوع الصناعي",
    industry: "الصناعة",
    origin_type: "المصدر",
    material: "الخامة",
  },
  en: {
    category: "Category",
    offer_type: "Offer type",
    payment_plan: "Payment",
    property_type: "Property type",
    condition: "Condition",
    fuel_type: "Fuel",
    transmission: "Transmission",
    industrial_type: "Industrial type",
    industry: "Industry",
    origin_type: "Origin",
    material: "Material",
  },
};
