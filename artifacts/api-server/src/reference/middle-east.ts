/**
 * Middle-East geo/real-estate reference data (2026) — real cities, districts and
 * notable developments for the Gulf + Levant markets. Same standalone reference
 * set as Egypt; adding a country is pure data (no schema change), which is the
 * whole point of the adjacency-list design.
 *
 * Scope: major cities + well-known districts / master-communities / flagship
 * projects, with developers linked where confidently known. Not exhaustive —
 * a real, clutter-free starter that the pending-locations learning loop grows.
 * Coordinates are intentionally null (not guessed).
 */
import type { DevSeed, PlaceSeed } from "./egypt";

const cp = (
  slug: string,
  en: string,
  ar: string,
  developer?: string,
  keywords?: string[],
): PlaceSeed => ({ slug, type: "compound", en, ar, developer, keywords });

/* ── Developers (Gulf + Levant) ─────────────────────────── */
export const MIDDLE_EAST_DEVELOPERS: DevSeed[] = [
  { slug: "emaar-properties", en: "Emaar Properties", ar: "إعمار العقارية", keywords: ["Emaar", "إعمار"] },
  { slug: "damac", en: "DAMAC Properties", ar: "داماك", keywords: ["Damac", "داماك"] },
  { slug: "nakheel", en: "Nakheel", ar: "نخيل", keywords: ["Nakheel", "نخيل"] },
  { slug: "meraas", en: "Meraas", ar: "ميراس", keywords: ["Meraas", "ميراس"] },
  { slug: "dubai-properties", en: "Dubai Properties", ar: "دبي العقارية", keywords: ["Dubai Properties"] },
  { slug: "sobha-realty", en: "Sobha Realty", ar: "صوبها", keywords: ["Sobha", "صوبها"] },
  { slug: "aldar", en: "Aldar Properties", ar: "الدار العقارية", keywords: ["Aldar", "الدار"] },
  { slug: "majid-al-futtaim", en: "Majid Al Futtaim", ar: "ماجد الفطيم", keywords: ["Majid Al Futtaim", "الفطيم"] },
  { slug: "roshn", en: "ROSHN", ar: "روشن", keywords: ["Roshn", "روشن"] },
  { slug: "qatari-diar", en: "Qatari Diar", ar: "الديار القطرية", keywords: ["Qatari Diar", "الديار"] },
  { slug: "united-development", en: "United Development Company", ar: "الشركة المتحدة للتنمية", keywords: ["UDC", "The Pearl"] },
  { slug: "diyar-al-muharraq", en: "Diyar Al Muharraq", ar: "ديار المحرق", keywords: ["Diyar Al Muharraq", "ديار المحرق"] },
];

