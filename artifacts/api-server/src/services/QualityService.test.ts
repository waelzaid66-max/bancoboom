import { describe, it, expect, afterAll } from "vitest";
import { inArray } from "drizzle-orm";
import { computeDealerQuality } from "./QualityService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { listings } from "@workspace/db/schema";

const uids: string[] = [];

describe("computeDealerQuality", () => {
  it("gives a dealer with no history a neutral score of 40", async () => {
    const q = await computeDealerQuality(randomUUID()); // unknown dealer, zero data
    expect(q.totalLeads).toBe(0);
    expect(q.reviewCount).toBe(0);
    expect(q.listingQuality).toBe(0);
    expect(q.score).toBe(40);
  });

  it("scores on listing quality alone when there are no leads or reviews", async () => {
    const dealer = await createUser({ role: "dealer" });
    uids.push(dealer);
    await db.insert(listings).values({
      userId: dealer,
      title: uniq("l"),
      category: "car",
      basePriceCash: "100000",
      location: "Cairo",
      trustScore: 80,
    });
    const q = await computeDealerQuality(dealer);
    expect(q.totalLeads).toBe(0);
    expect(q.reviewCount).toBe(0);
    expect(q.listingQuality).toBeCloseTo(0.8, 5);
    expect(q.score).toBe(72); // round(40 + 0.8 * 40)
  });
});

afterAll(async () => {
  if (uids.length) {
    await db.delete(listings).where(inArray(listings.userId, uids));
    await deleteUsers(...uids);
  }
});
