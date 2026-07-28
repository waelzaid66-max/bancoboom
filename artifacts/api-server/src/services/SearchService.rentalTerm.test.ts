import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { searchListings } from "./SearchService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { listings, listingMedia, listingAttributes } from "@workspace/db/schema";

/**
 * Rental system (نظام الإيجار) — Egypt's real regimes as a search dimension:
 * furnished_daily (from 1 day) / new_law (≤5y) / old_law (≤59y). Stored as a
 * plain spec (adaptive-data philosophy) and filtered verbatim, so per-country
 * expansion (Gulf annual_contract etc.) is catalog-only. Proves each term
 * filters independently and that no filter returns all rentals.
 */
const uids: string[] = [];
const ids: string[] = [];

async function mkRental(
  sellerId: string,
  token: string,
  rentalTerm: string,
): Promise<string> {
  const id = randomUUID();
  await db.insert(listings).values({
    id,
    userId: sellerId,
    title: `${token} ${rentalTerm} apartment`,
    category: "real_estate",
    status: "active",
    basePriceCash: "15000",
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
    specs: { offer_type: "rent", rental_term: rentalTerm, property_type: "apartment" },
    propertyType: "apartment",
  });
  ids.push(id);
  return id;
}

afterAll(async () => {
  for (const id of ids) await db.delete(listings).where(eq(listings.id, id));
  await deleteUsers(...uids);
});

describe("SearchService — rental_term (Egypt rental regimes)", () => {
  it("filters furnished_daily / new_law / old_law independently; no filter returns all", async () => {
    const seller = await createUser();
    uids.push(seller);
    const token = uniq("rterm");

    const daily = await mkRental(seller, token, "furnished_daily");
    const newLaw = await mkRental(seller, token, "new_law");
    const oldLaw = await mkRental(seller, token, "old_law");

    // Each regime filters to EXACTLY its own listing.
    for (const [term, expected] of [
      ["furnished_daily", daily],
      ["new_law", newLaw],
      ["old_law", oldLaw],
    ] as const) {
      const res = await searchListings(
        { category: "real_estate", search_term: token, offer_type: "rent", rental_term: term },
        undefined,
        50,
      );
      const found = res.items.map((i) => i.id);
      expect(found).toContain(expected);
      for (const other of [daily, newLaw, oldLaw].filter((x) => x !== expected)) {
        expect(found).not.toContain(other);
      }
    }

    // No rental_term → all three rentals come back (additive filter).
    const all = await searchListings(
      { category: "real_estate", search_term: token, offer_type: "rent" },
      undefined,
      50,
    );
    const allIds = all.items.map((i) => i.id);
    expect(allIds).toContain(daily);
    expect(allIds).toContain(newLaw);
    expect(allIds).toContain(oldLaw);

    // Honest price-period suffix: rentals are quoted per period, per their
    // actual rental system (daily furnished → /يوم, laws → /شهر).
    const byId = new Map(all.items.map((i) => [i.id, i.price_display]));
    expect(byId.get(daily)).toContain("/يوم");
    expect(byId.get(newLaw)).toContain("/شهر");
    expect(byId.get(oldLaw)).toContain("/شهر");
  });
});
