/**
 * Humanizes the free-form `specs` JSON stored on real listings into readable,
 * bilingual label/value pairs for the detail screen. Every value shown comes
 * straight from the listing — nothing is fabricated. Unknown keys fall back to
 * a de-underscored, title-cased label so newly seeded spec keys still render.
 */
export interface FormattedSpec {
  label: string;
  value: string;
}

type Bi = { en: string; ar: string };

const SPEC_LABELS: Record<string, Bi> = {
  area: { en: "Area", ar: "المساحة" },
  land_area: { en: "Land Area", ar: "مساحة الأرض" },
  feddan: { en: "Area (Feddan)", ar: "المساحة (فدان)" },
  view: { en: "View", ar: "الإطلالة" },
  floor: { en: "Floor", ar: "الدور" },
  total_floors: { en: "Total Floors", ar: "عدد الأدوار" },
  rooms: { en: "Rooms", ar: "الغرف" },
  bedrooms: { en: "Bedrooms", ar: "غرف النوم" },
  bathrooms: { en: "Bathrooms", ar: "الحمامات" },
  compound: { en: "In Compound", ar: "داخل كمبوند" },
  finishing: { en: "Finishing", ar: "التشطيب" },
  furnished: { en: "Furnished", ar: "مفروش" },
  furnishing: { en: "Furnishing", ar: "الفرش" },
  delivery_date: { en: "Delivery", ar: "الاستلام" },
  property_type: { en: "Type", ar: "النوع" },
  usage: { en: "Usage", ar: "الاستخدام" },
  building_age_years: { en: "Building Age", ar: "عمر المبنى" },
  maintenance_per_year: { en: "Maintenance", ar: "الصيانة" },
  water: { en: "Water", ar: "مياه" },
  electricity: { en: "Electricity", ar: "كهرباء" },
  gas: { en: "Gas", ar: "غاز" },
  sewage: { en: "Sewage", ar: "صرف صحي" },
  road_access: { en: "Road Access", ar: "وصول الطريق" },
  parking: { en: "Parking", ar: "جراج" },
  elevator: { en: "Elevator", ar: "أسانسير" },
  garden: { en: "Garden", ar: "حديقة" },
  pool: { en: "Pool", ar: "حمام سباحة" },
  // ── Cars ──
  brand: { en: "Brand", ar: "الماركة" },
  make: { en: "Brand", ar: "الماركة" },
  model: { en: "Model", ar: "الموديل" },
  variant: { en: "Variant", ar: "الفئة" },
  trim: { en: "Trim", ar: "الفئة" },
  generation: { en: "Generation", ar: "الجيل" },
  year: { en: "Year", ar: "سنة الصنع" },
  mileage: { en: "Mileage", ar: "الكيلومترات" },
  condition: { en: "Condition", ar: "الحالة" },
  fuel_type: { en: "Fuel", ar: "الوقود" },
  transmission: { en: "Transmission", ar: "ناقل الحركة" },
  color: { en: "Color", ar: "اللون" },
  engine_cc: { en: "Engine", ar: "سعة المحرك" },
  horsepower: { en: "Horsepower", ar: "قوة المحرك" },
  cylinders: { en: "Cylinders", ar: "عدد السلندرات" },
  seats: { en: "Seats", ar: "المقاعد" },
  doors: { en: "Doors", ar: "الأبواب" },
  body_type: { en: "Body Type", ar: "نوع الهيكل" },
  drivetrain: { en: "Drivetrain", ar: "نظام الدفع" },
};

