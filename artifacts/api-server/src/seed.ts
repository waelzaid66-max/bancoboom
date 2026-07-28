import { db } from "@workspace/db";
import {
  users,
  listings,
  listingAttributes,
  listingMedia,
  paymentOptions,
  interactions,
  brands,
  models,
  carVariants,
  locations,
  propertyTypes,
  finishingTypes,
  ownershipTypes,
  industrialTypes,
  industries,
  plans,
  transactions,
  listingLinks,
  companyProfiles,
  rfqs,
  rfqOffers,
  leadHistory,
  investmentOpportunities,
  investmentInterests,
  companyFollows,
  globalSupplyRequests,
  globalSupplyResponses,
} from "@workspace/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { slugify } from "./lib/fuzzy";
import { normalizeListing, invalidateReferenceCache } from "./services/NormalizationService";
import { ensureDbExtensions } from "./lib/bootstrap";

/* ── Master data (taxonomy) ────────────────────────────── */

const BRAND_CATALOG: Array<{
  name: string;
  models: Array<{ name: string; variants?: string[] }>;
}> = [
  { name: "BMW", models: [{ name: "X5", variants: ["M-Sport", "xDrive40i"] }, { name: "330i", variants: ["M Package"] }] },
  { name: "Mercedes-Benz", models: [{ name: "C-Class", variants: ["C180", "C200", "C300"] }, { name: "GLE", variants: ["AMG", "GLE 450"] }] },
  { name: "Audi", models: [{ name: "A4", variants: ["35 TFSI", "40 TFSI"] }] },
  { name: "Toyota", models: [{ name: "Corolla", variants: ["XLI", "GLI"] }, { name: "Fortuner", variants: ["VXR", "GXR"] }] },
  { name: "Hyundai", models: [{ name: "Tucson", variants: ["GLS", "Smart"] }, { name: "Elantra", variants: ["CN7", "AD"] }] },
  { name: "Kia", models: [{ name: "Sportage", variants: ["Luxury", "EX"] }, { name: "Cerato", variants: ["EX", "Top"] }] },
  { name: "Volkswagen", models: [{ name: "Tiguan", variants: ["R-Line"] }] },
  { name: "Chevrolet", models: [{ name: "Camaro", variants: ["SS", "RS"] }, { name: "Lanos", variants: ["SE"] }] },
  { name: "Ford", models: [{ name: "Mustang", variants: ["GT", "EcoBoost"] }] },
  { name: "Porsche", models: [{ name: "Cayenne", variants: ["S", "Turbo"] }] },
  { name: "Land Rover", models: [{ name: "Range Rover", variants: ["Vogue", "Sport"] }] },
  { name: "Nissan", models: [{ name: "X-Trail", variants: ["SV", "SL"] }] },
  { name: "Honda", models: [{ name: "CR-V", variants: ["Touring", "EX"] }] },
  { name: "Jeep", models: [{ name: "Grand Cherokee", variants: ["Limited", "Laredo"] }] },
  { name: "Peugeot", models: [{ name: "208", variants: ["Active", "Allure"] }] },
  { name: "Renault", models: [{ name: "Duster", variants: ["PE", "SE"] }] },
  { name: "Mitsubishi", models: [{ name: "Eclipse Cross", variants: ["Highline"] }] },
  { name: "MG", models: [{ name: "ZS", variants: ["Luxury", "Comfort"] }] },
  { name: "Lexus", models: [{ name: "RX 350", variants: ["Platinum"] }] },
];

// Real area centroids (WGS84). Listings without their own coordinates fall back
// to these so the whole feed is mappable.
const LOCATION_CATALOG: Array<{
  city: string;
  area: string;
  zoneType: "urban" | "suburb" | "coastal" | "industrial" | "new_city";
  lat: number;
  lng: number;
}> = [
  { city: "Cairo", area: "New Cairo", zoneType: "new_city", lat: 30.03, lng: 31.4913 },
  { city: "Giza", area: "6th of October City", zoneType: "new_city", lat: 29.966, lng: 30.923 },
  { city: "Cairo", area: "Zamalek", zoneType: "urban", lat: 30.0618, lng: 31.2194 },
  { city: "Cairo", area: "Maadi", zoneType: "urban", lat: 29.9603, lng: 31.2569 },
  { city: "Cairo", area: "Heliopolis", zoneType: "urban", lat: 30.0911, lng: 31.3425 },
  { city: "Giza", area: "Dokki", zoneType: "urban", lat: 30.0388, lng: 31.211 },
  { city: "Giza", area: "Giza", zoneType: "urban", lat: 30.0131, lng: 31.2089 },
  { city: "Giza", area: "Sheikh Zayed", zoneType: "suburb", lat: 30.0444, lng: 30.976 },
  { city: "Cairo", area: "El Rehab City", zoneType: "new_city", lat: 30.0586, lng: 31.4913 },
  { city: "Suez", area: "Ain Sokhna", zoneType: "coastal", lat: 29.6004, lng: 32.316 },
  { city: "Matrouh", area: "North Coast", zoneType: "coastal", lat: 31.0339, lng: 28.5 },
  { city: "Dakahlia", area: "Mansoura", zoneType: "urban", lat: 31.0409, lng: 31.3785 },
  { city: "Alexandria", area: "Alexandria", zoneType: "coastal", lat: 31.2001, lng: 29.9187 },
  { city: "Red Sea", area: "Hurghada", zoneType: "coastal", lat: 27.2579, lng: 33.8116 },
  { city: "Luxor", area: "Luxor", zoneType: "urban", lat: 25.6872, lng: 32.6396 },
  { city: "Sharqia", area: "10th of Ramadan City", zoneType: "industrial", lat: 30.296, lng: 31.742 },
  { city: "Qalyubia", area: "Obour City", zoneType: "industrial", lat: 30.228, lng: 31.471 },
  { city: "Alexandria", area: "Alexandria Industrial Zone", zoneType: "industrial", lat: 31.15, lng: 29.88 },
  { city: "Alexandria", area: "Borg El Arab", zoneType: "industrial", lat: 30.855, lng: 29.568 },
  { city: "Monufia", area: "Sadat City", zoneType: "industrial", lat: 30.365, lng: 30.523 },
  { city: "Cairo", area: "Badr City", zoneType: "new_city", lat: 30.13, lng: 31.72 },
];

const PROPERTY_TYPE_CATALOG: Array<{ slug: string; name: string; nameAr: string }> = [
  { slug: "apartment", name: "Apartment", nameAr: "شقة" },
  { slug: "villa", name: "Villa", nameAr: "فيلا" },
  { slug: "townhouse", name: "Townhouse", nameAr: "تاون هاوس" },
  { slug: "twinhouse", name: "Twinhouse", nameAr: "توين هاوس" },
  { slug: "penthouse", name: "Penthouse", nameAr: "بنتهاوس" },
  { slug: "duplex", name: "Duplex", nameAr: "دوبلكس" },
  { slug: "studio", name: "Studio", nameAr: "استوديو" },
  { slug: "chalet", name: "Chalet", nameAr: "شاليه" },
  { slug: "office", name: "Office", nameAr: "مكتب" },
  { slug: "clinic", name: "Clinic", nameAr: "عيادة" },
  { slug: "shop", name: "Shop", nameAr: "محل" },
  { slug: "land", name: "Land", nameAr: "أرض" },
];

const FINISHING_TYPE_CATALOG: Array<{ slug: string; name: string; nameAr: string }> = [
  { slug: "finished", name: "Finished", nameAr: "تشطيب كامل" },
  { slug: "semi_finished", name: "Semi-Finished", nameAr: "نصف تشطيب" },
  { slug: "core_shell", name: "Core & Shell", nameAr: "على المحارة" },
  { slug: "super_lux", name: "Super Lux", nameAr: "سوبر لوكس" },
];

const OWNERSHIP_TYPE_CATALOG: Array<{ slug: string; name: string; nameAr: string }> = [
  { slug: "resale", name: "Resale", nameAr: "إعادة بيع" },
  { slug: "primary", name: "Primary", nameAr: "أولى" },
  { slug: "installment_ready", name: "Installment Ready", nameAr: "جاهز للتقسيط" },
];

const INDUSTRIAL_TYPE_CATALOG: Array<{ slug: string; name: string; nameAr: string }> = [
  { slug: "factory", name: "Factory", nameAr: "مصنع" },
  { slug: "warehouse", name: "Warehouse", nameAr: "مخزن" },
  { slug: "machine", name: "Machine", nameAr: "ماكينة" },
  { slug: "production_line", name: "Production Line", nameAr: "خط إنتاج" },
  { slug: "land", name: "Industrial Land", nameAr: "أرض صناعية" },
  { slug: "raw_material", name: "Raw Material", nameAr: "مواد خام" },
];

