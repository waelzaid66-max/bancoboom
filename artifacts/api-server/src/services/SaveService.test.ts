import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { saveOrUnsaveListing, isSaved } from "./SaveService";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { users, listings, savedListings } from "@workspace/db/schema";

const uids: string[] = [];

// Seed one active listing with its own owner so teardown can drop
// owners-then-cascade cleanly (listings → users FK is NOT cascade).
async function seedListing(): Promise<string> {
  const ownerId = randomUUID();
  uids.push(ownerId);
  await db.insert(users).values({
    id: ownerId,
    clerkId: uniq("clerk-owner"),
    name: "Save Seller",
    role: "dealer",
  });
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId: ownerId,
    title: `${uniq("SAVE")} car`,
    category: "car",
    basePriceCash: "100000",
    location: "Cairo",
    status: "active",
  });
  return listingId;
}

// A distinct saver (the one toggling saves). Returns their clerk id.
async function seedSaver(): Promise<string> {
  const saverId = randomUUID();
  uids.push(saverId);
  const clerkId = uniq("clerk-saver");
  await db.insert(users).values({
    id: saverId,
    clerkId,
    name: "Saver",
    role: "individual",
  });
  return clerkId;
}

async function savesCount(listingId: string): Promise<number> {
  const [row] = await db
    .select({ n: listings.savesCount })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  return row?.n ?? -1;
}

async function rowCount(listingId: string): Promise<number> {
  const rows = await db
    .select({ id: savedListings.id })
    .from(savedListings)
    .where(eq(savedListings.listingId, listingId));
  return rows.length;
}

beforeAll(async () => {
  await db.execute(sql`SELECT 1`);
});

afterAll(async () => {
  // Deleting the listings cascades saved_listings; deleting the users cascades
  // any saver rows too. Drop owned listings first, then all seeded users.
  await db.delete(listings).where(inArray(listings.userId, uids));
  await deleteUsers(...uids);
});

describe("saveOrUnsaveListing — denormalized counter stays in lockstep", () => {
  it("toggles membership and moves saves_count 0 → 1 → 0", async () => {
    const listingId = await seedListing();
    const saver = await seedSaver();

    expect(await savesCount(listingId)).toBe(0);

    const on = await saveOrUnsaveListing(saver, listingId);
    expect(on.saved).toBe(true);
    expect(await isSaved(saver, listingId)).toBe(true);
    expect(await savesCount(listingId)).toBe(1);
    expect(await rowCount(listingId)).toBe(1);

    const off = await saveOrUnsaveListing(saver, listingId);
    expect(off.saved).toBe(false);
    expect(await isSaved(saver, listingId)).toBe(false);
    expect(await savesCount(listingId)).toBe(0);
    expect(await rowCount(listingId)).toBe(0);
  });

  it("counts each distinct saver independently", async () => {
    const listingId = await seedListing();
    const a = await seedSaver();
    const b = await seedSaver();

    await saveOrUnsaveListing(a, listingId);
    await saveOrUnsaveListing(b, listingId);
    expect(await savesCount(listingId)).toBe(2);
    expect(await rowCount(listingId)).toBe(2);

    await saveOrUnsaveListing(a, listingId);
    expect(await savesCount(listingId)).toBe(1);
    expect(await rowCount(listingId)).toBe(1);
  });
});

describe("saved_listings UNIQUE(user_id, listing_id) — concurrent-save safety", () => {
  it("two concurrent inserts for the same (user, listing) yield exactly one row", async () => {
    const listingId = await seedListing();
    const saverId = randomUUID();
    uids.push(saverId);
    await db.insert(users).values({
      id: saverId,
      clerkId: uniq("clerk-conc"),
      name: "Concurrent Saver",
      role: "individual",
    });

    // Mirror the exact insert path the toggle uses. With the unique index, the
    // loser of the race conflicts and returns no row — so a counter driven off
    // `inserted.length` would increment exactly once, never twice.
    const [a, b] = await Promise.all([
      db
        .insert(savedListings)
        .values({ userId: saverId, listingId })
        .onConflictDoNothing({
          target: [savedListings.userId, savedListings.listingId],
        })
        .returning({ id: savedListings.id }),
      db
        .insert(savedListings)
        .values({ userId: saverId, listingId })
        .onConflictDoNothing({
          target: [savedListings.userId, savedListings.listingId],
        })
        .returning({ id: savedListings.id }),
    ]);

    // Exactly one insert genuinely happened; the other was a no-op (no throw).
    expect(a.length + b.length).toBe(1);

    const rows = await db
      .select({ id: savedListings.id })
      .from(savedListings)
      .where(
        and(
          eq(savedListings.userId, saverId),
          eq(savedListings.listingId, listingId),
        ),
      );
    expect(rows.length).toBe(1);
  });
});