/* ── Country trees ──────────────────────────────────────── */
const SAUDI_ARABIA: PlaceSeed = {
  slug: "saudi-arabia", type: "country", en: "Saudi Arabia", ar: "السعودية",
  keywords: ["Saudi", "السعودية", "KSA", "المملكة"],
  children: [
    {
      slug: "riyadh", type: "city", en: "Riyadh", ar: "الرياض", popularity: 95,
      keywords: ["Riyadh", "الرياض"],
      children: [
        { slug: "al-olaya", type: "district", en: "Al Olaya", ar: "العليا", keywords: ["Olaya", "العليا"] },
        { slug: "kafd", type: "district", en: "King Abdullah Financial District", ar: "المركز المالي (كافد)", keywords: ["KAFD", "كافد", "المركز المالي"] },
        { slug: "al-malqa", type: "district", en: "Al Malqa", ar: "الملقا", keywords: ["Malqa", "الملقا"] },
        { slug: "hittin", type: "district", en: "Hittin", ar: "حطين", keywords: ["Hittin", "حطين"] },
        { slug: "al-narjis", type: "district", en: "Al Narjis", ar: "النرجس", keywords: ["Narjis", "النرجس"] },
        { slug: "diriyah", type: "district", en: "Diriyah", ar: "الدرعية", keywords: ["Diriyah", "الدرعية"] },
        cp("new-murabba", "New Murabba", "المربع الجديد", undefined, ["Murabba", "المربع"]),
        cp("sedra", "Sedra", "سدرة", "roshn", ["Sedra", "سدرة"]),
      ],
    },
    {
      slug: "jeddah", type: "city", en: "Jeddah", ar: "جدة", popularity: 90,
      keywords: ["Jeddah", "جدة"],
      children: [
        { slug: "al-hamra", type: "district", en: "Al Hamra", ar: "الحمراء", keywords: ["Hamra", "الحمراء"] },
        { slug: "obhur", type: "district", en: "Obhur", ar: "أبحر", keywords: ["Obhur", "ابحر"] },
        { slug: "al-shati", type: "district", en: "Al Shati", ar: "الشاطئ", keywords: ["Shati", "الشاطئ"] },
        cp("jeddah-central", "Jeddah Central", "وسط جدة", undefined, ["Jeddah Central", "وسط جدة"]),
      ],
    },
    { slug: "dammam", type: "city", en: "Dammam", ar: "الدمام", keywords: ["Dammam", "الدمام"] },
    { slug: "al-khobar", type: "city", en: "Al Khobar", ar: "الخبر", keywords: ["Khobar", "الخبر"] },
    { slug: "mecca", type: "city", en: "Mecca", ar: "مكة", keywords: ["Mecca", "Makkah", "مكة"] },
    { slug: "medina", type: "city", en: "Medina", ar: "المدينة المنورة", keywords: ["Medina", "Madinah", "المدينة"] },
    { slug: "neom", type: "region", en: "NEOM", ar: "نيوم", keywords: ["NEOM", "نيوم"], popularity: 80,
      children: [
        cp("the-line", "The Line", "ذا لاين", undefined, ["The Line", "ذا لاين"]),
        cp("oxagon", "Oxagon", "أوكساجون", undefined),
        cp("trojena", "Trojena", "تروجينا", undefined),
      ],
    },
    { slug: "kaec", type: "city", en: "King Abdullah Economic City", ar: "مدينة الملك عبدالله الاقتصادية", keywords: ["KAEC", "عبدالله الاقتصادية"] },
  ],
};

const UAE: PlaceSeed = {
  slug: "uae", type: "country", en: "United Arab Emirates", ar: "الإمارات",
  keywords: ["UAE", "Emirates", "الإمارات", "الامارات"],
  children: [
    {
      slug: "dubai", type: "city", en: "Dubai", ar: "دبي", popularity: 96,
      keywords: ["Dubai", "دبي"],
      children: [
        cp("downtown-dubai", "Downtown Dubai", "وسط مدينة دبي", "emaar-properties", ["Downtown", "وسط دبي", "برج خليفة"]),
        cp("dubai-marina", "Dubai Marina", "دبي مارينا", undefined, ["Marina", "مارينا"]),
        cp("palm-jumeirah", "Palm Jumeirah", "نخلة جميرا", "nakheel", ["Palm", "النخلة", "نخلة"]),
        cp("business-bay", "Business Bay", "الخليج التجاري", undefined, ["Business Bay", "الخليج التجاري"]),
        cp("jvc", "Jumeirah Village Circle", "قرية جميرا الدائرية", "nakheel", ["JVC", "جميرا فيلدج"]),
        cp("dubai-hills-estate", "Dubai Hills Estate", "دبي هيلز", "emaar-properties", ["Dubai Hills", "دبي هيلز"]),
        cp("arabian-ranches", "Arabian Ranches", "المرابع العربية", "emaar-properties", ["Arabian Ranches", "المرابع"]),
        cp("emirates-hills", "Emirates Hills", "تلال الإمارات", undefined, ["Emirates Hills", "تلال الامارات"]),
        cp("jbr", "Jumeirah Beach Residence", "جي بي آر", undefined, ["JBR", "جي بي ار"]),
        cp("dubai-creek-harbour", "Dubai Creek Harbour", "مرسى خور دبي", "emaar-properties", ["Creek Harbour", "خور دبي"]),
        cp("damac-hills", "DAMAC Hills", "داماك هيلز", "damac", ["Damac Hills", "داماك هيلز"]),
        cp("dubai-south", "Dubai South", "دبي الجنوب", undefined, ["Dubai South", "دبي الجنوب"]),
      ],
    },
    {
      slug: "abu-dhabi", type: "city", en: "Abu Dhabi", ar: "أبوظبي", popularity: 90,
      keywords: ["Abu Dhabi", "أبوظبي", "ابوظبي"],
      children: [
        cp("yas-island", "Yas Island", "جزيرة ياس", "aldar", ["Yas", "ياس"]),
        cp("saadiyat-island", "Saadiyat Island", "جزيرة السعديات", "aldar", ["Saadiyat", "السعديات"]),
        cp("al-reem-island", "Al Reem Island", "جزيرة الريم", undefined, ["Reem", "الريم"]),
        cp("al-raha-beach", "Al Raha Beach", "شاطئ الراحة", "aldar", ["Al Raha", "الراحة"]),
        { slug: "khalifa-city", type: "district", en: "Khalifa City", ar: "مدينة خليفة", keywords: ["Khalifa City", "مدينة خليفة"] },
      ],
    },
    { slug: "sharjah", type: "city", en: "Sharjah", ar: "الشارقة", keywords: ["Sharjah", "الشارقة"] },
    { slug: "ajman", type: "city", en: "Ajman", ar: "عجمان", keywords: ["Ajman", "عجمان"] },
    { slug: "ras-al-khaimah", type: "city", en: "Ras Al Khaimah", ar: "رأس الخيمة", keywords: ["Ras Al Khaimah", "RAK", "رأس الخيمة"],
      children: [cp("al-marjan-island", "Al Marjan Island", "جزيرة المرجان", undefined, ["Marjan", "المرجان"])] },
    { slug: "fujairah", type: "city", en: "Fujairah", ar: "الفجيرة", keywords: ["Fujairah", "الفجيرة"] },
  ],
};