const INDUSTRY_CATALOG: Array<{ slug: string; name: string; nameAr: string }> = [
  { slug: "food", name: "Food", nameAr: "أغذية" },
  { slug: "beverage", name: "Beverage", nameAr: "مشروبات" },
  { slug: "plastic", name: "Plastic", nameAr: "بلاستيك" },
  { slug: "textile", name: "Textile", nameAr: "نسيج" },
  { slug: "pharmaceutical", name: "Pharmaceutical", nameAr: "أدوية" },
  { slug: "chemical", name: "Chemical", nameAr: "كيماويات" },
  { slug: "engineering", name: "Engineering", nameAr: "هندسية" },
  { slug: "other", name: "Other", nameAr: "أخرى" },
];

async function seedReferenceData() {
  for (const brand of BRAND_CATALOG) {
    const [brandRow] = await db
      .insert(brands)
      .values({ name: brand.name, slug: slugify(brand.name), category: "car" })
      .onConflictDoNothing()
      .returning({ id: brands.id });

    let brandId = brandRow?.id;
    if (!brandId) {
      const [existing] = await db.select({ id: brands.id }).from(brands).where(eq(brands.slug, slugify(brand.name))).limit(1);
      brandId = existing?.id;
    }
    if (!brandId) continue;

    for (const model of brand.models) {
      const modelSlug = slugify(`${brand.name}-${model.name}`);
      const [modelRow] = await db
        .insert(models)
        .values({ brandId, name: model.name, slug: modelSlug })
        .onConflictDoNothing()
        .returning({ id: models.id });

      let modelId = modelRow?.id;
      if (!modelId) {
        const [existing] = await db.select({ id: models.id }).from(models).where(eq(models.slug, modelSlug)).limit(1);
        modelId = existing?.id;
      }
      if (!modelId) continue;

      for (const variant of model.variants ?? []) {
        await db
          .insert(carVariants)
          .values({ modelId, name: variant, slug: slugify(`${model.name}-${variant}`) })
          .onConflictDoNothing();
      }
    }
  }

  for (const loc of LOCATION_CATALOG) {
    // Upsert on slug so re-seeding backfills coordinates onto areas created by
    // earlier (pre-geo) seed runs.
    await db
      .insert(locations)
      .values({
        city: loc.city,
        area: loc.area,
        slug: slugify(loc.area),
        zoneType: loc.zoneType,
        latitude: String(loc.lat),
        longitude: String(loc.lng),
      })
      .onConflictDoUpdate({
        target: locations.slug,
        set: {
          city: loc.city,
          zoneType: loc.zoneType,
          latitude: String(loc.lat),
          longitude: String(loc.lng),
        },
      });
  }

  for (const [idx, pt] of PROPERTY_TYPE_CATALOG.entries()) {
    await db.insert(propertyTypes).values({ slug: pt.slug, name: pt.name, nameAr: pt.nameAr, sortOrder: idx }).onConflictDoNothing();
  }
  for (const [idx, ft] of FINISHING_TYPE_CATALOG.entries()) {
    await db.insert(finishingTypes).values({ slug: ft.slug, name: ft.name, nameAr: ft.nameAr, sortOrder: idx }).onConflictDoNothing();
  }
  for (const [idx, ot] of OWNERSHIP_TYPE_CATALOG.entries()) {
    await db.insert(ownershipTypes).values({ slug: ot.slug, name: ot.name, nameAr: ot.nameAr, sortOrder: idx }).onConflictDoNothing();
  }
  for (const [idx, it] of INDUSTRIAL_TYPE_CATALOG.entries()) {
    await db.insert(industrialTypes).values({ slug: it.slug, name: it.name, nameAr: it.nameAr, sortOrder: idx }).onConflictDoNothing();
  }
  for (const [idx, ind] of INDUSTRY_CATALOG.entries()) {
    await db.insert(industries).values({ slug: ind.slug, name: ind.name, nameAr: ind.nameAr, sortOrder: idx }).onConflictDoNothing();
  }

  invalidateReferenceCache();
}

/* ── Monetization plans (governed tiers) ───────────────── */

const PLAN_CATALOG: Array<{
  slug: string;
  name: string;
  nameAr: string;
  audience: "individual" | "dealer" | "company" | "enterprise";
  isBaseline: boolean;
  monthlyPrice: string;
  listingQuota: number | null;
  activeListingCap: number | null;
  boostPrice: string;
  cplWhatsapp: string;
  cplCall: string;
  cplChat: string;
  cplFinanceRequest: string;
  rankingWeight: string;
  features: Record<string, boolean>;
  sortOrder: number;
}> = [
  {
    // Launch opening: baseline limits raised to 50/50 for all users pending the
    // admin-managed publish controls. Paid plans below are intentionally unchanged.
    slug: "individual_free", name: "Individual", nameAr: "فردي", audience: "individual",
    isBaseline: true, monthlyPrice: "0", listingQuota: 50, activeListingCap: 50,
    boostPrice: "100", cplWhatsapp: "0", cplCall: "0", cplChat: "0", cplFinanceRequest: "0",
    rankingWeight: "1", features: {}, sortOrder: 0,
  },
  {
    slug: "dealer_free", name: "Dealer Starter", nameAr: "تاجر مبتدئ", audience: "dealer",
    isBaseline: true, monthlyPrice: "0", listingQuota: 50, activeListingCap: 50,
    boostPrice: "150", cplWhatsapp: "20", cplCall: "15", cplChat: "10", cplFinanceRequest: "30",
    rankingWeight: "1", features: {}, sortOrder: 1,
  },
  {
    slug: "dealer_basic", name: "Basic", nameAr: "أساسي", audience: "dealer",
    isBaseline: false, monthlyPrice: "999", listingQuota: 50, activeListingCap: 100,
    boostPrice: "120", cplWhatsapp: "15", cplCall: "12", cplChat: "8", cplFinanceRequest: "25",
    rankingWeight: "1.2", features: { analytics: true }, sortOrder: 2,
  },
  {
    slug: "dealer_pro", name: "Pro", nameAr: "احترافي", audience: "dealer",
    isBaseline: false, monthlyPrice: "2999", listingQuota: 200, activeListingCap: 400,
    boostPrice: "90", cplWhatsapp: "12", cplCall: "10", cplChat: "6", cplFinanceRequest: "20",
    rankingWeight: "1.5", features: { analytics: true, bulk_import: true, priority_support: true }, sortOrder: 3,
  },
  {
    slug: "dealer_enterprise", name: "Enterprise", nameAr: "مؤسسي", audience: "enterprise",
    isBaseline: false, monthlyPrice: "7999", listingQuota: null, activeListingCap: null,
    boostPrice: "60", cplWhatsapp: "8", cplCall: "6", cplChat: "4", cplFinanceRequest: "15",
    rankingWeight: "2", features: { analytics: true, bulk_import: true, priority_support: true, dedicated_manager: true }, sortOrder: 4,
  },
  {
    slug: "bank_featured", name: "Bank Featured", nameAr: "تمييز البنوك", audience: "company",
    isBaseline: false, monthlyPrice: "14999", listingQuota: null, activeListingCap: null,
    boostPrice: "0", cplWhatsapp: "0", cplCall: "0", cplChat: "0", cplFinanceRequest: "0",
    rankingWeight: "3", features: { featured_placement: true, analytics: true, finance_partner: true }, sortOrder: 5,
  },
];

async function seedPlans() {
  for (const p of PLAN_CATALOG) {
    const values = {
      slug: p.slug,
      name: p.name,
      nameAr: p.nameAr,
      audience: p.audience,
      isBaseline: p.isBaseline,
      monthlyPrice: p.monthlyPrice,
      listingQuota: p.listingQuota,
      activeListingCap: p.activeListingCap,
      boostPrice: p.boostPrice,
      cplWhatsapp: p.cplWhatsapp,
      cplCall: p.cplCall,
      cplChat: p.cplChat,
      cplFinanceRequest: p.cplFinanceRequest,
      rankingWeight: p.rankingWeight,
      features: p.features,
      sortOrder: p.sortOrder,
      isActive: true,
    };
    const { slug: _slug, ...updatable } = values;
    await db.insert(plans).values(values).onConflictDoUpdate({
      target: plans.slug,
      set: updatable,
    });
  }
}

/* ── Demo opening wallet balances (ledger-safe) ────────── */

