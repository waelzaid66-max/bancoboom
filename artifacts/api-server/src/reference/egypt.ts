/**
 * Egypt reference dataset (Phase 1) — cities, districts, communities, compounds
 * and developers up to 2026, sourced from the product owner's own curated lists.
 *
 * This is REFERENCE data only (search / autocomplete / ranking). It creates no
 * listings and touches no live table. Coordinates are intentionally omitted
 * (left null) rather than guessed — geo can be backfilled from a trusted source
 * later without any schema change.
 *
 * Shape: a nested tree. The seed runner flattens it, builds a stable `globalId`
 * path, wires `parentId`, and computes the trigram search blob. Re-running is
 * idempotent (upsert by globalId / developer slug).
 */

export interface DevSeed {
  slug: string;
  en: string;
  ar: string;
  keywords?: string[];
  aliases?: string[];
}

export interface PlaceSeed {
  slug: string;
  type: string; // country · region · city · district · community · compound · phase
  en: string;
  ar?: string;
  keywords?: string[];
  aliases?: string[];
  developer?: string; // developer slug — only where confidently known
  popularity?: number;
  children?: PlaceSeed[];
}

/* ── Developers (Egypt) ─────────────────────────────────── */
export const EGYPT_DEVELOPERS: DevSeed[] = [
  { slug: "talaat-moustafa-group", en: "Talaat Moustafa Group", ar: "مجموعة طلعت مصطفى", keywords: ["TMG", "طلعت مصطفى", "تي ام جي", "talaat"] },
  { slug: "emaar-misr", en: "Emaar Misr", ar: "إعمار مصر", keywords: ["Emaar", "إعمار", "امار"] },
  { slug: "palm-hills", en: "Palm Hills Developments", ar: "بالم هيلز", keywords: ["Palm Hills", "بالم هيلز", "PHD"] },
  { slug: "mountain-view", en: "Mountain View", ar: "ماونتن فيو", keywords: ["Mountain View", "ماونتن فيو", "MV", "DMG"] },
  { slug: "misr-italia", en: "Misr Italia Properties", ar: "مصر إيطاليا", keywords: ["Misr Italia", "مصر ايطاليا", "مصر إيطاليا"] },
  { slug: "sodic", en: "SODIC", ar: "سوديك", keywords: ["SODIC", "سوديك", "سو ديك"] },
  { slug: "ora-developers", en: "Ora Developers", ar: "أورا للتطوير", keywords: ["Ora", "أورا", "اورا", "ساويرس"] },
  { slug: "hyde-park", en: "Hyde Park Developments", ar: "هايد بارك", keywords: ["Hyde Park", "هايد بارك"] },
  { slug: "al-ahly-sabbour", en: "Al Ahly Sabbour", ar: "الأهلي صبور", keywords: ["Sabbour", "صبور", "الاهلي صبور"] },
  { slug: "hassan-allam", en: "Hassan Allam Properties", ar: "حسن علام", keywords: ["Hassan Allam", "حسن علام"] },
  { slug: "city-edge", en: "City Edge Developments", ar: "سيتي إيدج", keywords: ["City Edge", "سيتي ايدج", "سيتي إيدج"] },
  { slug: "lmd", en: "LMD", ar: "إل إم دي", keywords: ["LMD", "ال ام دي"] },
  { slug: "tatweer-misr", en: "Tatweer Misr", ar: "تطوير مصر", keywords: ["Tatweer Misr", "تطوير مصر"] },
  { slug: "cred", en: "CRED", ar: "كريد", keywords: ["CRED", "كريد"] },
  { slug: "la-vista", en: "La Vista Developments", ar: "لافيستا", keywords: ["La Vista", "لافيستا", "لا فيستا"] },
];

/* helper builders for terser trees */
const c = (
  slug: string,
  en: string,
  ar: string | undefined,
  developer?: string,
  keywords?: string[]
): PlaceSeed => ({ slug, type: "compound", en, ar, developer, keywords });