const QATAR: PlaceSeed = {
  slug: "qatar", type: "country", en: "Qatar", ar: "قطر", keywords: ["Qatar", "قطر"],
  children: [
    {
      slug: "doha", type: "city", en: "Doha", ar: "الدوحة", popularity: 88,
      keywords: ["Doha", "الدوحة"],
      children: [
        cp("the-pearl", "The Pearl", "اللؤلؤة", "united-development", ["Pearl", "اللؤلؤة", "لؤلؤة قطر"]),
        cp("west-bay", "West Bay", "الخليج الغربي", undefined, ["West Bay", "الخليج الغربي"]),
        cp("msheireb", "Msheireb Downtown", "مشيرب", undefined, ["Msheireb", "مشيرب"]),
        { slug: "al-sadd", type: "district", en: "Al Sadd", ar: "السد", keywords: ["Al Sadd", "السد"] },
        { slug: "al-waab", type: "district", en: "Al Waab", ar: "الوعب", keywords: ["Al Waab", "الوعب"] },
      ],
    },
    { slug: "lusail", type: "city", en: "Lusail", ar: "لوسيل", keywords: ["Lusail", "لوسيل"], popularity: 70, developer: "qatari-diar" },
    { slug: "al-rayyan", type: "city", en: "Al Rayyan", ar: "الريان", keywords: ["Al Rayyan", "الريان"] },
  ],
};

const KUWAIT: PlaceSeed = {
  slug: "kuwait", type: "country", en: "Kuwait", ar: "الكويت", keywords: ["Kuwait", "الكويت"],
  children: [
    { slug: "kuwait-city", type: "city", en: "Kuwait City", ar: "مدينة الكويت", popularity: 80, keywords: ["Kuwait City", "مدينة الكويت"] },
    { slug: "salmiya", type: "city", en: "Salmiya", ar: "السالمية", keywords: ["Salmiya", "السالمية"] },
    { slug: "hawalli", type: "city", en: "Hawalli", ar: "حولي", keywords: ["Hawalli", "حولي"] },
    { slug: "al-ahmadi", type: "city", en: "Al Ahmadi", ar: "الأحمدي", keywords: ["Ahmadi", "الأحمدي"] },
    { slug: "al-jahra", type: "city", en: "Al Jahra", ar: "الجهراء", keywords: ["Jahra", "الجهراء"] },
    { slug: "sabah-al-salem", type: "city", en: "Sabah Al Salem", ar: "صباح السالم", keywords: ["Sabah Al Salem", "صباح السالم"] },
  ],
};

