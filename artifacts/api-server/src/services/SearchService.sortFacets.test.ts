import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { inArray, sql } from "drizzle-orm";
import { searchListings, getFacets } from "./SearchService";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import {
  users,
  listings,
  listingAttributes,
  listingMedia,
  interactions,
} from "@workspace/db/schema";

const uids: string[] = [];

type Fuel = "petrol" | "diesel" | "hybrid" | "electric" | "natural_gas";
type Trans = "manual" | "automatic" | "cvt";

/**
 * Insert a throwaway active car listing (plus the thumbnail the FeedItem
 * transform requires). Each gets its own owner so teardown can delete
 * listings-then-users without FK trouble (interactions/attributes/media cascade
 * off the listing).
 */
async function carListing(opts: {
  title?: string;
  price: string;
  fuelType?: Fuel;
  transmission?: Trans;
  year?: number;
  views?: number;
  clicks?: number;
}): Promise<string> {
  const userId = randomUUID();
  uids.push(userId);
  await db.insert(users).values({
    id: userId,
    clerkId: uniq("clerk"),
    name: "Car Seller",
    role: "dealer",
  });
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId,
    title: opts.title ?? uniq("car"),
    category: "car",
    basePriceCash: opts.price,
    location: "Cairo",
    status: "active",
  });
  await db.insert(listingAttributes).values({
    listingId,
    specs: opts.year ? { year: String(opts.year) } : {},
    fuelType: opts.fuelType,
    transmission: opts.transmission,
  });
  await db.insert(listingMedia).values({
    listingId,
    type: "image",
    url: `https://img.test/${listingId}.jpg`,
    isThumbnail: true,
  });
  if (opts.views !== undefined || opts.clicks !== undefined) {
    await db.insert(interactions).values({
      listingId,
      views: opts.views ?? 0,
      clicks: opts.clicks ?? 0,
    });
  }
  return listingId;
}

// brand/model filters are honest title ilike matches, so an uppercase UUID token
// embedded in the title isolates exactly the listings a single test seeded —
// keeping ordering/count assertions deterministic on the shared DB.
function token(prefix: string): string {
  return uniq(prefix).toUpperCase();
}

// vitest gives each test file its own pg pool, so the first DB statement in
// this file pays the full connection-establishment cost. Warm equivalents run
// in ~50ms, but a cold connect spikes to seconds under gate-wide contention —
// and that spike used to land on the first test's per-test budget, timing it
// out. Pay the connect once here so it draws on the hook budget instead, and
// every test below runs on an already-warm pool.
beforeAll(async () => {
  await db.execute(sql`SELECT 1`);
});

describe("searchListings sort", () => {
  it("price_asc / price_desc order by base price", async () => {
    const t = token("PRICEX");
    const cheap = await carListing({ title: `${t} Cheap`, price: "100000" });
    const mid = await carListing({ title: `${t} Mid`, price: "200000" });
    const exp = await carListing({ title: `${t} Exp`, price: "300000" });

    const asc = await searchListings(
      { category: "car", brand: t, sort: "price_asc" },
      undefined,
      50,
    );
    expect(asc.items.map((i) => i.id)).toEqual([cheap, mid, exp]);

    const desc = await searchListings(
      { category: "car", brand: t, sort: "price_desc" },
      undefined,
      50,
    );
    expect(desc.items.map((i) => i.id)).toEqual([exp, mid, cheap]);
  });

  it("popular orders by lifetime views + clicks", async () => {
    const t = token("POPX");
    const low = await carListing({ title: `${t} A`, price: "100000", views: 1, clicks: 0 });
    const high = await carListing({ title: `${t} B`, price: "100000", views: 50, clicks: 50 });
    const mid = await carListing({ title: `${t} C`, price: "100000", views: 10, clicks: 0 });

    const res = await searchListings(
      { category: "car", brand: t, sort: "popular" },
      undefined,
      50,
    );
    expect(res.items.map((i) => i.id)).toEqual([high, mid, low]);
  });

  it("offset pagination is contiguous (no dup / no skip)", async () => {
    const t = token("PAGEX");
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(
        await carListing({ title: `${t} ${i}`, price: String(100000 + i * 10000) }),
      );
    }

    const page1 = await searchListings(
      { category: "car", brand: t, sort: "price_asc" },
      undefined,
      2,
    );
    expect(page1.items.map((i) => i.id)).toEqual([ids[0], ids[1]]);
    expect(page1.has_next).toBe(true);

    const page2 = await searchListings(
      { category: "car", brand: t, sort: "price_asc" },
      page1.cursor,
      2,
    );
    expect(page2.items.map((i) => i.id)).toEqual([ids[2], ids[3]]);
    expect(page2.has_next).toBe(true);

    const page3 = await searchListings(
      { category: "car", brand: t, sort: "price_asc" },
      page2.cursor,
      2,
    );
    expect(page3.items.map((i) => i.id)).toEqual([ids[4]]);
    expect(page3.has_next).toBe(false);
  });

  it("default sort (recommended) still returns the full filtered set", async () => {
    const t = token("RECX");
    const a = await carListing({ title: `${t} 1`, price: "100000" });
    const b = await carListing({ title: `${t} 2`, price: "100000" });
    const c = await carListing({ title: `${t} 3`, price: "100000" });

    const res = await searchListings({ category: "car", brand: t }, undefined, 50);
    const ids = new Set(res.items.map((i) => i.id));
    expect(ids.has(a) && ids.has(b) && ids.has(c)).toBe(true);
  });
});