/* ── The Egypt tree ─────────────────────────────────────── */
export const EGYPT_TREE: PlaceSeed = {
  slug: "egypt",
  type: "country",
  en: "Egypt",
  ar: "مصر",
  keywords: ["Egypt", "مصر", "EG", "egypt"],
  children: [
    {
      slug: "new-cairo",
      type: "city",
      en: "New Cairo",
      ar: "القاهرة الجديدة",
      keywords: ["New Cairo", "القاهرة الجديدة", "نيو كايرو", "new cairo"],
      popularity: 90,
      children: [
        { slug: "first-settlement", type: "community", en: "First Settlement", ar: "التجمع الأول", keywords: ["First Settlement", "التجمع الأول", "التجمع الاول"] },
        { slug: "third-settlement", type: "community", en: "Third Settlement", ar: "التجمع الثالث", keywords: ["Third Settlement", "التجمع الثالث"] },
        {
          slug: "fifth-settlement",
          type: "community",
          en: "Fifth Settlement",
          ar: "التجمع الخامس",
          keywords: ["Fifth Settlement", "التجمع الخامس", "Fifth", "خامس", "New Cairo"],
          popularity: 95,
          children: [
            c("hyde-park-new-cairo", "Hyde Park", "هايد بارك", "hyde-park", ["Hyde Park", "هايد بارك"]),
            c("mountain-view-icity-nc", "Mountain View iCity", "ماونتن فيو آي سيتي", "mountain-view", ["iCity", "اي سيتي", "ماونتن فيو"]),
            c("palm-hills-new-cairo", "Palm Hills New Cairo", "بالم هيلز نيو كايرو", "palm-hills", ["PHNC", "بالم هيلز"]),
            c("mivida", "Mivida", "ميفيدا", "emaar-misr", ["Mivida", "ميفيدا", "mivida"]),
            c("taj-city", "Taj City", "تاج سيتي", undefined, ["Taj City", "تاج سيتي"]),
            c("stone-residence", "Stone Residence", "ستون ريزيدنس", undefined, ["Stone Residence", "ستون"]),
            c("villette", "Villette", "فيليت", "sodic", ["Villette", "فيليت"]),
            c("zed-east", "Zed East", "زيد إيست", "ora-developers", ["Zed East", "زيد ايست", "زد"]),
            c("the-waterway", "The Waterway", "ووتر واي", undefined, ["Waterway", "ووتر واي"]),
            c("district-5", "District 5", "ديستريكت 5", "lmd", ["District 5", "ديستريكت 5", "district five"]),
            c("lake-view", "Lake View", "ليك فيو", undefined, ["Lake View", "ليك فيو"]),
            c("fifth-square", "Fifth Square", "فيفث سكوير", "al-ahly-sabbour", ["Fifth Square", "فيفث سكوير"]),
            c("trio-gardens", "Trio Gardens", "تريو جاردنز", undefined, ["Trio Gardens", "تريو"]),
            c("eastown", "Eastown", "إيستاون", "sodic", ["Eastown", "ايستاون"]),
            c("la-mirada", "La Mirada", "لا ميرادا", undefined, ["La Mirada", "لا ميرادا"]),
            c("azad", "Azad", "أزاد", undefined, ["Azad", "ازاد"]),
            c("galleria-moon-valley", "Galleria Moon Valley", "جاليريا مون فالي", undefined, ["Galleria", "جاليريا"]),
            c("al-marasem", "Al Marasem", "المراسم", undefined, ["Marasem", "المراسم"]),
            c("the-brooks", "The Brooks", "ذا بروكس", undefined, ["Brooks", "بروكس"]),
          ],
        },
        {
          slug: "sixth-settlement",
          type: "community",
          en: "Sixth Settlement",
          ar: "التجمع السادس",
          keywords: ["Sixth Settlement", "التجمع السادس"],
          children: [
            c("el-patio-jade", "El Patio Jade", "الباتيو جيد", undefined),
            c("via", "Via", "فيا", undefined),
            c("grand-lane", "Grand Lane", "جراند لين", undefined),
            c("new-lush-valley", "New Lush Valley", "لاش فالي", undefined),
            c("vx-golden-square", "VX Golden Square", "في إكس جولدن سكوير", undefined),
            c("mayan", "Mayan", "مايان", undefined),
          ],
        },
        { slug: "beit-al-watan", type: "community", en: "Beit Al Watan", ar: "بيت الوطن", keywords: ["Beit Al Watan", "بيت الوطن"] },
        { slug: "north-investors", type: "community", en: "Northern Investors", ar: "المستثمرين الشمالية", keywords: ["المستثمرين الشمالية"] },
        { slug: "south-investors", type: "community", en: "Southern Investors", ar: "المستثمرين الجنوبية", keywords: ["المستثمرين الجنوبية"] },
        { slug: "south-academy", type: "community", en: "South Academy", ar: "جنوب الأكاديمية", keywords: ["جنوب الأكاديمية", "الاكاديمية"] },
        { slug: "lotus", type: "neighborhood", en: "Lotus", ar: "اللوتس", keywords: ["Lotus", "اللوتس"] },
        { slug: "andalus", type: "neighborhood", en: "Andalus", ar: "الأندلس", keywords: ["Andalus", "الاندلس"] },
        { slug: "narges", type: "neighborhood", en: "Narges", ar: "النرجس", keywords: ["Narges", "النرجس"] },
        { slug: "banafseg", type: "neighborhood", en: "Banafseg", ar: "البنفسج", keywords: ["Banafseg", "البنفسج"] },
        { slug: "qrnfl", type: "neighborhood", en: "Qrnfl", ar: "القرنفل", keywords: ["القرنفل"] },
        { slug: "yasmine", type: "neighborhood", en: "Yasmine", ar: "الياسمين", keywords: ["Yasmine", "الياسمين"] },
        { slug: "diplomaseyeen", type: "neighborhood", en: "Diplomats", ar: "الدبلوماسيين", keywords: ["الدبلوماسيين"] },
      ],
    },
    {
      slug: "new-administrative-capital",
      type: "city",
      en: "New Administrative Capital",
      ar: "العاصمة الإدارية الجديدة",
      keywords: ["العاصمة", "العاصمة الإدارية", "NAC", "New Capital", "العاصمة الجديدة", "new capital"],
      aliases: ["NAC", "New Capital"],
      popularity: 95,
      children: [
        { slug: "r1", type: "district", en: "R1", ar: "آر 1", keywords: ["R1"] },
        { slug: "r2", type: "district", en: "R2", ar: "آر 2", keywords: ["R2"] },
        { slug: "r3", type: "district", en: "R3", ar: "آر 3", keywords: ["R3"] },
        { slug: "r5", type: "district", en: "R5", ar: "آر 5", keywords: ["R5"] },
        { slug: "r7", type: "district", en: "R7", ar: "آر 7", keywords: ["R7"] },
        { slug: "r8", type: "district", en: "R8", ar: "آر 8", keywords: ["R8"] },
        { slug: "diplomatic-district", type: "district", en: "Diplomatic District", ar: "الحي الدبلوماسي", keywords: ["الحي الدبلوماسي"] },
        { slug: "government-district", type: "district", en: "Government District", ar: "الحي الحكومي", keywords: ["الحي الحكومي"] },
        { slug: "financial-district", type: "district", en: "Financial District", ar: "الحي المالي", keywords: ["الحي المالي"] },
        { slug: "cbd", type: "district", en: "Central Business District", ar: "منطقة الأعمال المركزية", keywords: ["CBD", "الأعمال المركزية"] },
        { slug: "green-river", type: "district", en: "Green River", ar: "النهر الأخضر", keywords: ["Green River", "النهر الأخضر"] },
        c("village-de-la-capitale", "Village de la Capitale", "فيلاج دي لا كابيتال", undefined),
        c("la-vista-city", "La Vista City", "لافيستا سيتي", "la-vista", ["La Vista City", "لافيستا سيتي"]),
        c("winter-park", "Winter Park", "وينتر بارك", undefined),
        c("lumia-lagoon", "Lumia Lagoon", "لوميا لاجون", undefined),
        c("right-nac", "Right", "رايت", undefined),
        c("the-island-nac", "The Island", "ذا آيلاند", undefined),
        c("qamari", "Qamari", "قمري", undefined),
        c("midtown-condo", "Midtown Condo", "ميدتاون كوندو", undefined),
        c("midtown-sky", "Midtown Sky", "ميدتاون سكاي", undefined),
        c("capital-heights", "Capital Heights", "كابيتال هايتس", undefined),
        c("de-joya", "De Joya", "دي جويا", undefined),
        c("il-bosco", "Il Bosco", "إل بوسكو", "misr-italia", ["Il Bosco", "بوسكو"]),
        c("scenario", "Scenario", "سيناريو", undefined),
        c("serrano", "Serrano", "سيرانو", undefined),
        c("castle-landmark", "Castle Landmark", "كاسل لاندمارك", undefined),
        c("entrada", "Entrada", "إنترادا", undefined),
        c("sueno", "Sueno", "سوينو", undefined),
        c("celia", "Celia", "سيليا", "talaat-moustafa-group", ["Celia", "سيليا"]),
      ],
    },
    {
      slug: "sheikh-zayed",
      type: "city",
      en: "Sheikh Zayed",
      ar: "الشيخ زايد",
      keywords: ["Sheikh Zayed", "الشيخ زايد", "زايد", "zayed"],
      popularity: 90,
      children: [
        c("zed-west", "Zed West", "زيد ويست", "ora-developers", ["Zed West", "زد ويست"]),
        c("beverly-hills", "Beverly Hills", "بيفرلي هيلز", "sodic", ["Beverly Hills", "بيفرلي"]),
        c("allegria", "Allegria", "أليجريا", "sodic", ["Allegria", "اليجريا"]),
        c("karma", "Karma", "كارما", undefined),
        c("belle-vie", "Belle Vie", "بيل في", undefined, ["Belle Vie", "بيل في"]),
        c("cairo-gate", "Cairo Gate", "كايرو جيت", "palm-hills", ["Cairo Gate", "كايرو جيت"]),
        c("rivers", "Rivers", "ريفرز", undefined),
        c("solana", "Solana", "سولانا", "ora-developers", ["Solana", "سولانا"]),
        c("vye", "Vye", "فاي", "sodic", ["Vye"]),
        c("the-estates", "The Estates", "ذا استيتس", "sodic", ["Estates", "استيتس"]),
      ],
    },
    {
      slug: "new-zayed",
      type: "city",
      en: "New Zayed",
      ar: "نيو زايد",
      keywords: ["New Zayed", "نيو زايد", "زايد الجديدة"],
      children: [
        c("solana-new-zayed", "Solana New Zayed", "سولانا نيو زايد", "ora-developers"),
        c("belle-vie-new-zayed", "Belle Vie", "بيل في", undefined),
        c("de-joya-new-zayed", "De Joya New Zayed", "دي جويا", undefined),
        c("karmell", "Karmell", "كارميل", undefined),
        c("naia-west", "Naia West", "نايا ويست", undefined),
        c("hills-of-one", "Hills of One", "هيلز أوف وان", undefined),
      ],
    },
    {
      slug: "6th-of-october",
      type: "city",
      en: "6th of October",
      ar: "السادس من أكتوبر",
      keywords: ["6 October", "6 أكتوبر", "السادس من أكتوبر", "october", "اكتوبر"],
      popularity: 88,
      children: [
        c("badya", "Badya", "بادية", "palm-hills", ["Badya", "بادية"]),
        c("mountain-view-chillout-park", "Mountain View Chillout Park", "ماونتن فيو تشيل أوت", "mountain-view"),
        c("palm-parks", "Palm Parks", "بالم باركس", "palm-hills"),
        c("palm-valley", "Palm Valley", "بالم فالي", "palm-hills"),
        c("o-west", "O West", "أو ويست", undefined, ["O West", "او ويست"]),
        c("october-plaza", "October Plaza", "أكتوبر بلازا", "sodic"),
        c("mountain-view-giza-plateau", "Mountain View Giza Plateau", "ماونتن فيو هضبة الأهرام", "mountain-view"),
        c("sun-capital", "Sun Capital", "صن كابيتال", undefined),
        c("green-5", "Green 5", "جرين 5", undefined),
      ],
    },
    { slug: "new-october", type: "city", en: "New October", ar: "أكتوبر الجديدة", keywords: ["أكتوبر الجديدة", "new october"] },
    { slug: "october-gardens", type: "city", en: "October Gardens", ar: "حدائق أكتوبر", keywords: ["حدائق أكتوبر", "october gardens"] },
    {
      slug: "mostakbal-city",
      type: "city",
      en: "Mostakbal City",
      ar: "مدينة المستقبل",
      keywords: ["Mostakbal", "Mostakbal City", "المستقبل", "Future City", "مستقبل سيتي"],
      aliases: ["Future City", "مدينة المستقبل"],
      popularity: 85,
      children: [
        c("bloomfields", "Bloomfields", "بلوم فيلدز", "tatweer-misr", ["Bloomfields", "بلوم فيلدز"]),
        c("sarai", "Sarai", "سراي", undefined, ["Sarai", "سراي"]),
        c("the-city-of-odyssia", "The City of Odyssia", "أوديسيا", undefined),
        c("il-bosco-city", "Il Bosco City", "إل بوسكو سيتي", "misr-italia", ["Il Bosco City", "بوسكو سيتي"]),
        c("aria", "Aria", "آريا", undefined),
        c("the-rift", "The Rift", "ذا ريفت", undefined),
        c("green-square", "Green Square", "جرين سكوير", undefined),
        c("haptown", "Haptown", "هاب تاون", "hassan-allam", ["Haptown", "هاب تاون"]),
        c("beta-greens", "Beta Greens", "بيتا جرينز", undefined),
        c("midtown", "Midtown", "ميدتاون", undefined),
        c("cityzen", "CityZen", "سيتي زن", undefined),
        c("new-lakes", "New Lakes", "نيو ليكس", undefined),
      ],
    },
    { slug: "madinaty", type: "community", en: "Madinaty", ar: "مدينتي", developer: "talaat-moustafa-group", keywords: ["مدينتي", "madinaty", "madinty", "madinati", "مدينة طلعت مصطفى"], popularity: 92 },
    { slug: "al-rehab", type: "community", en: "Al Rehab", ar: "الرحاب", developer: "talaat-moustafa-group", keywords: ["الرحاب", "rehab", "al rehab", "مدينة الرحاب"], popularity: 88 },
    { slug: "shorouk", type: "city", en: "El Shorouk", ar: "الشروق", keywords: ["Shorouk", "الشروق", "el shorouk"] },
    { slug: "shorouk-new", type: "city", en: "New Shorouk", ar: "الشروق الجديدة", keywords: ["الشروق الجديدة"] },
    { slug: "badr", type: "city", en: "Badr City", ar: "بدر", keywords: ["Badr", "بدر", "مدينة بدر"] },
    { slug: "badr-new", type: "city", en: "New Badr", ar: "بدر الجديدة", keywords: ["بدر الجديدة"] },
    { slug: "obour", type: "city", en: "El Obour", ar: "العبور", keywords: ["Obour", "العبور"] },
    { slug: "new-obour", type: "city", en: "New Obour", ar: "العبور الجديدة", keywords: ["العبور الجديدة", "new obour"] },
    { slug: "gardenia-city", type: "community", en: "Gardenia City", ar: "جاردنيا سيتي", keywords: ["Gardenia", "جاردنيا"] },
    { slug: "nasr-city", type: "district", en: "Nasr City", ar: "مدينة نصر", keywords: ["Nasr City", "مدينة نصر", "نصر"] },
    { slug: "heliopolis", type: "district", en: "Heliopolis", ar: "مصر الجديدة", keywords: ["Heliopolis", "مصر الجديدة", "هليوبوليس"] },
    { slug: "new-heliopolis", type: "city", en: "New Heliopolis", ar: "هليوبوليس الجديدة", keywords: ["هليوبوليس الجديدة"] },
    {
      slug: "new-alamein",
      type: "city",
      en: "New Alamein",
      ar: "العلمين الجديدة",
      keywords: ["New Alamein", "العلمين الجديدة", "العلمين", "alamein"],
      popularity: 85,
      children: [
        c("north-edge", "North Edge Towers", "نورث إيدج", "city-edge", ["North Edge", "نورث ايدج"]),
        c("mazarine", "Mazarine", "مازارين", "city-edge", ["Mazarine", "مازارين"]),
        c("downtown-new-alamein", "Downtown New Alamein", "داون تاون العلمين", "city-edge"),
        c("the-gate-alamein", "The Gate", "ذا جيت", "city-edge"),
        c("latin-district", "Latin District", "الحي اللاتيني", "city-edge", ["Latin District", "الحي اللاتيني"]),
      ],
    },
    {
      slug: "north-coast",
      type: "region",
      en: "North Coast",
      ar: "الساحل الشمالي",
      keywords: ["North Coast", "الساحل", "الساحل الشمالي", "sahel", "الساحل الشمالى"],
      popularity: 90,
      children: [
        c("hacienda", "Hacienda", "هاسيندا", "palm-hills", ["Hacienda", "هاسيندا"]),
        c("marassi", "Marassi", "مراسي", "emaar-misr", ["Marassi", "مراسي"]),
        c("fouka-bay", "Fouka Bay", "فوكا باي", "tatweer-misr", ["Fouka Bay", "فوكا باي", "فوكا"]),
        c("la-vista-bay", "La Vista Bay", "لافيستا باي", "la-vista", ["La Vista Bay", "لافيستا باي"]),
        c("seashell", "Seashell", "سي شيل", undefined, ["Seashell", "سي شل"]),
        c("gaia", "Gaia", "جايا", undefined),
        c("june", "June", "چون", "sodic", ["June", "چون"]),
        c("azha", "Azha", "أزها", undefined, ["Azha", "ازها"]),
        c("direction-white", "Direction White", "دايركشن وايت", undefined),
        c("silver-sands", "Silver Sands", "سيلفر ساندز", "ora-developers", ["Silver Sands", "سيلفر ساندز"]),
        c("salt", "Salt", "سولت", "tatweer-misr", ["Salt", "سولت"]),
        c("mountain-view-ras-el-hekma", "Mountain View Ras El Hekma", "ماونتن فيو رأس الحكمة", "mountain-view"),
        c("telal", "Telal", "تلال", undefined, ["Telal", "تلال"]),
        c("swan-lake-north-coast", "Swan Lake North Coast", "سوان ليك الساحل", "hassan-allam", ["Swan Lake", "سوان ليك"]),
      ],
    },
    { slug: "ras-el-hekma", type: "city", en: "Ras El Hekma", ar: "رأس الحكمة", keywords: ["Ras El Hekma", "رأس الحكمة", "راس الحكمة"], popularity: 80 },
    { slug: "new-mansoura", type: "city", en: "New Mansoura", ar: "المنصورة الجديدة", keywords: ["New Mansoura", "المنصورة الجديدة"] },
    { slug: "capital-gardens", type: "city", en: "Capital Gardens", ar: "حدائق العاصمة", keywords: ["حدائق العاصمة", "capital gardens"] },
    { slug: "15-may", type: "city", en: "15th of May", ar: "15 مايو", keywords: ["15 مايو", "15 may"] },
    { slug: "sphinx-new", type: "city", en: "New Sphinx", ar: "سفنكس الجديدة", keywords: ["سفنكس الجديدة", "sphinx"] },
    { slug: "sadat-city", type: "city", en: "Sadat City", ar: "مدينة السادات", keywords: ["Sadat", "السادات"] },
    { slug: "new-salhia", type: "city", en: "New Salhia", ar: "الصالحية الجديدة", keywords: ["الصالحية الجديدة"] },
    { slug: "new-borg-el-arab", type: "city", en: "New Borg El Arab", ar: "برج العرب الجديدة", keywords: ["برج العرب الجديدة", "borg el arab"] },
    { slug: "new-damietta", type: "city", en: "New Damietta", ar: "دمياط الجديدة", keywords: ["دمياط الجديدة"] },
    { slug: "new-aswan", type: "city", en: "New Aswan", ar: "أسوان الجديدة", keywords: ["أسوان الجديدة"] },
    { slug: "east-port-said", type: "city", en: "East Port Said (Salam)", ar: "شرق بورسعيد", keywords: ["شرق بورسعيد", "سلام"] },
    { slug: "new-toshka", type: "city", en: "New Toshka", ar: "توشكى الجديدة", keywords: ["توشكى الجديدة"] },
    { slug: "new-tiba", type: "city", en: "New Tiba", ar: "طيبة الجديدة", keywords: ["طيبة الجديدة"] },
    { slug: "new-minya", type: "city", en: "New Minya", ar: "المنيا الجديدة", keywords: ["المنيا الجديدة", "غرب المنيا"] },
    { slug: "new-assiut", type: "city", en: "New Assiut (Nasser)", ar: "أسيوط الجديدة (ناصر)", keywords: ["ناصر", "غرب أسيوط", "أسيوط الجديدة"] },
    { slug: "new-fashn", type: "city", en: "New Fashn", ar: "الفشن الجديدة", keywords: ["الفشن الجديدة"] },
    { slug: "new-mallawi", type: "city", en: "New Mallawi", ar: "ملوي الجديدة", keywords: ["ملوي الجديدة"] },
    { slug: "new-akhmim", type: "city", en: "New Akhmim", ar: "أخميم الجديدة", keywords: ["أخميم الجديدة"] },
    { slug: "new-rashid", type: "city", en: "New Rashid", ar: "رشيد الجديدة", keywords: ["رشيد الجديدة"] },
    { slug: "west-qena", type: "city", en: "West Qena", ar: "غرب قنا", keywords: ["غرب قنا"] },
    { slug: "east-oweinat", type: "city", en: "East Oweinat", ar: "شرق العوينات", keywords: ["شرق العوينات"] },
  ],
};
