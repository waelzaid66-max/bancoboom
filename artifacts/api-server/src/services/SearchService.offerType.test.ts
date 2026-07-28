import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { searchListings, getFacets } from "./SearchService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { listings, listingMedia, listingAttributes } from "@workspace/db/schema";

/**
 * Real-estate offer_type (sale=تمليك vs rent=إيجار) — the primary EG/Gulf split.
 * Stored in listing_attributes.specs.offer_type and filtered/faceted like the
 * other specs-based real-estate filters. A unique title token scopes assertions
 * to this test's own rows so counts are deterministic against shared seed data.
 */
const uids: string[] = [];
const ids: string[] = [];

async function mkRealEstate(
  sellerId: string,
  token: string,
  suffix: string,
  offerType: "sale" | "rent"
): Promise<string> {
  const id = randomUUID();
  await db.insert(listings).values({
    id,
    userId: sellerId,
    title: `${token} ${suffix}`,
    category: "real_estate",
    status: "active",
    basePriceCash: "3000000",
    location: "Cairo",
  });
  await db.insert(listingMedia).values({
    id: randomUUID(),
    listingId: id,
    type: "image",
    url: `https://example.test/${id}.jpg`,
    thumbnailUrl: `https://example.test/${id}-thumb.jpg`,
    isThumbnail: true,
    sortOrder: 0,
  });
  await db.insert(listingAttributes).values({
    id: randomUUID(),
    listingId: id,
    specs: { offer_type: offerType, property_type: "apartment" },
    propertyType: "apartment",
  });
  ids.push(id);
  return id;
}

afterAll(async () => {
  // Cascade deletes the 1:1 attributes + media rows.
  for (const id of ids) await db.delete(listings).where(eq(listings.id, id));
  await deleteUsers(...uids);
});

describe("SearchService — real-estate offer_type (rent vs sale)", () => {
  it("filters sale vs rent independently, never mixing them", async () => {
    const seller = await createUser();
    uids.push(seller);
    const token = uniq("offer");

    const saleApt = await mkRealEstate(seller, token, "sale-apt", "sale");
    const rentApt = await mkRealEstate(seller, token, "rent-apt", "rent");

    // No offer_type → both rent and sale come back.
    const all = await searchListings({ category: "real_estate", search_term: token }, undefined, 50);
    const allIds = all.items.map((i) => i.id);
    expect(allIds).toContain(saleApt);
    expect(allIds).toContain(rentApt);

    // offer_type=sale → ONLY the sale listing (rent excluded — real filter).
    const sale = await searchListings(
      { category: "real_estate", search_term: token, offer_type: "sale" },
      undefined,
      50
    );
    const saleIds = sale.items.map((i) => i.id);
    expect(saleIds).toContain(saleApt);
    expect(saleIds).not.toContain(rentApt);

    // offer_type=rent → ONLY the rent listing.
    const rent = await searchListings(
      { category: "real_estate", search_term: token, offer_type: "rent" },
      undefined,
      50
    );
    const rentIds = rent.items.map((i) => i.id);
    expect(rentIds).toContain(rentApt);
    expect(rentIds).not.toContain(saleApt);
  });

  it("reports offer_type facet counts so the rent/sale chips gate on real data", async () => {
    const facets = await getFacets("real_estate");
    expect(facets.offer_type).toBeDefined();
    // Our two rows contribute at least one sale + one rent.
    expect(facets.offer_type.sale ?? 0).toBeGreaterThanOrEqual(1);
    expect(facets.offer_type.rent ?? 0).toBeGreaterThanOrEqual(1);
  });
});