describe("searchListings new filters", () => {
  it("filters by model via the listing title", async () => {
    const t = token("MODELX");
    const match = await carListing({ title: `Toyota ${t} 2021`, price: "100000" });
    const other = await carListing({ title: `Honda Civic ${uniq("x")}`, price: "100000" });

    const res = await searchListings({ category: "car", model: t }, undefined, 50);
    const ids = res.items.map((i) => i.id);
    expect(ids).toContain(match);
    expect(ids).not.toContain(other);
  });

  it("filters by model year range (numeric specs.year, regex-guarded)", async () => {
    const t = token("YEARX");
    const y2018 = await carListing({ title: `${t} a`, price: "100000", year: 2018 });
    const y2022 = await carListing({ title: `${t} b`, price: "100000", year: 2022 });

    const res = await searchListings(
      { category: "car", brand: t, min_year: 2020 },
      undefined,
      50,
    );
    const ids = res.items.map((i) => i.id);
    expect(ids).toContain(y2022);
    expect(ids).not.toContain(y2018);
  });

  it("filters by fuel_type and transmission (column + specs COALESCE)", async () => {
    const t = token("FUELX");
    const electric = await carListing({
      title: `${t} ev`,
      price: "100000",
      fuelType: "electric",
      transmission: "cvt",
    });
    const petrol = await carListing({
      title: `${t} ice`,
      price: "100000",
      fuelType: "petrol",
      transmission: "manual",
    });

    const res = await searchListings(
      { category: "car", brand: t, fuel_type: "electric", transmission: "cvt" },
      undefined,
      50,
    );
    const ids = res.items.map((i) => i.id);
    expect(ids).toContain(electric);
    expect(ids).not.toContain(petrol);
  });
});

describe("getFacets counts mirror the filtered result set", () => {
  it("a facet count equals the size of the result set its filter produces", async () => {
    // electric/cvt are absent from the seed inventory, so the only ones present
    // are the cars this test inserts — letting us assert the facet count and the
    // filtered query agree exactly (the core 'count matches reality' guarantee).
    const t = token("FACETX");
    await carListing({ title: `${t} a`, price: "100000", fuelType: "electric", transmission: "cvt" });
    await carListing({ title: `${t} b`, price: "100000", fuelType: "electric", transmission: "cvt" });
    await carListing({ title: `${t} c`, price: "100000", fuelType: "electric", transmission: "cvt" });

    const facets = await getFacets("car");
    const electricCount = facets.fuel_type.electric ?? 0;
    const cvtCount = facets.transmission.cvt ?? 0;

    expect(electricCount).toBeGreaterThanOrEqual(3);
    expect(cvtCount).toBeGreaterThanOrEqual(3);

    // Facet count must equal what the same filter actually returns (pagination
    // cap aside — electric is rare enough to fit one page here).
    if (electricCount <= 50) {
      const res = await searchListings(
        { category: "car", fuel_type: "electric" },
        undefined,
        50,
      );
      expect(res.items.length).toBe(electricCount);
    }
  });

  it("unscoped category facet matches the per-category scoped total", async () => {
    // Strong cross-check: the global category map's car count is computed by a
    // different query path than the category-scoped total, yet must agree.
    const all = await getFacets();
    const carScoped = await getFacets("car");
    expect(all.category.car ?? 0).toBe(carScoped.total);
  });
});

afterAll(async () => {
  if (!uids.length) return;
  // listings → users FK is NOT cascade; delete owned listings first (cascades
  // to listing_attributes / listing_media / interactions) before the users.
  await db.delete(listings).where(inArray(listings.userId, uids));
  await deleteUsers(...uids);
});