async function seedOpeningBalances() {
  // Fund business accounts with a demo opening balance so subscriptions and
  // boosts are exercisable in dealer-os. Idempotent (per-user idempotency key)
  // and ledger-safe: the opening adjustment row is the wallet's only entry, so
  // balance == SUM(transactions.amount) holds trivially.
  const businessUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["dealer", "company", "enterprise"]));

  const OPENING = "10000";
  let funded = 0;
  for (const u of businessUsers) {
    const [tx] = await db
      .insert(transactions)
      .values({
        userId: u.id,
        type: "adjustment",
        amount: OPENING,
        balanceAfter: OPENING,
        description: "Opening balance (seed)",
        idempotencyKey: `seed_opening_${u.id}`,
      })
      .onConflictDoNothing()
      .returning({ id: transactions.id });
    if (tx) {
      await db.update(users).set({ walletBalance: OPENING }).where(eq(users.id, u.id));
      funded++;
    }
  }
  return funded;
}

const LOCATIONS = [
  "New Cairo", "6th of October City", "Zamalek", "Maadi", "Heliopolis",
  "Dokki", "Giza", "Sheikh Zayed", "El Rehab City", "Ain Sokhna",
  "North Coast", "Mansoura", "Alexandria", "Hurghada", "Luxor",
];

const CAR_BRANDS = [
  "BMW X5 2023 M-Sport",
  "Mercedes-Benz C200 2022",
  "Toyota Fortuner 2023 VXR",
  "Hyundai Tucson 2022 GLS",
  "Kia Sportage 2023 Luxury",
  "Volkswagen Tiguan 2022",
  "Chevrolet Camaro 2021 SS",
  "Ford Mustang 2022 GT",
  "Porsche Cayenne 2022",
  "Land Rover Range Rover 2021 Vogue",
  "Nissan X-Trail 2022",
  "Honda CR-V 2022 Touring",
  "Jeep Grand Cherokee 2022",
  "Audi A4 2023",
  "Lexus RX 350 2022",
  "Toyota Corolla 2023 XLI",
  "Hyundai Elantra 2022",
  "Kia Cerato 2023 EX",
  "Chevrolet Lanos 2019",
  "Peugeot 208 2022",
  "Renault Duster 2023",
  "Mitsubishi Eclipse Cross 2022",
  "MG ZS 2023 Luxury",
  "BMW 330i 2022 M Package",
  "Mercedes GLE 2022 AMG",
];

const REAL_ESTATE_TITLES = [
  "Luxury Duplex - New Cairo - Palm Hills",
  "Apartment 200m² - Zamalek Nile View",
  "Villa 600m² - Sheikh Zayed Compound",
  "Penthouse - Heliopolis City Stars",
  "Studio - Maadi Sarayat",
  "Chalet - North Coast Marina",
  "Office Space 500m² - Downtown Cairo",
  "Shop - City Centre Almaza",
  "Twin House - El Rehab City",
  "Apartment 150m² - 6th October Dreamland",
  "Standalone Villa - Hyde Park New Cairo",
  "Apartment 180m² - Zahraa Maadi",
  "Duplex 350m² - Katameya Heights",
  "Studio - New Administrative Capital",
  "Penthouse - El-Gouna Hurghada Sea View",
];

const INDUSTRIAL_TITLES = [
  "Industrial Land 5000m² - 10th of Ramadan City",
  "Food Processing Factory - Alexandria Port",
  "Textile Production Line - Mahalla El-Kubra",
  "Cold Storage Warehouse - Obour City",
  "Printing Machine KOMORI - Full Setup",
  "CNC Machining Center - German Made",
  "Plastic Injection Moulding Line",
  "Bottling Plant 10,000 bottles/hr",
  "Solar Panel Manufacturing Unit",
  "Marble Cutting Factory - Shaq El Thoaban",
  "Pharmaceutical Manufacturing Line",
  "Auto Workshop Equipment Full Set",
  "Metal Fabrication Workshop 2000m²",
  "Grain Silo 1000 ton capacity",
  "Wood Furniture Factory - Damietta",
];

const CAR_IMAGES = [
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
  "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
  "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
  "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
  "https://images.unsplash.com/photo-1638890443292-90b52d945c56?w=800&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
];

const RE_IMAGES = [
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
];

const IND_IMAGES = [
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
  "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&q=80",
  "https://images.unsplash.com/photo-1566888596782-c7f41cc184c5?w=800&q=80",
];

// Real-world financing partners used to seed COMPETING offers so the best-offer
// selector has to choose across providers and financing models. Conventional
// partners carry an annual rate (engine amortizes); Islamic partners carry a
// flat profit margin (engine → fixed total, NEVER a rate).
const BANK_FINANCE_PARTNERS = [
  { name: "CIB Auto Finance", rate: 18.5 },
  { name: "QNB Alahli Auto", rate: 19.25 },
  { name: "Banque Misr Drive", rate: 17.75 },
  { name: "NBE Wheels", rate: 18 },
];

const MORTGAGE_PARTNERS = [
  { name: "NBE Mortgage Finance", rate: 14.5 },
  { name: "CIB Home Finance", rate: 15.25 },
  { name: "Tamweel Mortgage", rate: 13.75 },
];

