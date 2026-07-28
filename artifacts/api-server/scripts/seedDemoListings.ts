/**
 * Seed a handful of varied, REAL Arabic listings through the actual
 * createListing pipeline (taxonomy/location normalization, media verification,
 * quota, transactional insert) so they publish everywhere a real listing does:
 * the mobile home feed, search, the SEO pages, AND the Admin Control Center
 * ("BANCO Control") Listings / Moderation surfaces — where they can later be
 * archived, flagged or removed.
 *
 * Listings are grouped under two recognizable demo owners so they are easy to
 * find and manage, and so each owner keeps its own anti-spam rate budget
 * (createListing caps listings-per-hour per user):
 *   • "بانكو ديمو"          — sale ads (cars, real-estate, industrial)
 *   • "بانكو ديمو (طلبات)"   — buy / wanted requests
 *
 * Idempotent per owner: if an owner already has listings the script prints them
 * and skips that group, so it is safe to re-run.
 *
 * Run: pnpm --filter @workspace/api-server exec tsx scripts/seedDemoListings.ts
 */
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { users, listings, locations } from "@workspace/db/schema";
import { createListing } from "../src/services/ListingService";
import { cleanText } from "../src/services/NormalizationService";

type Draft = Parameters<typeof createListing>[0];
type Role = "individual" | "dealer";

async function ensureOwnerId(clerkId: string, name: string, role: Role): Promise<string> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(users)
    .values({ clerkId, name, role })
    .returning({ id: users.id });
  return created.id;
}

async function seedGroup(
  label: string,
  clerkId: string,
  name: string,
  role: Role,
  drafts: Draft[],
): Promise<{ missing: number }> {
  const ownerId = await ensureOwnerId(clerkId, name, role);
  const owned = await db
    .select({ title: listings.title })
    .from(listings)
    .where(eq(listings.userId, ownerId));
  // Match on the normalized title (createListing stores cleanText(title)) so a
  // re-run seeds only the drafts that are genuinely missing — a partial earlier
  // run must NOT permanently block the remaining ones.
  const have = new Set(owned.map((l) => l.title));
  let created = 0;
  let existing = 0;
  let failed = 0;
  for (const d of drafts) {
    if (have.has(cleanText(d.title))) {
      existing += 1;
      console.log(`[seed] ${label}: exists   ${d.title}`);
      continue;
    }
    try {
      const { id } = await createListing(d, clerkId);
      created += 1;
      console.log(`[seed] ${label}: created  ${id}  ${d.title}`);
    } catch (e) {
      failed += 1;
      console.error(`[seed] ${label}: FAILED   ${d.title}: ${(e as Error).message}`);
    }
  }
  const missing = drafts.length - created - existing;
  console.log(
    `[seed] ${label}: target=${drafts.length} created=${created} existing=${existing} failed=${failed}.`,
  );
  return { missing };
}