const BAHRAIN: PlaceSeed = {
  slug: "bahrain", type: "country", en: "Bahrain", ar: "البحرين", keywords: ["Bahrain", "البحرين"],
  children: [
    { slug: "manama", type: "city", en: "Manama", ar: "المنامة", popularity: 78, keywords: ["Manama", "المنامة"],
      children: [{ slug: "seef", type: "district", en: "Seef", ar: "السيف", keywords: ["Seef", "السيف"] }] },
    { slug: "riffa", type: "city", en: "Riffa", ar: "الرفاع", keywords: ["Riffa", "الرفاع"] },
    { slug: "muharraq", type: "city", en: "Muharraq", ar: "المحرق", keywords: ["Muharraq", "المحرق"] },
    { slug: "amwaj-islands", type: "city", en: "Amwaj Islands", ar: "جزر أمواج", keywords: ["Amwaj", "أمواج"] },
    { slug: "diyar-al-muharraq", type: "city", en: "Diyar Al Muharraq", ar: "ديار المحرق", developer: "diyar-al-muharraq", keywords: ["Diyar Al Muharraq", "ديار المحرق"] },
  ],
};

const OMAN: PlaceSeed = {
  slug: "oman", type: "country", en: "Oman", ar: "عُمان", keywords: ["Oman", "عمان", "سلطنة عمان"],
  children: [
    { slug: "muscat", type: "city", en: "Muscat", ar: "مسقط", popularity: 76, keywords: ["Muscat", "مسقط"],
      children: [cp("al-mouj", "Al Mouj", "الموج", undefined, ["Al Mouj", "الموج"])] },
    { slug: "salalah", type: "city", en: "Salalah", ar: "صلالة", keywords: ["Salalah", "صلالة"] },
    { slug: "sohar", type: "city", en: "Sohar", ar: "صحار", keywords: ["Sohar", "صحار"] },
    { slug: "nizwa", type: "city", en: "Nizwa", ar: "نزوى", keywords: ["Nizwa", "نزوى"] },
  ],
};

const JORDAN: PlaceSeed = {
  slug: "jordan", type: "country", en: "Jordan", ar: "الأردن", keywords: ["Jordan", "الأردن", "الاردن"],
  children: [
    {
      slug: "amman", type: "city", en: "Amman", ar: "عمّان", popularity: 82, keywords: ["Amman", "عمان", "عمّان"],
      children: [
        { slug: "abdoun", type: "district", en: "Abdoun", ar: "عبدون", keywords: ["Abdoun", "عبدون"] },
        { slug: "dabouq", type: "district", en: "Dabouq", ar: "دابوق", keywords: ["Dabouq", "دابوق"] },
        { slug: "khalda", type: "district", en: "Khalda", ar: "خلدا", keywords: ["Khalda", "خلدا"] },
        { slug: "deir-ghbar", type: "district", en: "Deir Ghbar", ar: "دير غبار", keywords: ["Deir Ghbar", "دير غبار"] },
        { slug: "jabal-amman", type: "district", en: "Jabal Amman", ar: "جبل عمان", keywords: ["Jabal Amman", "جبل عمان"] },
      ],
    },
    { slug: "zarqa", type: "city", en: "Zarqa", ar: "الزرقاء", keywords: ["Zarqa", "الزرقاء"] },
    { slug: "irbid", type: "city", en: "Irbid", ar: "إربد", keywords: ["Irbid", "اربد"] },
    { slug: "aqaba", type: "city", en: "Aqaba", ar: "العقبة", keywords: ["Aqaba", "العقبة"] },
  ],
};

export const MIDDLE_EAST_COUNTRIES: Array<{ iso: string; tree: PlaceSeed }> = [
  { iso: "SA", tree: SAUDI_ARABIA },
  { iso: "AE", tree: UAE },
  { iso: "QA", tree: QATAR },
  { iso: "KW", tree: KUWAIT },
  { iso: "BH", tree: BAHRAIN },
  { iso: "OM", tree: OMAN },
  { iso: "JO", tree: JORDAN },
];
