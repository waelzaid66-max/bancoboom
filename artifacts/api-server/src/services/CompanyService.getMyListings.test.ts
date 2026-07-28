import { describe, it, expect, afterAll } from "vitest";
import { inArray } from "drizzle-orm";
import { getMyListings } from "./CompanyService";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { users, listings, listingMedia } from "@workspace/db/schema";

const uids: string[] = [];

/**
 * Insert a throwaway user with a KNOWN clerkId (getMyListings resolves the DB
 * owner from the Clerk id, mirroring every other /me handler) plus one listing
 * with a thumbnail so the row survives the FeedItem media transform.
 */
async function userWithListing(
  role: "individual" | "dealer",
  status: "active" | "sold" = "active",
): Promise<{ clerkId: string; userId: string; listingId: string }> {
  const userId = randomUUID();
  const clerkId = uniq("clerk");
  uids.push(userId);
  await db.insert(users).values({
    id: userId,
    clerkId,
    name: "Owner",
    role,
  });
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId,
    title: uniq("listing"),
    category: "car",
    basePriceCash: "500000",
    location: "Cairo",
    status,
  });
  await db.insert(listingMedia).values({
    listingId,
    type: "image",
    url: `https://img.test/${listingId}.jpg`,
    isThumbnail: true,
  });
  return { clerkId, userId, listingId };
}

describe("getMyListings (owner-scoped profile grid)", () => {
  it("returns only the caller's own listings for an individual", async () => {
    const me = await userWithListing("individual");
    const other = await userWithListing("dealer");

    const mine = await getMyListings(me.clerkId);
    const ids = mine.items.map((i) => i.id);

    expect(ids).toContain(me.listingId);
    expect(ids).not.toContain(other.listingId);
  });

  it("works for a business owner too (role-agnostic)", async () => {
    const biz = await userWithListing("dealer");

    const mine = await getMyListings(biz.clerkId);
    const ids = mine.items.map((i) => i.id);

    expect(ids).toContain(biz.listingId);
  });

  it("includes the owner's non-active listings (no public-visibility gate)", async () => {
    const owner = await userWithListing("individual");
    // A second, sold listing for the same owner.
    const soldId = randomUUID();
    await db.insert(listings).values({
      id: soldId,
      userId: owner.userId,
      title: uniq("sold"),
      category: "car",
      basePriceCash: "300000",
      location: "Cairo",
      status: "sold",
    });
    await db.insert(listingMedia).values({
      listingId: soldId,
      type: "image",
      url: `https://img.test/${soldId}.jpg`,
      isThumbnail: true,
    });

    const mine = await getMyListings(owner.clerkId);
    const ids = mine.items.map((i) => i.id);

    expect(ids).toContain(owner.listingId);
    expect(ids).toContain(soldId);
  });

  it("returns an empty list for an unknown caller (no DB user)", async () => {
    const result = await getMyListings(uniq("ghost"));
    expect(result.items).toEqual([]);
    expect(result.has_next).toBe(false);
  });
});

afterAll(async () => {
  if (!uids.length) return;
  // listings → users FK is NOT cascade; delete owned listings first (which
  // cascades to listing_media) before removing the users.
  await db.delete(listings).where(inArray(listings.userId, uids));
  await deleteUsers(...uids);
});