async function main(): Promise<void> {
  // Real seeded locations so strict normalization always resolves them.
  const locs = await db
    .select({ area: locations.area, city: locations.city })
    .from(locations)
    .limit(8);
  const at = (i: number): string =>
    locs.length === 0 ? "Cairo" : locs[i % locs.length].area ?? locs[i % locs.length].city ?? "Cairo";
  const img = (id: string) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

  const saleDrafts: Draft[] = [
    {
      title: "تويوتا كورولا 2020 للبيع - حالة ممتازة",
      description:
        "سيارة تويوتا كورولا موديل 2020، فابريكا بالكامل، صيانات بالتوكيل، ماشية 45 ألف كيلو فقط، أول مالك.",
      category: "car",
      base_price_cash: 850000,
      location: at(0),
      specs: { mileage: 45000, condition: "مستعمل", year: 2020 },
      media: [{ type: "image", url: img("1494976388531-d1058494cdd8"), is_thumbnail: true }],
      payment_options: [
        { mode: "cash" },
        { mode: "seller_installment", down_payment: 250000, monthly_payment: 15000, duration_months: 48 },
      ],
    },
    {
      title: "هيونداي إلنترا 2024 جديدة - زيرو",
      description:
        "هيونداي إلنترا موديل 2024 جديدة لم تُستخدم، استلام فوري، ضمان الوكيل، أعلى فئة.",
      category: "car",
      base_price_cash: 1350000,
      location: at(1),
      specs: { mileage: 0, condition: "جديد" },
      media: [{ type: "image", url: img("1552519507-da3b142c6e3d"), is_thumbnail: true }],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "شقة 165 متر للبيع - تشطيب سوبر لوكس",
      description:
        "شقة 165 متر، 3 غرف وريسبشن، تشطيب سوبر لوكس، استلام فوري، موقع مميز قريب من الخدمات.",
      category: "real_estate",
      base_price_cash: 3200000,
      location: at(2),
      specs: { area: 165, rooms: 3 },
      media: [{ type: "image", url: img("1545324418-cc1a3fa10c00"), is_thumbnail: true }],
      payment_options: [{ mode: "cash" }, { mode: "bank_finance" }],
    },
    {
      title: "خط إنتاج وتعبئة صناعي - حالة جيدة",
      description:
        "خط إنتاج وتعبئة للمصانع، إنتاجية عالية، مناسب لمصانع الأغذية والمواد، صيانة دورية.",
      category: "industrial",
      base_price_cash: 750000,
      location: at(3),
      specs: { capacity: "5 طن/ساعة" },
      media: [{ type: "image", url: img("1565793298595-6a879b1d9492"), is_thumbnail: true }],
      payment_options: [{ mode: "cash" }],
    },
  ];

  // ── Imported cars — the Car Import journey's inventory. The Discover CTA
  // (car + import engine → origin_type=imported) was landing on ZERO results
  // because every seeded "imported" origin belonged to industrial logistics.
  // logistics.origin_type flows through createListing → listing_attributes,
  // exactly what the import engine filters on.
  const importedCarDrafts: Draft[] = [
    {
      title: "BMW X5 2022 وارد ألمانيا - أعلى فئة",
      description:
        "بي إم دبليو X5 موديل 2022 وارد ألمانيا، فل أوبشن، بانوراما، ماشية 28 ألف كيلو، حالة الوكالة.",
      category: "car",
      base_price_cash: 4200000,
      location: at(5),
      specs: { mileage: 28000, condition: "مستعمل", year: 2022, origin_type: "imported" },
      logistics: {
        origin_type: "imported",
        country_of_origin: "Germany",
        shipping_method: "container",
      },
      media: [
        { type: "image", url: img("1555215695-3004980ad54e"), is_thumbnail: true },
      ],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "تويوتا لاند كروزر 2023 وارد الخليج",
      description:
        "لاند كروزر GXR موديل 2023 وارد الإمارات، عدّاد 12 ألف، ضمان ساري، جميع الصيانات بالتوكيل.",
      category: "car",
      base_price_cash: 7800000,
      location: at(6),
      specs: { mileage: 12000, condition: "مستعمل", year: 2023, origin_type: "imported" },
      logistics: {
        origin_type: "imported",
        country_of_origin: "United Arab Emirates",
        shipping_method: "container",
      },
      media: [
        { type: "image", url: img("1519641471654-76ce0107ad1b"), is_thumbnail: true },
      ],
      payment_options: [{ mode: "cash" }],
    },
  ];

  const requestDrafts: Draft[] = [
    {
      title: "مطلوب سيارة عائلية نظيفة موديل حديث",
      description:
        "مطلوب سيارة عائلية سيدان أو SUV، موديل 2018 أو أحدث، حالة ممتازة وفابريكا، الدفع كاش فوري.",
      category: "car",
      is_request: true,
      location: at(4),
      specs: { mileage: 0, condition: "مستعمل" },
      media: [{ type: "image", url: img("1503376780353-7e6692767b70"), is_thumbnail: true }],
      // createListing reads payment_options.length; the controller/schema default
      // this to [] for us, but this script calls the service directly, so set it.
      payment_options: [],
    },
  ];

  // ── Booking & rental listings — appear in the Booking portal (offer_type=
  // rent) AND the main feed. rental_term uses the CANONICAL taxonomy values
  // (furnished_daily / new_law / old_law / annual_contract) — an earlier seed
  // used invented "daily"/"monthly"/"annual" strings, which never matched the
  // term filters and mislabeled the BFF price suffix. furnished_daily is the
  // bookable (hotel-model) mode; the rest are contact-the-owner rentals.
  const rentalDrafts: Draft[] = [
    {
      title: "شقة مفروشة للإيجار الشهري - القاهرة الجديدة",
      description:
        "شقة 120 متر مفروشة بالكامل، 2 غرف، مطبخ مجهز، واي فاي، جاهزة للسكن الفوري. إيجار شهري بعقد قانون جديد.",
      category: "real_estate",
      base_price_cash: 12000,
      location: at(0),
      specs: {
        area: 120,
        rooms: 2,
        offer_type: "rent",
        rental_term: "new_law",
        property_type: "apartment",
        furnished: true,
      },
      media: [
        { type: "image", url: img("1522708323749-97834809b785"), is_thumbnail: true },
      ],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "فيلا مفروشة للإيجار السنوي - الشيخ زايد",
      description:
        "فيلا 350 متر، 4 غرف، حديقة خاصة، جراج، مجمع راقي مع حمام سباحة. عقد إيجار سنوي.",
      category: "real_estate",
      base_price_cash: 180000,
      location: at(1),
      specs: {
        area: 350,
        rooms: 4,
        offer_type: "rent",
        rental_term: "annual_contract",
        property_type: "villa",
        furnished: true,
      },
      media: [
        { type: "image", url: img("1613977257363-10ce2b6f6e88"), is_thumbnail: true },
      ],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "استوديو مفروش للإيجار اليومي - وسط البلد",
      description:
        "استوديو أنيق 55 متر، مفروش بالكامل، قريب من جميع الخدمات والمواصلات. مناسب للزيارات القصيرة — حجز يومي.",
      category: "real_estate",
      base_price_cash: 800,
      location: at(2),
      specs: {
        area: 55,
        rooms: 1,
        offer_type: "rent",
        rental_term: "furnished_daily",
        property_type: "studio",
        furnished: true,
      },
      media: [
        { type: "image", url: img("1586023492125-27b2c045efd7"), is_thumbnail: true },
      ],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "شاليه بالبحر للإيجار اليومي - الساحل الشمالي",
      description:
        "شاليه 180 متر على البحر مباشرة، 3 غرف، مكيف، مطبخ كامل، تراس. للحجز اليومي أو الأسبوعي.",
      category: "real_estate",
      base_price_cash: 3500,
      location: at(3),
      specs: {
        area: 180,
        rooms: 3,
        offer_type: "rent",
        rental_term: "furnished_daily",
        property_type: "chalet",
        furnished: true,
      },
      media: [
        { type: "image", url: img("1507525428034-b723cf961d3e"), is_thumbnail: true },
      ],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "شقة 90 متر للإيجار السنوي - مدينتي",
      description:
        "شقة 90 متر، 2 غرف وريسبشن، بدون فرش، بحالة ممتازة. عقد إيجار سنوي بمبلغ ثابت.",
      category: "real_estate",
      base_price_cash: 60000,
      location: at(4),
      specs: {
        area: 90,
        rooms: 2,
        offer_type: "rent",
        rental_term: "annual_contract",
        property_type: "apartment",
        furnished: false,
      },
      media: [
        { type: "image", url: img("1560448204-e02f11c3d0e2"), is_thumbnail: true },
      ],
      payment_options: [{ mode: "cash" }],
    },
  ];

  // Gulf-market inventory: every draft is stamped with its market
  // (specs.market_country) and priced in its OWN currency (specs.currency) so
  // the country chips + multi-currency labels demo against REAL rows. Locations
  // use the taxonomy city values; outside the seeded EG locations table they
  // resolve to locationId null (never blocks — save-all-specs), which is the
  // honest state until those cities are learned.
  const gulfDrafts: Draft[] = [
    {
      title: "تويوتا لاند كروزر GXR 2023 - الرياض",
      description:
        "لاند كروزر GXR موديل 2023، بحالة الوكالة، ممشى 22 ألف كم، صيانة دورية بالوكيل، دفع رباعي.",
      category: "car",
      base_price_cash: 285000,
      location: "Riyadh",
      specs: {
        market_country: "SA",
        currency: "SAR",
        year: 2023,
        mileage: 22000,
        condition: "used",
        fuel_type: "petrol",
        transmission: "automatic",
      },
      media: [{ type: "image", url: img("1594502184342-2e12f877aa73"), is_thumbnail: true }],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "شقة غرفتين للإيجار السنوي - دبي مارينا",
      description:
        "شقة غرفتين وصالة في دبي مارينا، إطلالة على المرسى، قريبة من المترو، عقد سنوي، غير مفروشة.",
      category: "real_estate",
      base_price_cash: 95000,
      location: "Dubai",
      specs: {
        market_country: "AE",
        currency: "AED",
        offer_type: "rent",
        rental_term: "annual_contract",
        property_type: "apartment",
        rooms: 2,
        area: 110,
        furnished: false,
      },
      media: [{ type: "image", url: img("1512453979798-5ea266f8880c"), is_thumbnail: true }],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "رافعة شوكية تويوتا 3 طن - مدينة الكويت",
      description:
        "رافعة شوكية تويوتا ديزل حمولة 3 طن، عدد ساعات قليل، صيانة منتظمة، جاهزة للعمل فوراً.",
      category: "industrial",
      base_price_cash: 4500,
      location: "Kuwait City",
      specs: {
        market_country: "KW",
        currency: "KWD",
        industrial_type: "machine",
        industry: "engineering",
        capacity: "3 طن",
        condition: "used",
      },
      media: [{ type: "image", url: img("1581092160562-40aa08e78837"), is_thumbnail: true }],
      payment_options: [{ mode: "cash" }],
    },
    {
      title: "فيلا دورين للبيع - جدة",
      description:
        "فيلا دورين وملحق في جدة، مساحة 420 م²، 6 غرف، مجلسين، مدخلين سيارة، قريبة من الخدمات.",
      category: "real_estate",
      base_price_cash: 1850000,
      location: "Jeddah",
      specs: {
        market_country: "SA",
        currency: "SAR",
        offer_type: "sale",
        property_type: "villa",
        rooms: 6,
        area: 420,
      },
      media: [{ type: "image", url: img("1613490493576-7fde63acd811"), is_thumbnail: true }],
      payment_options: [{ mode: "cash" }],
    },
  ];

  const a = await seedGroup("sale", "demo-banco-seller", "بانكو ديمو", "dealer", saleDrafts);
  const b = await seedGroup("request", "demo-banco-buyer", "بانكو ديمو (طلبات)", "individual", requestDrafts);
  const c = await seedGroup("rental", "demo-banco-host", "بانكو ديمو (إيجار)", "individual", rentalDrafts);
  const d = await seedGroup("imported", "demo-banco-importer", "بانكو ديمو (استيراد)", "dealer", importedCarDrafts);
  const g = await seedGroup("gulf", "demo-banco-gulf", "بانكو ديمو (الخليج)", "dealer", gulfDrafts);
  const missing = a.missing + b.missing + c.missing + d.missing + g.missing;
  if (missing > 0) {
    // Honesty: never exit 0 with demo data missing.
    throw new Error(`${missing} demo listing(s) still missing — see FAILED lines above.`);
  }
  console.log("[seed] all demo listings present.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