const ISLAMIC_FINANCE_PARTNERS = [
  { name: "Faisal Islamic Murabaha", profit: 22 },
  { name: "Al Baraka Murabaha", profit: 24 },
  { name: "ADIB Egypt Islamic", profit: 21 },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randFloat(min: number, max: number, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

/* ── B2B layer: supply-chain graph + company profiles + RFQs ── */

type IndType = "factory" | "warehouse" | "machine" | "production_line" | "land" | "raw_material";

async function seedB2B(dealerIds: string[]) {
  // Idempotency guard: listing_links is ONLY ever populated here, so if any edge
  // exists the whole B2B layer was already seeded — skip to avoid duplicates.
  const [existingLink] = await db.select({ id: listingLinks.id }).from(listingLinks).limit(1);
  if (existingLink) {
    console.log("⏭️  B2B layer already seeded, skipping");
    return;
  }
  if (dealerIds.length < 3) {
    console.log("⚠️  Not enough seed users for B2B layer, skipping");
    return;
  }

  const B2B_LOCATION = "10th of Ramadan City";

  async function createIndustrial(opts: {
    ownerId: string;
    title: string;
    description: string;
    price: number;
    industrialType: IndType;
  }): Promise<string> {
    const [listing] = await db
      .insert(listings)
      .values({
        userId: opts.ownerId,
        title: opts.title,
        description: opts.description,
        category: "industrial",
        basePriceCash: String(opts.price),
        location: B2B_LOCATION,
        status: "active",
      })
      .returning({ id: listings.id });

    await db.insert(listingAttributes).values({
      listingId: listing.id,
      specs: { industrial_type: opts.industrialType, industry: "plastic" },
      industrialType: opts.industrialType,
      industry: "plastic",
    });

    await db.insert(listingMedia).values([
      { listingId: listing.id, type: "image", url: pick(IND_IMAGES), isThumbnail: true, sortOrder: 0 },
    ]);
    await db.insert(paymentOptions).values([
      { listingId: listing.id, mode: "cash", downPayment: null, monthlyPayment: null, durationMonths: null },
    ]);
    await db.insert(interactions).values({
      listingId: listing.id,
      views: rand(10, 200),
      clicks: rand(2, 30),
    });

    return listing.id;
  }

  // Owners: dealerIds[2] = الأمل للصناعات (industrial dealer), dealerIds[0] = another business.
  const supplierA = dealerIds[2];
  const supplierB = dealerIds[0];

  const rawPoly = await createIndustrial({
    ownerId: supplierA,
    title: "بوليمر بولي إيثيلين خام HDPE",
    description: "مواد خام بلاستيك عالية النقاء، مناسبة لماكينات الحقن والنفخ. تسليم فوري.",
    price: rand(900_000, 2_000_000),
    industrialType: "raw_material",
  });
  const rawPvc = await createIndustrial({
    ownerId: supplierA,
    title: "حبيبات بلاستيك PVC نقية",
    description: "خامات PVC للصناعات البلاستيكية، جودة تصدير، متوفرة بكميات كبيرة.",
    price: rand(700_000, 1_600_000),
    industrialType: "raw_material",
  });
  const machInjection = await createIndustrial({
    ownerId: supplierA,
    title: "ماكينة حقن بلاستيك 250 طن",
    description: "ماكينة حقن بلاستيك أوتوماتيكية بالكامل، حالة ممتازة، تشمل القوالب الأساسية.",
    price: rand(2_500_000, 6_000_000),
    industrialType: "machine",
  });
  const machBlow = await createIndustrial({
    ownerId: supplierB,
    title: "ماكينة نفخ بلاستيك أوتوماتيك",
    description: "ماكينة نفخ زجاجات PET، إنتاجية عالية، صيانة دورية موثقة.",
    price: rand(1_800_000, 4_500_000),
    industrialType: "machine",
  });
  const lineP = await createIndustrial({
    ownerId: supplierA,
    title: "خط إنتاج زجاجات PET كامل",
    description: "خط إنتاج متكامل لزجاجات PET من الخامة حتى التعبئة، جاهز للتشغيل.",
    price: rand(8_000_000, 18_000_000),
    industrialType: "production_line",
  });
  const factory = await createIndustrial({
    ownerId: supplierA,
    title: "مصنع بلاستيك متكامل - العاشر من رمضان",
    description: "مصنع بلاستيك متكامل على مساحة 5000م²، يشمل خطوط إنتاج ومرافق وتراخيص.",
    price: rand(40_000_000, 90_000_000),
    industrialType: "factory",
  });

  // Connected graph: raw → machine → production_line → factory (+ a peer edge).
  const edges: Array<{ from: string; to: string; relation: "feeds_into" | "part_of" | "compatible_with" }> = [
    { from: rawPoly, to: machInjection, relation: "feeds_into" },
    { from: rawPvc, to: machBlow, relation: "feeds_into" },
    { from: machInjection, to: lineP, relation: "part_of" },
    { from: machBlow, to: lineP, relation: "part_of" },
    { from: lineP, to: factory, relation: "part_of" },
    { from: machInjection, to: machBlow, relation: "compatible_with" },
  ];
  for (const e of edges) {
    await db
      .insert(listingLinks)
      .values({ fromListingId: e.from, toListingId: e.to, relation: e.relation })
      .onConflictDoNothing();
  }
  console.log(`✅ Seeded B2B supply-chain graph (${edges.length} links across 6 listings)`);

  // Rich company profiles for the business sellers (idempotent upsert).
  const profileData: Array<typeof companyProfiles.$inferInsert> = [
    {
      userId: supplierA,
      about: "شركة رائدة في تصنيع وتوريد المنتجات والخامات البلاستيكية منذ 2008، نخدم السوق المحلي والتصدير.",
      yearEstablished: 2008,
      countriesImportFrom: ["China", "Germany", "Saudi Arabia"],
      countriesExportTo: ["Libya", "Sudan", "Jordan", "Iraq"],
      minOrderValue: "50000",
      minOrderUnit: "EGP",
      monthlyCapacity: "500 tons",
      leadTimeDays: 21,
      certifications: ["ISO 9001", "ISO 14001", "CE"],
      websiteUrl: "https://al-amal-industries.example.com",
    },
    {
      userId: supplierB,
      about: "موردون معتمدون لماكينات ومعدات الصناعة البلاستيكية مع خدمة ما بعد البيع.",
      yearEstablished: 2014,
      countriesImportFrom: ["Italy", "Turkey", "China"],
      countriesExportTo: ["Sudan", "Libya"],
      minOrderValue: "100000",
      minOrderUnit: "EGP",
      monthlyCapacity: "30 units",
      leadTimeDays: 45,
      certifications: ["ISO 9001", "CE"],
      websiteUrl: "https://delta-machinery.example.com",
    },
    {
      userId: dealerIds[1],
      about: "مجموعة استثمارية في الأصول الصناعية والعقارية بالمدن الصناعية المصرية.",
      yearEstablished: 2005,
      countriesImportFrom: [],
      countriesExportTo: [],
      minOrderValue: null,
      minOrderUnit: null,
      monthlyCapacity: null,
      leadTimeDays: null,
      certifications: ["ISO 9001"],
      websiteUrl: null,
    },
  ];
  for (const p of profileData) {
    const { userId, ...rest } = p;
    await db
      .insert(companyProfiles)
      .values(p)
      .onConflictDoUpdate({
        target: companyProfiles.userId,
        set: { ...rest, updatedAt: new Date() },
      });
  }
  console.log(`✅ Seeded ${profileData.length} company profiles`);

  // Sample RFQs with competing offers. Buyers are individuals so they never
  // collide with the supplier dealers.
  const buyer1 = dealerIds[5] ?? dealerIds[1];
  const buyer2 = dealerIds[6] ?? dealerIds[4] ?? dealerIds[1];

  const [rfq1] = await db
    .insert(rfqs)
    .values({
      buyerId: buyer1,
      category: "industrial",
      title: "مطلوب 5 طن حبيبات بلاستيك PP",
      description: "مطلوب توريد 5 طن حبيبات بولي بروبيلين بكر، تسليم القاهرة الكبرى، الدفع عند الاستلام.",
      quantity: "5",
      unit: "طن",
      targetPriceMax: "1500000",
      destinationCountry: "Egypt",
      industry: "plastic",
      industrialType: "raw_material",
      status: "open",
    })
    .returning({ id: rfqs.id });

  await db
    .insert(rfqOffers)
    .values([
      {
        rfqId: rfq1.id,
        supplierId: supplierA,
        priceQuote: "1420000",
        currency: "EGP",
        leadTimeDays: 14,
        moq: "5",
        message: "خامة بكر بشهادة مطابقة، تسليم خلال أسبوعين.",
        status: "pending",
      },
      {
        rfqId: rfq1.id,
        supplierId: supplierB,
        priceQuote: "1380000",
        currency: "EGP",
        leadTimeDays: 21,
        moq: "3",
        message: "سعر تنافسي مع إمكانية التوريد الدوري.",
        status: "pending",
      },
    ])
    .onConflictDoNothing();

  const [rfq2] = await db
    .insert(rfqs)
    .values({
      buyerId: buyer2,
      category: "industrial",
      title: "مطلوب ماكينة تعبئة وتغليف أوتوماتيك",
      description: "مطلوب ماكينة تعبئة وتغليف أوتوماتيكية للسوائل، طاقة 2000 وحدة/ساعة.",
      quantity: "1",
      unit: "وحدة",
      targetPriceMax: "3000000",
      destinationCountry: "Egypt",
      industry: "engineering",
      industrialType: "machine",
      status: "awarded",
    })
    .returning({ id: rfqs.id });

  await db
    .insert(rfqOffers)
    .values([
      {
        rfqId: rfq2.id,
        supplierId: supplierA,
        priceQuote: "2750000",
        currency: "EGP",
        leadTimeDays: 30,
        moq: "1",
        message: "ماكينة جديدة مع ضمان سنتين وتدريب التشغيل.",
        status: "accepted",
      },
      {
        rfqId: rfq2.id,
        supplierId: supplierB,
        priceQuote: "2900000",
        currency: "EGP",
        leadTimeDays: 25,
        moq: "1",
        message: "تسليم أسرع مع خدمة صيانة مجانية أول سنة.",
        status: "rejected",
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Seeded sample RFQs with competing offers (1 open, 1 awarded)");
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Task #40 — Supply-chain & investment surfaces (STRICTLY ADDITIVE).
 *
 * Self-sufficient and independently idempotent: it does NOT rely on seedB2B
 * having run in the same invocation (the B2B layer may already be seeded). It
 * queries existing users/listings from the DB and guards on
 * investment_opportunities existence, so it back-fills an already-seeded DB on
 * first run and is a no-op thereafter.
 *
 * No figure here is fabricated by the platform: every ROI/revenue/quote is
 * "seller_provided" demo data, mirroring what a business user would enter.
 */
async function seedSupplyChain() {
  // ── Idempotency guard (independent of the listingLinks guard) ──
  const [{ c: existingInv }] = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(investmentOpportunities);
  if (Number(existingInv) > 0) {
    console.log("⏭️  Task #40 supply-chain data already seeded, skipping");
    return;
  }

  // ── Resolve seeded users by clerkId (deterministic, role-aware) ──
  const seededUsers = await db
    .select({ id: users.id, clerkId: users.clerkId, role: users.role })
    .from(users)
    .where(sql`${users.clerkId} LIKE 'seed_%'`);
  const byClerk = new Map(seededUsers.map((u) => [u.clerkId, u.id] as const));
  const businessUsers = seededUsers
    .filter((u) => u.role !== "individual")
    .map((u) => u.id);
  const individualUsers = seededUsers
    .filter((u) => u.role === "individual")
    .map((u) => u.id);

  if (businessUsers.length === 0) {
    console.log("⚠️  No seeded business users found, skipping Task #40 data");
    return;
  }

  const carDealer = byClerk.get("seed_dealer_1") ?? businessUsers[0];
  const realEstateCo = byClerk.get("seed_dealer_2") ?? businessUsers[0];
  const industrialDealer = byClerk.get("seed_dealer_3") ?? businessUsers[0];
  const deltaMotors = byClerk.get("seed_dealer_4") ?? businessUsers[0];
  const enterpriseCo = byClerk.get("seed_dealer_5") ?? businessUsers[0];
  const buyerA = byClerk.get("seed_individual_1") ?? individualUsers[0] ?? businessUsers[0];
  const buyerB = byClerk.get("seed_individual_2") ?? individualUsers[1] ?? buyerA;

  // ── 1) Suppliers Directory: ensure every business company has industry + HQ ──
  // The directory lists every business-role user and reads industry/hq_country
  // from company_profiles (left-joined). seedB2B only creates a few profiles, so
  // we upsert a profile for EVERY business user — preserving any existing fields
  // and only setting industry + hq_country — so the directory + industry filter
  // are meaningfully populated. industry is derived from each company's primary
  // listing category (honest mapping, not invented).
  type IndustryValue =
    | "food" | "beverage" | "plastic" | "textile"
    | "pharmaceutical" | "chemical" | "engineering" | "other";

  const businessRows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      sql`${users.role} IN ('dealer','company','enterprise') AND ${users.isShadowBanned} IS NOT TRUE`
    );

  const catAgg = businessRows.length
    ? await db
        .select({
          userId: listings.userId,
          category: listings.category,
          c: sql<number>`COUNT(*)`,
        })
        .from(listings)
        .where(inArray(listings.userId, businessRows.map((b) => b.id)))
        .groupBy(listings.userId, listings.category)
    : [];
  const primaryCat = new Map<string, "car" | "real_estate" | "industrial">();
  const bestCount = new Map<string, number>();
  for (const r of catAgg) {
    if (!r.userId) continue;
    const c = Number(r.c);
    if (c > (bestCount.get(r.userId) ?? -1)) {
      bestCount.set(r.userId, c);
      primaryCat.set(r.userId, r.category);
    }
  }

  const industrialCycle: IndustryValue[] = ["plastic", "food", "engineering", "chemical", "textile"];
  const overrides: Record<string, IndustryValue> = {
    [industrialDealer]: "plastic",
    [enterpriseCo]: "food",
  };
  let industrialIdx = 0;
  let industryBackfilled = 0;
  for (const b of businessRows) {
    let industry: IndustryValue;
    if (overrides[b.id]) {
      industry = overrides[b.id];
    } else {
      const cat = primaryCat.get(b.id);
      if (cat === "industrial") industry = industrialCycle[industrialIdx++ % industrialCycle.length];
      else if (cat === "car") industry = "engineering";
      else industry = "other";
    }
    const hq = b.id === deltaMotors ? "United Arab Emirates" : "Egypt";
    await db
      .insert(companyProfiles)
      .values({ userId: b.id, industry, hqCountry: hq })
      .onConflictDoUpdate({
        target: companyProfiles.userId,
        set: { industry, hqCountry: hq, updatedAt: new Date() },
      });
    industryBackfilled++;
  }
  console.log(`✅ Ensured industry/HQ on ${industryBackfilled} company profiles`);

  // ── 2) Suppliers Directory: company follows ──
  const followPairs: Array<{ follower: string; company: string }> = [
    { follower: buyerA, company: industrialDealer },
    { follower: buyerB, company: industrialDealer },
    { follower: carDealer, company: industrialDealer },
    { follower: buyerA, company: enterpriseCo },
    { follower: buyerB, company: realEstateCo },
    { follower: realEstateCo, company: enterpriseCo },
  ].filter((p) => p.follower && p.company && p.follower !== p.company);
  for (const p of followPairs) {
    await db
      .insert(companyFollows)
      .values({ followerId: p.follower, companyUserId: p.company })
      .onConflictDoNothing();
  }
  console.log(`✅ Seeded ${followPairs.length} company follows`);

  // ── 3) Logistics: back-fill nullable cols on industrial listing_attributes ──
  const industrialAttrs = await db
    .select({ listingId: listingAttributes.listingId })
    .from(listingAttributes)
    .innerJoin(listings, eq(listingAttributes.listingId, listings.id))
    .where(eq(listings.category, "industrial"));
  const originOpts = ["local", "imported"] as const;
  const shipOpts = ["container", "bulk", "air"] as const;
  const countryByOrigin: Record<(typeof originOpts)[number], string[]> = {
    local: ["Egypt"],
    imported: ["China", "Germany", "Turkey", "United Arab Emirates"],
  };
  let logisticsBackfilled = 0;
  for (const a of industrialAttrs) {
    const origin = pick([...originOpts]);
    await db
      .update(listingAttributes)
      .set({
        deliveryTimeDays: rand(3, 45),
        originType: origin,
        countryOfOrigin: pick(countryByOrigin[origin]),
        shippingMethod: pick([...shipOpts]),
      })
      .where(eq(listingAttributes.listingId, a.listingId));
    logisticsBackfilled++;
  }
  console.log(`✅ Back-filled logistics on ${logisticsBackfilled} industrial listings`);

  // ── 4) Investment Opportunities: all 5 sub-types (seller-provided figures) ──
  const investmentsData: Array<typeof investmentOpportunities.$inferInsert> = [
    {
      ownerId: industrialDealer,
      investmentType: "factory_sale",
      title: "مصنع بلاستيك متكامل للبيع — 6 أكتوبر",
      description:
        "مصنع حقن بلاستيك على مساحة 2400م² بترخيص ساري وخطوط إنتاج جاهزة للتشغيل الفوري. يشمل البيع الأرض والمباني والمعدات.",
      industry: "plastic",
      location: "6th of October, Giza",
      totalValueAmount: "85000000",
      currency: "EGP",
      expectedRoiPct: "18.5",
      paybackYears: "5.5",
      revenueRangeMin: "24000000",
      revenueRangeMax: "32000000",
      costStructureNote: "تكاليف تشغيل سنوية تقديرية ~19م ج.م تشمل الخامات والعمالة والطاقة.",
      growthPotentialNote: "إمكانية إضافة خط إنتاج ثالث لزيادة الطاقة 40%.",
      figuresSource: "seller_provided",
      coverUrl: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&q=80",
      status: "active",
    },
    {
      ownerId: enterpriseCo,
      investmentType: "business_sale",
      title: "سلسلة مطاعم للبيع — 4 فروع تعمل بالقاهرة",
      description:
        "نشاط مطاعم قائم بأربعة فروع وعلامة تجارية مسجّلة وفريق عمل مدرّب. بيع كامل النشاط مع العقود والتراخيص.",
      industry: "food",
      location: "Cairo",
      totalValueAmount: "42000000",
      currency: "EGP",
      expectedRoiPct: "22",
      paybackYears: "4",
      revenueRangeMin: "30000000",
      revenueRangeMax: "38000000",
      costStructureNote: "هامش ربح تشغيلي ~21% وفق آخر قوائم مالية قدّمها البائع.",
      growthPotentialNote: "خطة توسّع لفرعين إضافيين في التجمع والشيخ زايد.",
      figuresSource: "seller_provided",
      coverUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
      status: "active",
    },
    {
      ownerId: industrialDealer,
      investmentType: "production_line_investment",
      title: "فرصة استثمار في خط إنتاج أغذية معلّبة",
      description:
        "طرح حصة استثمارية لتمويل خط إنتاج جديد لتعليب الأغذية ضمن مصنع قائم. المستثمر يحصل على حصة من الأرباح.",
      industry: "food",
      location: "10th of Ramadan City",
      totalValueAmount: "15000000",
      currency: "EGP",
      expectedRoiPct: "16",
      paybackYears: "6",
      revenueRangeMin: "9000000",
      revenueRangeMax: "12000000",
      costStructureNote: "التقديرات مقدّمة من صاحب المصنع وتخضع للتفاوض والفحص النافي للجهالة.",
      growthPotentialNote: "طلب متزايد على المنتجات المعلّبة في أسواق التصدير.",
      figuresSource: "seller_provided",
      coverUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
      status: "active",
    },
    {
      ownerId: enterpriseCo,
      investmentType: "franchise",
      title: "امتياز تجاري — سلسلة مخبوزات معروفة",
      description:
        "فرصة الحصول على امتياز (فرنشايز) لافتتاح فرع لعلامة مخبوزات راسخة، مع دعم تشغيلي وتدريب كامل.",
      industry: "food",
      location: "New Cairo",
      totalValueAmount: "3500000",
      currency: "EGP",
      expectedRoiPct: "25",
      paybackYears: "3",
      revenueRangeMin: "4000000",
      revenueRangeMax: "6000000",
      costStructureNote: "رسوم امتياز مبدئية + إتاوة شهرية 6% من المبيعات حسب عقد المانح.",
      growthPotentialNote: "مناطق حصرية متاحة في القاهرة الجديدة والعاصمة الإدارية.",
      figuresSource: "seller_provided",
      coverUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
      status: "active",
    },
    {
      ownerId: realEstateCo,
      investmentType: "partnership",
      title: "شراكة في شركة خدمات لوجستية ونقل",
      description:
        "طرح حصة شراكة (40%) في شركة لوجستيات قائمة بأسطول نقل وعقود توريد سارية. شراكة تشغيلية أو صامتة.",
      industry: "engineering",
      location: "Alexandria",
      totalValueAmount: "28000000",
      currency: "EGP",
      expectedRoiPct: "19",
      paybackYears: "5",
      revenueRangeMin: "18000000",
      revenueRangeMax: "23000000",
      costStructureNote: "الأرقام وفق قوائم الشركة المدققة لآخر سنة مالية (مقدّمة من الشريك).",
      growthPotentialNote: "نمو متوقع مع توسّع التجارة الإلكترونية وخدمات الميل الأخير.",
      figuresSource: "seller_provided",
      coverUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
      status: "active",
    },
  ];
  const insertedInvestments = await db
    .insert(investmentOpportunities)
    .values(investmentsData)
    .returning({ id: investmentOpportunities.id, ownerId: investmentOpportunities.ownerId });
  console.log(`✅ Seeded ${insertedInvestments.length} investment opportunities (5 sub-types)`);

  // ── 4b) A few interests on opportunities (exercise interest counts) ──
  const interestKinds = ["interest", "request_details", "contact"] as const;
  let interestCount = 0;
  for (const inv of insertedInvestments) {
    const interestedBy = [buyerA, buyerB, carDealer].filter((u) => u && u !== inv.ownerId);
    for (const uid of interestedBy.slice(0, rand(1, interestedBy.length))) {
      const kind = pick([...interestKinds]);
      await db
        .insert(investmentInterests)
        .values({
          investmentId: inv.id,
          userId: uid,
          kind,
          message: kind === "request_details" ? "مهتم بمزيد من التفاصيل المالية والقوائم." : null,
          contactPhone: kind === "contact" ? `+2010${rand(10000000, 99999999)}` : null,
        })
        .onConflictDoNothing();
      interestCount++;
    }
  }
  console.log(`✅ Seeded ${interestCount} investment interests`);

  // ── 5) Global Supply / Import-Export: requests + supplier responses ──
  const supplyRequestsData: Array<typeof globalSupplyRequests.$inferInsert> = [
    {
      buyerId: buyerA,
      productText: "حبيبات بولي إيثيلين عالي الكثافة (HDPE) لصناعة العبوات",
      category: "industrial",
      industry: "plastic",
      quantity: "120",
      unit: "طن",
      destinationCountry: "Egypt",
      budgetMax: "9500000",
      currency: "EGP",
      incoterms: "cif",
      notes: "مطلوب توريد شهري منتظم مع شهادات جودة.",
      status: "open",
    },
    {
      buyerId: realEstateCo,
      productText: "ألواح صلب مجلفن لمشاريع إنشائية",
      category: "industrial",
      industry: "engineering",
      quantity: "300",
      unit: "طن",
      destinationCountry: "Egypt",
      budgetMax: "21000000",
      currency: "EGP",
      incoterms: "fob",
      notes: "يفضّل توريد على دفعات حسب جدول التنفيذ.",
      status: "open",
    },
    {
      buyerId: buyerB,
      productText: "ماكينات تعبئة وتغليف أوتوماتيكية لخط أغذية",
      category: "industrial",
      industry: "food",
      quantity: "2",
      unit: "وحدة",
      destinationCountry: "Saudi Arabia",
      budgetMax: "4500000",
      currency: "EGP",
      incoterms: "exw",
      notes: "مع التركيب والتدريب وضمان قطع الغيار.",
      status: "open",
    },
  ];
  const insertedRequests = await db
    .insert(globalSupplyRequests)
    .values(supplyRequestsData)
    .returning({ id: globalSupplyRequests.id, buyerId: globalSupplyRequests.buyerId });
  console.log(`✅ Seeded ${insertedRequests.length} global-supply requests`);

  // Supplier responses (dealer-os "respond" path). One per (request, supplier).
  const responders = [industrialDealer, deltaMotors, enterpriseCo].filter(Boolean);
  let responseCount = 0;
  for (const req of insertedRequests) {
    const eligible = responders.filter((s) => s !== req.buyerId);
    for (const supplierId of eligible.slice(0, rand(1, eligible.length))) {
      const origin = pick(["China", "Turkey", "United Arab Emirates", "Egypt"]);
      await db
        .insert(globalSupplyResponses)
        .values({
          requestId: req.id,
          supplierId,
          countryOfOrigin: origin,
          moq: String(rand(5, 50)),
          shippingTimeDays: rand(7, 60),
          incoterms: pick(["fob", "cif", "cfr", "dap"] as const),
          deliveryEstimate: `${rand(2, 8)}-${rand(9, 14)} أسابيع`,
          priceQuote: String(rand(2000000, 9000000)),
          currency: "EGP",
          message: "عرض مبدئي قابل للتفاوض حسب الكمية وشروط الدفع.",
          status: "pending",
        })
        .onConflictDoNothing();
      responseCount++;
    }
  }
  console.log(`✅ Seeded ${responseCount} global-supply responses`);

  // ── 6) Market Intelligence: make trends computable (LIVE, period-over-period) ──
  // The trends engine compares the last 30 days vs the prior 30 days and needs
  // >= 5 samples per window. All seeded listings currently sit in the current
  // window, so we back-date a slice of each category into the prior window and
  // seed leadHistory in BOTH windows. No metric is invented — these are real
  // rows the LIVE aggregation reads.
  const now = Date.now();
  const inCurrentWindow = () => new Date(now - rand(1, 28) * DAY_MS);
  const inPriorWindow = () => new Date(now - rand(32, 58) * DAY_MS);

  let backdated = 0;
  let leadsSeeded = 0;
  for (const category of ["car", "real_estate", "industrial"] as const) {
    const rows = await db
      .select({ id: listings.id, userId: listings.userId })
      .from(listings)
      .where(eq(listings.category, category))
      .limit(40);
    if (rows.length === 0) continue;

    // Back-date ~40% of the slice into the prior window; keep the rest current.
    const priorCount = Math.max(6, Math.floor(rows.length * 0.4));
    for (let i = 0; i < rows.length; i++) {
      const created = i < priorCount ? inPriorWindow() : inCurrentWindow();
      await db.update(listings).set({ createdAt: created }).where(eq(listings.id, rows[i].id));
      backdated++;
    }

    // Seed leads across both windows so demand/lead_volume are non-insufficient.
    const actions = ["whatsapp", "call", "chat", "finance_request"] as const;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const sellerId = r.userId;
      if (!sellerId) continue;
      const leadCreated = i < priorCount ? inPriorWindow() : inCurrentWindow();
      const buyerId = pick([buyerA, buyerB].filter((b) => b && b !== sellerId)) ?? null;
      const n = rand(1, 2);
      for (let k = 0; k < n; k++) {
        await db.insert(leadHistory).values({
          listingId: r.id,
          buyerId,
          sellerId,
          actionType: pick([...actions]),
          status: "new",
          buyerName: pick(["Ahmed Hassan", "Mohamed Khalil", "Sara Adel", "Omar Tarek"]),
          buyerPhone: `+2010${rand(10000000, 99999999)}`,
          createdAt: leadCreated,
        });
        leadsSeeded++;
      }
    }
  }
  console.log(
    `✅ Spread createdAt on ${backdated} listings + seeded ${leadsSeeded} leads → market trends computable`
  );
}

/**
 * Demo inventory / seed_* users / opening wallets must never hit a real
 * production database by accident. Staging/CI/dev remain allowed.
 * Escape hatch (demo DBs only): BANCO_ALLOW_DEMO_SEED=1
 */
function assertDemoSeedAllowed(): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const bancoEnv = (
    process.env.BANCO_ENV ??
    process.env.APP_ENV ??
    ""
  ).toLowerCase();
  const isProd =
    nodeEnv === "production" ||
    bancoEnv === "production" ||
    bancoEnv === "prod";
  if (isProd && process.env.BANCO_ALLOW_DEMO_SEED !== "1") {
    throw new Error(
      "Refusing demo seed in production. " +
        "Use seed:reference / seed:car-brands / seed:admin for baseline data. " +
        "If this is an intentional demo DB, set BANCO_ALLOW_DEMO_SEED=1.",
    );
  }
}

async function seed() {
  console.log("🌱 Starting BANCO seed...");
  assertDemoSeedAllowed();

  await ensureDbExtensions();

  // ── Seed master data / taxonomy ─────────────────────────
  await seedReferenceData();
  console.log("✅ Seeded master data (brands, models, variants, locations)");

  // ── Seed monetization plans (governed tiers) ────────────
  await seedPlans();
  console.log("✅ Seeded monetization plans");

  // ── Create dealer users ─────────────────────────────────
  const dealerData = [
    { clerkId: "seed_dealer_1", name: "مجموعة النور للسيارات", role: "dealer" as const, isVerified: true },
    { clerkId: "seed_dealer_2", name: "الصفوة العقارية", role: "company" as const, isVerified: true },
    { clerkId: "seed_dealer_3", name: "الأمل للصناعات", role: "dealer" as const, isVerified: true },
    { clerkId: "seed_dealer_4", name: "Delta Motors", role: "dealer" as const, isVerified: true },
    { clerkId: "seed_dealer_5", name: "Cairo Real Estate Group", role: "enterprise" as const, isVerified: true },
    { clerkId: "seed_individual_1", name: "Ahmed Hassan", role: "individual" as const, isVerified: false },
    { clerkId: "seed_individual_2", name: "Mohamed Khalil", role: "individual" as const, isVerified: false },
  ];

  const dealerIds: string[] = [];
  for (const d of dealerData) {
    const [user] = await db
      .insert(users)
      .values({ ...d, email: `${d.clerkId}@banco-seed.com`, phone: `+2010${rand(10000000, 99999999)}` })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (user) dealerIds.push(user.id);
  }

  console.log(`✅ Created ${dealerIds.length} users`);

  if (dealerIds.length === 0) {
    console.log("⚠️  Users already seeded, fetching existing IDs...");
    const existing = await db.select({ id: users.id }).from(users).limit(7);
    dealerIds.push(...existing.map((u) => u.id));
  }

  // ── Fund business wallets (ledger-safe demo opening balance) ──
  const funded = await seedOpeningBalances();
  console.log(`✅ Funded ${funded} business wallets with opening balance`);

  const listingIds: string[] = [];
  let listingCount = 0;

  // ── Seed Cars (25 listings) ─────────────────────────────
  for (let i = 0; i < 25; i++) {
    const title = CAR_BRANDS[i % CAR_BRANDS.length];
    const isLuxury = i < 8;
    const price = isLuxury ? rand(3_000_000, 12_000_000) : rand(350_000, 2_800_000);
    const userId = dealerIds[i % Math.max(dealerIds.length, 1)];
    const mileage = rand(0, 180_000);
    const year = rand(2018, 2024);
    const downPayment = Math.round(price * 0.2);
    const duration = pick([24, 36, 48, 60]);
    const monthly = Math.round((price - downPayment) / duration);
    const image = pick(CAR_IMAGES);

    const [listing] = await db
      .insert(listings)
      .values({
        userId,
        title: `${title} - ${year}`,
        description: `${title}، بحالة ممتازة، ${mileage.toLocaleString()} كيلومتر. لون خارجي أبيض / داخلي أسود. سيرفس كامل. الأوراق سليمة.`,
        category: "car",
        basePriceCash: String(price),
        location: pick(LOCATIONS),
        status: "active",
      })
      .returning({ id: listings.id });

    await db.insert(listingAttributes).values({
      listingId: listing.id,
      specs: {
        mileage,
        year,
        condition: mileage < 20000 ? "new" : "used",
        brand: title.split(" ")[0],
        model: title.split(" ").slice(0, 2).join(" "),
        fuel_type: pick(["petrol", "diesel", "hybrid"]),
        transmission: pick(["automatic", "manual"]),
        color: pick(["white", "black", "silver", "blue", "red"]),
        engine_cc: pick([1600, 2000, 2500, 3000, 4000]),
        seats: pick([5, 7]),
      },
    });

    await db.insert(listingMedia).values([
      { listingId: listing.id, type: "image", url: image, isThumbnail: true, sortOrder: 0 },
      { listingId: listing.id, type: "image", url: pick(CAR_IMAGES), isThumbnail: false, sortOrder: 1 },
    ]);

    if (i < 18) {
      const bank = pick(BANK_FINANCE_PARTNERS);
      const islamic = pick(ISLAMIC_FINANCE_PARTNERS);

      // Conventional bank offer: a real annual rate drives the amortization
      // engine; the stored monthly keeps the legacy payment block populated.
      const bankDown = Math.round(price * 0.25);
      const bankMonths = pick([48, 60, 72]);
      const bankMonthly = Math.round((price - bankDown) / bankMonths);

      // Islamic (Murabaha) offer: a flat profit margin → fixed total, NEVER a
      // rate. Stored monthly mirrors the engine's total/months for the legacy block.
      const islamicDown = Math.round(price * 0.3);
      const islamicMonths = pick([24, 36, 48]);
      const islamicTotal = (price - islamicDown) * (1 + islamic.profit / 100);
      const islamicMonthly = Math.round(islamicTotal / islamicMonths);

      const carOptions: (typeof paymentOptions.$inferInsert)[] = [
        { listingId: listing.id, mode: "cash", provider: "seller", downPayment: null, monthlyPayment: null, durationMonths: null },
        {
          listingId: listing.id,
          mode: "seller_installment",
          provider: "seller",
          downPayment: String(downPayment),
          monthlyPayment: String(monthly),
          durationMonths: duration,
          isIslamicCompliant: false,
        },
        {
          listingId: listing.id,
          mode: "bank_finance",
          provider: "bank",
          providerName: bank.name,
          downPayment: String(bankDown),
          monthlyPayment: String(bankMonthly),
          durationMonths: bankMonths,
          annualRatePct: String(bank.rate),
          isIslamicCompliant: false,
        },
      ];

      // ~half the inventory also carries a competing Islamic offer so the
      // best-offer selector has to choose across financing models.
      if (i % 2 === 0) {
        carOptions.push({
          listingId: listing.id,
          mode: "bank_finance",
          provider: "dealer",
          providerName: islamic.name,
          downPayment: String(islamicDown),
          monthlyPayment: String(islamicMonthly),
          durationMonths: islamicMonths,
          profitRatePct: String(islamic.profit),
          isIslamicCompliant: true,
        });
      }

      await db.insert(paymentOptions).values(carOptions);
    }

    await db.insert(interactions).values({
      listingId: listing.id,
      views: rand(50, 800),
      clicks: rand(5, 80),
      whatsappClicks: rand(1, 30),
      callClicks: rand(1, 20),
      financeRequests: rand(0, 10),
    });

    listingIds.push(listing.id);
    listingCount++;
  }

  console.log(`✅ Seeded 25 car listings`);

  // ── Seed Real Estate (15 listings) ─────────────────────
  for (let i = 0; i < 15; i++) {
    const title = REAL_ESTATE_TITLES[i % REAL_ESTATE_TITLES.length];
    // Real-estate offer type — the primary EG/Gulf split (تمليك sale vs إيجار rent).
    // Every third property is a rental so the rent engine + booking-style rent map
    // have real inventory; rentals are priced as monthly rent, sales as full price.
    const offerType: "sale" | "rent" = i % 3 === 0 ? "rent" : "sale";
    const isLuxury = i < 5;
    const price =
      offerType === "rent"
        ? rand(6_000, 90_000)
        : isLuxury
          ? rand(8_000_000, 45_000_000)
          : rand(1_200_000, 7_500_000);
    const userId = dealerIds[i % Math.max(dealerIds.length, 1)];
    const area = rand(80, 600);
    const rooms = rand(1, 6);
    const floor = rand(1, 20);
    const downPayment = Math.round(price * 0.15);
    const duration = pick([36, 60, 84, 120]);
    const monthly = Math.round((price - downPayment) / duration);
    const image = pick(RE_IMAGES);

    const [listing] = await db
      .insert(listings)
      .values({
        userId,
        title,
        description: `${title}. مساحة ${area} متر. ${rooms} غرف. طابق ${floor}. إطلالة رائعة. تشطيب سوبر لوكس.`,
        category: "real_estate",
        basePriceCash: String(price),
        location: pick(LOCATIONS),
        status: "active",
      })
      .returning({ id: listings.id });

    await db.insert(listingAttributes).values({
      listingId: listing.id,
      specs: {
        area,
        rooms,
        bathrooms: Math.max(1, Math.floor(rooms / 2)),
        floor,
        offer_type: offerType,
        finishing: pick(["super_lux", "lux", "semi_finished", "core_shell"]),
        furnished: i % 3 === 0,
        compound: i < 8,
        view: pick(["sea", "garden", "street", "pool", "nile"]),
        building_age_years: rand(0, 15),
        maintenance_per_year: rand(5000, 50000),
        delivery_date: i < 5 ? `Q${rand(1, 4)} ${rand(2025, 2027)}` : "Ready to move",
      },
    });

    await db.insert(listingMedia).values([
      { listingId: listing.id, type: "image", url: image, isThumbnail: true, sortOrder: 0 },
      { listingId: listing.id, type: "image", url: pick(RE_IMAGES), isThumbnail: false, sortOrder: 1 },
    ]);

    if (i < 12 && offerType === "sale") {
      const mortgage = pick(MORTGAGE_PARTNERS);
      const mortDown = Math.round(price * 0.2);
      const mortMonths = pick([60, 84, 120]);
      const mortMonthly = Math.round((price - mortDown) / mortMonths);

      const reOptions: (typeof paymentOptions.$inferInsert)[] = [
        { listingId: listing.id, mode: "cash", provider: "seller", downPayment: null, monthlyPayment: null, durationMonths: null },
        {
          listingId: listing.id,
          mode: "seller_installment",
          provider: "seller",
          downPayment: String(downPayment),
          monthlyPayment: String(monthly),
          durationMonths: duration,
          isIslamicCompliant: i % 2 === 0,
        },
      ];

      // Every third property adds a competing conventional mortgage (rate-driven).
      if (i % 3 === 0) {
        reOptions.push({
          listingId: listing.id,
          mode: "bank_finance",
          provider: "bank",
          providerName: mortgage.name,
          downPayment: String(mortDown),
          monthlyPayment: String(mortMonthly),
          durationMonths: mortMonths,
          annualRatePct: String(mortgage.rate),
          isIslamicCompliant: false,
        });
      }

      await db.insert(paymentOptions).values(reOptions);
    }

    await db.insert(interactions).values({
      listingId: listing.id,
      views: rand(30, 500),
      clicks: rand(3, 50),
      whatsappClicks: rand(1, 25),
      callClicks: rand(1, 15),
      financeRequests: rand(0, 8),
    });

    listingIds.push(listing.id);
    listingCount++;
  }

  console.log(`✅ Seeded 15 real estate listings`);

  // ── Seed Industrial (12 listings) ──────────────────────
  for (let i = 0; i < 12; i++) {
    const title = INDUSTRIAL_TITLES[i % INDUSTRIAL_TITLES.length];
    const price = rand(500_000, 25_000_000);
    const userId = dealerIds[i % Math.max(dealerIds.length, 1)];
    const image = pick(IND_IMAGES);

    const [listing] = await db
      .insert(listings)
      .values({
        userId,
        title,
        description: `${title}. حالة ممتازة. جاهز للتشغيل الفوري. يشمل جميع المعدات والتراخيص.`,
        category: "industrial",
        basePriceCash: String(price),
        location: pick(["10th of Ramadan City", "Obour City", "Alexandria Industrial Zone", "Borg El Arab", "Sadat City", "Badr City"]),
        status: "active",
      })
      .returning({ id: listings.id });

    await db.insert(listingAttributes).values({
      listingId: listing.id,
      specs: {
        capacity: pick(["500 units/hr", "1000 units/hr", "2000 kg/hr", "5000m²", "10 tons/day"]),
        power_kw: rand(50, 2000),
        area_sqm: rand(200, 10000),
        year_of_manufacture: rand(2010, 2023),
        condition: pick(["excellent", "very_good", "good", "needs_maintenance"]),
        included_equipment: i % 2 === 0,
        available_licenses: i % 3 !== 0,
        infrastructure: pick(["electricity_3phase", "water", "gas", "all_utilities"]),
      },
    });

    await db.insert(listingMedia).values([
      { listingId: listing.id, type: "image", url: image, isThumbnail: true, sortOrder: 0 },
    ]);

    await db.insert(paymentOptions).values([
      { listingId: listing.id, mode: "cash", downPayment: null, monthlyPayment: null, durationMonths: null },
    ]);

    await db.insert(interactions).values({
      listingId: listing.id,
      views: rand(10, 200),
      clicks: rand(2, 30),
      whatsappClicks: rand(1, 15),
      callClicks: rand(1, 10),
      financeRequests: rand(0, 5),
    });

    listingIds.push(listing.id);
    listingCount++;
  }

  console.log(`✅ Seeded 12 industrial listings`);

  // ── Link listings via the normalization pipeline ────────
  // Runs the real pipeline over every seeded listing to resolve taxonomy
  // (brand/model/variant/location), standardize enums, flag duplicates and
  // compute a trust score — exactly as a live create/update would.
  invalidateReferenceCache();
  let linked = 0;
  for (const id of listingIds) {
    const [row] = await db
      .select({
        title: listings.title,
        description: listings.description,
        category: listings.category,
        basePriceCash: listings.basePriceCash,
        location: listings.location,
        userId: listings.userId,
      })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);
    if (!row || !row.userId) continue;
    const sellerId = row.userId;

    const [attr] = await db
      .select({ specs: listingAttributes.specs })
      .from(listingAttributes)
      .where(eq(listingAttributes.listingId, id))
      .limit(1);

    const mediaRows = await db
      .select({ type: listingMedia.type, url: listingMedia.url })
      .from(listingMedia)
      .where(eq(listingMedia.listingId, id));

    const [seller] = await db
      .select({ isVerified: users.isVerified })
      .from(users)
      .where(eq(users.id, sellerId))
      .limit(1);

    try {
      const normalized = await normalizeListing(
        {
          title: row.title,
          description: row.description ?? undefined,
          category: row.category,
          base_price_cash: Number(row.basePriceCash),
          location: row.location,
          specs: (attr?.specs as Record<string, unknown>) ?? {},
          media: mediaRows.map((m) => ({ type: m.type, url: m.url })),
        },
        { sellerId, sellerVerified: !!seller?.isVerified, excludeListingId: id, lenient: true, requireMedia: false }
      );

      await db
        .update(listings)
        .set({
          locationId: normalized.locationId,
          trustScore: normalized.trustScore,
          isDuplicate: normalized.isDuplicate,
          duplicateOfId: normalized.duplicateOfId,
        })
        .where(eq(listings.id, id));

      await db
        .update(listingAttributes)
        .set({
          specs: normalized.specs,
          brandId: normalized.taxonomy.brandId,
          modelId: normalized.taxonomy.modelId,
          variantId: normalized.taxonomy.variantId,
          fuelType: normalized.taxonomy.fuelType,
          condition: normalized.taxonomy.condition,
          bodyType: normalized.taxonomy.bodyType,
          transmission: normalized.taxonomy.transmission,
          propertyType: normalized.taxonomy.propertyType,
          finishingType: normalized.taxonomy.finishingType,
          ownershipType: normalized.taxonomy.ownershipType,
          industrialType: normalized.taxonomy.industrialType,
          industry: normalized.taxonomy.industry,
          propertyTypeId: normalized.taxonomy.propertyTypeId,
          finishingTypeId: normalized.taxonomy.finishingTypeId,
          ownershipTypeId: normalized.taxonomy.ownershipTypeId,
          industrialTypeId: normalized.taxonomy.industrialTypeId,
          industryId: normalized.taxonomy.industryId,
        } as Partial<typeof listingAttributes.$inferInsert>)
        .where(eq(listingAttributes.listingId, id));

      linked++;
    } catch (err) {
      console.warn(`⚠️  Normalization skipped for listing ${id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`✅ Linked ${linked}/${listingIds.length} listings via normalization pipeline`);

  // ── B2B layer: supply-chain graph + company profiles + RFQs ──
  await seedB2B(dealerIds);

  // ── Task #40: investments, suppliers directory, global supply, logistics,
  //    market-intelligence data (independently idempotent, self-sufficient) ──
  await seedSupplyChain();

  console.log(`\n🎉 BANCO seed complete: ${listingCount} total listings across all categories`);
  console.log(`📊 Cairo listings ready for the feed`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
