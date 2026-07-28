import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { bumpListing } from "./ListingService";
import { searchListings } from "./SearchService";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { users, listings, listingMedia } from "@workspace/db/schema";

const uids: string[] = [];

/**
 * Seed one active car listing with its own owner (so teardown can drop
 * users-then-cascade cleanly) and the thumbnail the search transform requires.
 * Returns the listing id plus the owner's clerk id (bumpListing is clerk-scoped)
 * and a brand token embedded in the title so a test can isolate exactly its own
 * rows on the shared DB via the brand ilike filter.
 */
async function seedListing(opts: {
  token: string;
  createdAt?: Date;
  bumpedAt?: Date | null;
  status?: "active" | "sold";
  isFlagged?: boolean;
  shadowBanned?: boolean;
}): Promise<{ id: string; ownerClerkId: string }> {
  const userId = randomUUID();
  uids.push(userId);
  const ownerClerkId = uniq("clerk");
  await db.insert(users).values({
    id: userId,
    clerkId: ownerClerkId,
    name: "Bump Seller",
    role: "dealer",
    isShadowBanned: opts.shadowBanned ?? false,
  });
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId,
    title: `${opts.token} ${uniq("car")}`,
    category: "car",
    basePriceCash: "100000",
    location: "Cairo",
    status: opts.status ?? "active",
    isFlagged: opts.isFlagged ?? false,
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    ...(opts.bumpedAt !== undefined ? { bumpedAt: opts.bumpedAt } : {}),
  });
  await db.insert(listingMedia).values({
    listingId,
    type: "image",
    url: `https://img.test/${listingId}.jpg`,
    isThumbnail: true,
  });
  return { id: listingId, ownerClerkId };
}

function token(prefix: string): string {
  return uniq(prefix).toUpperCase();
}

beforeAll(async () => {
  await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
  // listings → users FK is NOT cascade; delete owned listings first (cascades
  // to media/attributes/interactions), then the users.
  await db.delete(listings).where(inArray(listings.userId, uids));
  await deleteUsers(...uids);
});

describe("bumpListing (recycle/renew)", () => {
  it("only the owner can bump; non-owner is FORBIDDEN, missing is NOT_FOUND", async () => {
    const { id, ownerClerkId } = await seedListing({ token: token("BUMPOWN") });
    const strangerId = randomUUID();
    uids.push(strangerId);
    const strangerClerk = uniq("clerk");
    await db.insert(users).values({
      id: strangerId,
      clerkId: strangerClerk,
      name: "Stranger",
      role: "dealer",
    });

    await expect(bumpListing(strangerClerk, id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(bumpListing(ownerClerkId, randomUUID())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Owner succeeds.
    const res = await bumpListing(ownerClerkId, id);
    expect(res.id).toBe(id);
    expect(typeof res.bumped_at).toBe("string");
    expect(typeof res.next_bump_available_at).toBe("string");
  });

  it("a sold or flagged listing is not eligible (NOT_FOUND)", async () => {
    const sold = await seedListing({ token: token("BUMPSOLD"), status: "sold" });
    const flagged = await seedListing({ token: token("BUMPFLAG"), isFlagged: true });

    await expect(bumpListing(sold.ownerClerkId, sold.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      bumpListing(flagged.ownerClerkId, flagged.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a shadow-banned seller cannot recycle (hidden → NOT_FOUND, no fake success)", async () => {
    const { id, ownerClerkId } = await seedListing({
      token: token("BUMPSHADOW"),
      shadowBanned: true,
    });

    await expect(bumpListing(ownerClerkId, id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("enforces the cooldown: a recently-bumped listing is RATE_LIMITED", async () => {
    const { id, ownerClerkId } = await seedListing({
      token: token("BUMPCD"),
      // Bumped a minute ago — well inside the 24h cooldown.
      bumpedAt: new Date(Date.now() - 60_000),
    });

    await expect(bumpListing(ownerClerkId, id)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      nextBumpAvailableAt: expect.any(String),
    });
  });

  it("never changes created_at — only sets bumped_at (> created_at)", async () => {
    const createdAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const { id, ownerClerkId } = await seedListing({
      token: token("BUMPDATE"),
      createdAt,
    });

    const [before] = await db
      .select({ created_at: listings.createdAt })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    await bumpListing(ownerClerkId, id);

    const [after] = await db
      .select({ created_at: listings.createdAt, bumped_at: listings.bumpedAt })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    expect(after.created_at?.getTime()).toBe(before.created_at?.getTime());
    expect(after.bumped_at).not.toBeNull();
    expect(after.bumped_at!.getTime()).toBeGreaterThan(after.created_at!.getTime());
  });

  it("lifts an old listing above a newer one in recency (newest) sort", async () => {
    const t = token("BUMPTOP");
    // old was created first; fresh created later. Without a bump, newest sort
    // would put fresh ahead of old.
    const old = await seedListing({
      token: t,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
    const fresh = await seedListing({
      token: t,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const before = await searchListings(
      { category: "car", brand: t, sort: "newest" },
      undefined,
      50,
    );
    expect(before.items.map((i) => i.id)).toEqual([fresh.id, old.id]);

    // Recycle the old one — its COALESCE(bumped_at, created_at) becomes "now".
    await bumpListing(old.ownerClerkId, old.id);

    const after = await searchListings(
      { category: "car", brand: t, sort: "newest" },
      undefined,
      50,
    );
    expect(after.items.map((i) => i.id)).toEqual([old.id, fresh.id]);
  });

  it("newest pagination never skips listings that share an effective-recency timestamp", async () => {
    const t = token("BUMPTIE");
    // Three listings with the SAME created_at (no bump) → tied effective recency.
    // With a timestamp-only "< ts" cursor the boundary row would be skipped; the
    // composite "<ts>|<id>" keyset must page through all three with no gaps.
    const tied = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const a = await seedListing({ token: t, createdAt: tied });
    const b = await seedListing({ token: t, createdAt: tied });
    const c = await seedListing({ token: t, createdAt: tied });
    // Tied recency → ORDER BY collapses to id ASC, which (lowercase canonical
    // uuids) matches a lexicographic sort.
    const ordered = [a.id, b.id, c.id].sort();

    const p1 = await searchListings(
      { category: "car", brand: t, sort: "newest" },
      undefined,
      2,
    );
    expect(p1.items.map((i) => i.id)).toEqual([ordered[0], ordered[1]]);
    expect(p1.has_next).toBe(true);

    const p2 = await searchListings(
      { category: "car", brand: t, sort: "newest" },
      p1.cursor,
      2,
    );
    expect(p2.items.map((i) => i.id)).toEqual([ordered[2]]);
    expect(p2.has_next).toBe(false);
  });
});
