import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { normalizeListing, detectPriceOutlier } from "./NormalizationService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { brands, models, listings, listingAttributes } from "@workspace/db/schema";

const uids: string[] = [];
const listingIds: string[] = [];
const modelIds: string[] = [];
const brandIds: string[] = [];

const img = (url: string) => ({ type: "image" as const, url, width: 800, height: 600 });

/**
 * Stands up an isolated, deterministic comparable set for the price-outlier
 * detector: a throwaway brand + model so the scope (category=car, model=X)
 * contains ONLY the listings we insert here — never seed or other-test data.
 */
async function isolatedCarModel(): Promise<string> {
  const sellerId = await createUser();
  uids.push(sellerId);
  const brandId = randomUUID();
  const modelId = randomUUID();
  await db.insert(brands).values({ id: brandId, name: uniq("Brand"), slug: uniq("brand"), category: "car" });
  brandIds.push(brandId);
  await db.insert(models).values({ id: modelId, brandId, name: uniq("Model"), slug: uniq("model") });
  modelIds.push(modelId);
  return modelId;
}

async function seedComparables(modelId: string, count: number, price: string): Promise<void> {
  const sellerId = await createUser();
  uids.push(sellerId);
  for (let i = 0; i < count; i++) {
    const id = randomUUID();
    listingIds.push(id);
    await db.insert(listings).values({
      id,
      userId: sellerId,
      title: uniq("comp"),
      category: "car",
      basePriceCash: price,
      location: "Cairo",
    });
    await db.insert(listingAttributes).values({ listingId: id, modelId, specs: {} });
  }
}

describe("normalizeListing — taxonomy / location control", () => {
  it("rejects an unrecognized location in strict mode", async () => {
    const sellerId = await createUser();
    uids.push(sellerId);
    await expect(
      normalizeListing(
        {
          title: "Toyota Corolla 2021",
          category: "car",
          base_price_cash: 500000,
          location: "Qwxyz Nowhere Town",
          specs: {},
          media: [img("loc1.jpg")],
        },
        { sellerId, sellerVerified: false },
      ),
    ).rejects.toThrow(/location/i);
  });

  it("rejects an unrecognized car brand in strict mode", async () => {
    const sellerId = await createUser();
    uids.push(sellerId);
    await expect(
      normalizeListing(
        {
          title: "Clean family vehicle 2020",
          category: "car",
          base_price_cash: 400000,
          location: "New Cairo",
          specs: { brand: "Zzqwerty Motors" },
          media: [img("brand1.jpg")],
        },
        { sellerId, sellerVerified: false },
      ),
    ).rejects.toThrow(/brand/i);
  });

  it("downgrades unrecognized controlled values to warnings in lenient mode", async () => {
    const sellerId = await createUser();
    uids.push(sellerId);
    const r = await normalizeListing(
      {
        title: "Clean family vehicle 2020",
        category: "car",
        base_price_cash: 400000,
        location: "Qwxyz Nowhere Town",
        specs: { brand: "Zzqwerty Motors" },
        media: [img("len1.jpg")],
      },
      { sellerId, sellerVerified: false, lenient: true },
    );
    expect(r.locationId).toBeNull();
    expect(r.taxonomy.brandId).toBeNull();
    expect(r.warnings.some((w) => /location/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /brand/i.test(w))).toBe(true);
  });

  it("resolves a recognized brand + location to controlled ids", async () => {
    const sellerId = await createUser();
    uids.push(sellerId);
    const r = await normalizeListing(
      {
        title: "Toyota Corolla 2021 excellent",
        category: "car",
        base_price_cash: 500000,
        location: "New Cairo",
        specs: { brand: "Toyota" },
        media: [img("ok1.jpg"), img("ok2.jpg")],
      },
      { sellerId, sellerVerified: true },
    );
    expect(r.category).toBe("car");
    expect(r.locationId).not.toBeNull();
    expect(r.locationCanonical).toMatch(/New Cairo/);
    expect(r.taxonomy.brandId).not.toBeNull();
    expect(r.specs.brand).toBe("Toyota");
  });
});

describe("detectPriceOutlier — price-outlier flagging", () => {
  it("never flags a non-positive price", async () => {
    const r = await detectPriceOutlier({ category: "car", price: 0 });
    expect(r.isOutlier).toBe(false);
    expect(r.median).toBeNull();
    expect(r.sampleSize).toBe(0);
  });

  it("never flags when the comparable sample is too thin (min-sample guard)", async () => {
    const modelId = await isolatedCarModel();
    await seedComparables(modelId, 3, "500000"); // < 8 comparables
    const r = await detectPriceOutlier({ category: "car", price: 5000000, modelId });
    expect(r.sampleSize).toBe(3);
    expect(r.isOutlier).toBe(false); // extreme price, but too few comparables to judge
  });

  it("flags an extreme price once enough comparables exist", async () => {
    const modelId = await isolatedCarModel();
    await seedComparables(modelId, 8, "500000"); // median == 500000
    const extreme = await detectPriceOutlier({ category: "car", price: 5000000, modelId });
    expect(extreme.sampleSize).toBe(8);
    expect(extreme.median).toBe(500000);
    expect(extreme.isOutlier).toBe(true); // > median * 4

    const reasonable = await detectPriceOutlier({ category: "car", price: 520000, modelId });
    expect(reasonable.isOutlier).toBe(false); // within bounds
  });
});

afterAll(async () => {
  if (listingIds.length) {
    await db.delete(listingAttributes).where(inArray(listingAttributes.listingId, listingIds));
    await db.delete(listings).where(inArray(listings.id, listingIds));
  }
  if (modelIds.length) await db.delete(models).where(inArray(models.id, modelIds));
  if (brandIds.length) await db.delete(brands).where(inArray(brands.id, brandIds));
  if (uids.length) {
    await db.delete(listings).where(inArray(listings.userId, uids));
    await deleteUsers(...uids);
  }
});
