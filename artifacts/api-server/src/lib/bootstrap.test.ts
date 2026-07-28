import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { ensureDbExtensions } from "./bootstrap";
import { searchListings } from "../services/SearchService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { listings, listingMedia } from "@workspace/db/schema";

/**
 * Large-catalog search acceleration (GIN trigram). Proves on a real PG that the
 * boot path actually creates the trigram indexes (idempotently — safe to re-run)
 * and that a search_term query still returns correct results afterwards, i.e.
 * the acceleration changed the PLAN, never the SEMANTICS.
 */
const uids: string[] = [];
const ids: string[] = [];

afterAll(async () => {
  for (const id of ids) await db.delete(listings).where(eq(listings.id, id));
  await deleteUsers(...uids);
});

describe("bootstrap — search trigram indexes", () => {
  it("creates idx_listings_title_trgm + idx_listings_description_trgm, idempotently", async () => {
    await ensureDbExtensions();
    await ensureDbExtensions(); // second run must be a clean no-op

    const rows = await db.execute(
      sql`SELECT indexname FROM pg_indexes WHERE tablename = 'listings' AND indexname LIKE 'idx_listings_%_trgm'`,
    );
    const names = rows.rows.map((r) => (r as { indexname: string }).indexname).sort();
    expect(names).toEqual([
      "idx_listings_description_trgm",
      "idx_listings_title_trgm",
    ]);
  });

  it("search stays correct with the indexes in place (title AND description hits)", async () => {
    const seller = await createUser();
    uids.push(seller);
    const token = uniq("trgm");

    const byTitle = randomUUID();
    await db.insert(listings).values({
      id: byTitle,
      userId: seller,
      title: `${token} sedan`,
      category: "car",
      status: "active",
      basePriceCash: "400000",
      location: "Cairo",
    });
    const byDescription = randomUUID();
    await db.insert(listings).values({
      id: byDescription,
      userId: seller,
      title: "well kept car",
      description: `hidden token ${token} only in the description`,
      category: "car",
      status: "active",
      basePriceCash: "410000",
      location: "Cairo",
    });
    for (const id of [byTitle, byDescription]) {
      ids.push(id);
      await db.insert(listingMedia).values({
        id: randomUUID(),
        listingId: id,
        type: "image",
        url: `https://example.test/${id}.jpg`,
        thumbnailUrl: `https://example.test/${id}-thumb.jpg`,
        isThumbnail: true,
        sortOrder: 0,
      });
    }

    const found = await searchListings({ search_term: token }, undefined, 50);
    const foundIds = found.items.map((i) => i.id);
    expect(foundIds).toContain(byTitle);
    expect(foundIds).toContain(byDescription);
  });
});
