import { describe, it, expect, afterAll } from "vitest";
import { inArray } from "drizzle-orm";
import { searchListings, type IndustrialSubtype } from "./SearchService";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import {
  users,
  listings,
  listingAttributes,
  listingMedia,
} from "@workspace/db/schema";

// The two browse "sections" both map to the API `industrial` category and are
// separated only by industrial_type. These mirror the mobile client's
// FACILITIES_TYPES / MATERIALS_TYPES groups (components/CategoryTabs.tsx).
const FACILITIES_TYPES: IndustrialSubtype[] = ["factory", "warehouse", "land"];
const MATERIALS_TYPES: IndustrialSubtype[] = [
  "production_line",
  "raw_material",
  "machine",
];

const uids: string[] = [];

/**
 * Insert a throwaway active industrial listing carrying a single industrial
 * sub-type (plus the thumbnail the FeedItem transform requires). Each gets its
 * own owner so teardown can delete listings-then-users without FK trouble.
 */
async function industrialListing(
  industrialType: IndustrialSubtype,
): Promise<string> {
  const userId = randomUUID();
  uids.push(userId);
  await db.insert(users).values({
    id: userId,
    clerkId: uniq("clerk"),
    name: "Industrial Seller",
    role: "dealer",
  });
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId,
    title: uniq("industrial"),
    category: "industrial",
    basePriceCash: "1000000",
    location: "Cairo",
    status: "active",
  });
  await db.insert(listingAttributes).values({
    listingId,
    specs: { industrial_type: industrialType, industry: "plastic" },
    industrialType,
    industry: "plastic",
  });
  await db.insert(listingMedia).values({
    listingId,
    type: "image",
    url: `https://img.test/${listingId}.jpg`,
    isThumbnail: true,
  });
  return listingId;
}

/**
 * Section separation is now a server-side filter (industrial_type group) shared
 * by the Search tab and the dedicated results screen. These assert each group
 * filter returns ONLY its own section — a listing from the other section must
 * never bleed in, regardless of pagination. Membership of freshly-seeded
 * (newest) ids is checked rather than counts, so the shared DB stays safe.
 */
describe("searchListings industrial section filter", () => {
  it("a facilities-group filter returns facilities and never materials", async () => {
    const facility = await industrialListing("factory");
    const material = await industrialListing("production_line");

    const res = await searchListings(
      { category: "industrial", industrial_type: FACILITIES_TYPES },
      undefined,
      50,
    );
    const ids = res.items.map((i) => i.id);

    expect(ids).toContain(facility);
    expect(ids).not.toContain(material);
  });

  it("a materials-group filter returns materials and never facilities", async () => {
    const facility = await industrialListing("warehouse");
    const material = await industrialListing("machine");

    const res = await searchListings(
      { category: "industrial", industrial_type: MATERIALS_TYPES },
      undefined,
      50,
    );
    const ids = res.items.map((i) => i.id);

    expect(ids).toContain(material);
    expect(ids).not.toContain(facility);
  });
});

afterAll(async () => {
  if (!uids.length) return;
  // listings → users FK is NOT cascade; delete owned listings first (cascades
  // to listing_attributes + listing_media) before removing the users.
  await db.delete(listings).where(inArray(listings.userId, uids));
  await deleteUsers(...uids);
});