const VALUE_LABELS: Record<string, Record<string, Bi>> = {
  finishing: {
    super_lux: { en: "Super Lux", ar: "سوبر لوكس" },
    fully_finished: { en: "Fully Finished", ar: "تشطيب كامل" },
    semi_finished: { en: "Semi Finished", ar: "نص تشطيب" },
    core_shell: { en: "Core & Shell", ar: "على المحارة" },
    lux: { en: "Lux", ar: "لوكس" },
    luxury: { en: "Luxury", ar: "لوكشري" },
    unfinished: { en: "Unfinished", ar: "بدون تشطيب" },
  },
  view: {
    sea: { en: "Sea View", ar: "إطلالة بحرية" },
    nile: { en: "Nile View", ar: "إطلالة على النيل" },
    garden: { en: "Garden View", ar: "إطلالة على الحديقة" },
    pool: { en: "Pool View", ar: "إطلالة على البسين" },
    street: { en: "Street View", ar: "إطلالة على الشارع" },
    lagoon: { en: "Lagoon View", ar: "إطلالة على اللاجون" },
    open: { en: "Open View", ar: "إطلالة مفتوحة" },
  },
  property_type: {
    apartment: { en: "Apartment", ar: "شقة" },
    villa: { en: "Villa", ar: "فيلا" },
    duplex: { en: "Duplex", ar: "دوبلكس" },
    penthouse: { en: "Penthouse", ar: "بنتهاوس" },
    studio: { en: "Studio", ar: "استوديو" },
    townhouse: { en: "Townhouse", ar: "تاون هاوس" },
    twinhouse: { en: "Twin House", ar: "توين هاوس" },
    chalet: { en: "Chalet", ar: "شاليه" },
    office: { en: "Office", ar: "مكتب" },
    shop: { en: "Shop", ar: "محل تجاري" },
    clinic: { en: "Clinic", ar: "عيادة" },
    pharmacy: { en: "Pharmacy", ar: "صيدلية" },
    warehouse: { en: "Warehouse", ar: "مخزن" },
    factory: { en: "Factory", ar: "مصنع" },
    building: { en: "Building", ar: "مبنى" },
    land: { en: "Land", ar: "أرض" },
    residential_land: { en: "Residential Land", ar: "أرض سكنية" },
    commercial_land: { en: "Commercial Land", ar: "أرض تجارية" },
    industrial_land: { en: "Industrial Land", ar: "أرض صناعية" },
    agricultural_land: { en: "Agricultural Land", ar: "أرض زراعية" },
  },
  furnishing: {
    furnished: { en: "Furnished", ar: "مفروش" },
    semi_furnished: { en: "Semi Furnished", ar: "نص فرش" },
    unfurnished: { en: "Unfurnished", ar: "بدون فرش" },
  },
  usage: {
    residential: { en: "Residential", ar: "سكني" },
    commercial: { en: "Commercial", ar: "تجاري" },
    administrative: { en: "Administrative", ar: "إداري" },
    medical: { en: "Medical", ar: "طبي" },
    industrial: { en: "Industrial", ar: "صناعي" },
    agricultural: { en: "Agricultural", ar: "زراعي" },
  },
  // ── Cars ──
  condition: {
    new: { en: "New", ar: "جديدة" },
    used: { en: "Used", ar: "مستعملة" },
  },
  fuel_type: {
    petrol: { en: "Petrol", ar: "بنزين" },
    gasoline: { en: "Petrol", ar: "بنزين" },
    diesel: { en: "Diesel", ar: "ديزل" },
    hybrid: { en: "Hybrid", ar: "هايبرد" },
    electric: { en: "Electric", ar: "كهربائي" },
    natural_gas: { en: "Natural Gas", ar: "غاز طبيعي" },
  },
  transmission: {
    automatic: { en: "Automatic", ar: "أوتوماتيك" },
    manual: { en: "Manual", ar: "مانوال" },
    cvt: { en: "CVT", ar: "سي في تي" },
  },
  body_type: {
    sedan: { en: "Sedan", ar: "سيدان" },
    suv: { en: "SUV", ar: "إس يو في" },
    crossover: { en: "Crossover", ar: "كروس أوفر" },
    hatchback: { en: "Hatchback", ar: "هاتشباك" },
    coupe: { en: "Coupe", ar: "كوبيه" },
    convertible: { en: "Convertible", ar: "مكشوفة" },
    pickup: { en: "Pickup", ar: "بيك أب" },
    minivan: { en: "Minivan", ar: "ميني فان" },
    van: { en: "Van", ar: "فان" },
  },
  drivetrain: {
    fwd: { en: "FWD", ar: "دفع أمامي" },
    rwd: { en: "RWD", ar: "دفع خلفي" },
    awd: { en: "AWD", ar: "دفع رباعي" },
    "4wd": { en: "4WD", ar: "دفع رباعي" },
  },
  color: {
    black: { en: "Black", ar: "أسود" },
    white: { en: "White", ar: "أبيض" },
    silver: { en: "Silver", ar: "فضي" },
    gray: { en: "Gray", ar: "رمادي" },
    grey: { en: "Gray", ar: "رمادي" },
    red: { en: "Red", ar: "أحمر" },
    blue: { en: "Blue", ar: "أزرق" },
    navy: { en: "Navy", ar: "كحلي" },
    green: { en: "Green", ar: "أخضر" },
    brown: { en: "Brown", ar: "بني" },
    beige: { en: "Beige", ar: "بيج" },
    gold: { en: "Gold", ar: "ذهبي" },
    orange: { en: "Orange", ar: "برتقالي" },
    yellow: { en: "Yellow", ar: "أصفر" },
    burgundy: { en: "Burgundy", ar: "نبيتي" },
  },
};

const NUMERIC_UNIT: Record<string, Bi> = {
  area: { en: "m²", ar: "م²" },
  land_area: { en: "m²", ar: "م²" },
  feddan: { en: "feddan", ar: "فدان" },
  building_age_years: { en: "yr", ar: "سنة" },
  mileage: { en: "km", ar: "كم" },
  engine_cc: { en: "cc", ar: "سي سي" },
  horsepower: { en: "hp", ar: "حصان" },
};

/**
 * Integer specs that must render plain — no thousands separator. A model year is
 * "2019", not "2,019"; seat/door/cylinder counts are small integers.
 */
const NO_GROUPING = new Set(["year", "seats", "doors", "cylinders"]);

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function formatSpecKey(key: string, isRTL: boolean): string {
  const known = SPEC_LABELS[key];
  if (known) return isRTL ? known.ar : known.en;
  const humanized = key.replace(/_/g, " ");
  return isRTL ? humanized : titleCase(humanized);
}

export function formatSpecValue(
  key: string,
  value: unknown,
  isRTL: boolean
): string {
  if (typeof value === "boolean") {
    return value ? (isRTL ? "نعم" : "Yes") : isRTL ? "لا" : "No";
  }

  const lower = String(value).toLowerCase().replace(/\s+/g, "_");
  const enumLabel = VALUE_LABELS[key]?.[lower];
  if (enumLabel) return isRTL ? enumLabel.ar : enumLabel.en;

  if (typeof value === "number" || /^\d[\d,]*\.?\d*$/.test(String(value))) {
    const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    if (Number.isFinite(num)) {
      if (NO_GROUPING.has(key)) {
        const plain = isRTL
          ? num.toLocaleString("ar-EG", { useGrouping: false })
          : String(num);
        const noGroupUnit = NUMERIC_UNIT[key];
        return noGroupUnit ? `${plain} ${isRTL ? noGroupUnit.ar : noGroupUnit.en}` : plain;
      }
      const formatted = num.toLocaleString(isRTL ? "ar-EG" : "en-US");
      if (key === "maintenance_per_year") {
        return isRTL ? `${formatted} ج.م/سنة` : `${formatted} EGP/yr`;
      }
      const unit = NUMERIC_UNIT[key];
      if (unit) return `${formatted} ${isRTL ? unit.ar : unit.en}`;
      return formatted;
    }
  }

  const str = String(value).replace(/_/g, " ");
  return isRTL ? str : titleCase(str);
}

/**
 * Spec keys that are handled by dedicated UI elsewhere on the detail screen and
 * must not be repeated in the generic specs grid.
 */
export const HIDDEN_SPEC_KEYS = new Set([
  "contact_phones",
  "payment_options",
  "payment_option",
  "industrial_type",
]);

export function formatSpecs(
  specs: Record<string, unknown> | undefined,
  isRTL: boolean
): FormattedSpec[] {
  if (!specs) return [];
  const out: FormattedSpec[] = [];
  for (const [key, value] of Object.entries(specs)) {
    if (HIDDEN_SPEC_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) || typeof value === "object") continue;
    out.push({
      label: formatSpecKey(key, isRTL),
      value: formatSpecValue(key, value, isRTL),
    });
  }
  return out;
}
