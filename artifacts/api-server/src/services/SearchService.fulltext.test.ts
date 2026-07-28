import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { searchListings } from "./SearchService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { listings, listingMedia, listingAttributes } from "@workspace/db/schema";

/**
 * Philosophy principle 10 — find a listing by ANY of its data: title, description,
 * or a structured/CUSTOM spec VALUE (not the keys). This is what makes the
 * unlimited custom specs (Phase A) actually discoverable. Real DB, scoped by
 * unique tokens.
 */
const uids: string[] = [];
const ids: string[] = [];

async function mkListing(
  sellerId: string,
  opts: { title: string; description?: string; specs?: Record<string, unknown> }
): Promise<string> {
  const id = randomUUID();
  await db.insert(listings).values({
    id,
    userId: sellerId,
    title: opts.title,
    description: opts.description ?? null,
    category: "industrial",
    status: "active",
    basePriceCash: "1000000",
    location: "Cairo",
  });
  await db.insert(listingMedia).values({
    id: randomUUID(),
    listingId: id,
    type: "image",
    url: `https://e.test/${id}.jpg`,
    thumbnailUrl: `https://e.test/${id}-t.jpg`,
    isThumbnail: true,
    sortOrder: 0,
  });
  if (opts.specs) {
    await db.insert(listingAttributes).values({ id: randomUUID(), listingId: id, specs: opts.specs });
  }
  ids.push(id);
  return id;
}

afterAll(async () => {
  for (const id of ids) await db.delete(listings).where(eq(listings.id, id));
  await deleteUsers(...uids);
});

describe("SearchService — full-text across title + description + spec values", () => {
  it("finds a listing by a CUSTOM spec VALUE that's not in the title", async () => {
    const seller = await createUser();
    uids.push(seller);
    const brand = uniq("Raycus").replace(/[^A-Za-z0-9]/g, "");

    const laser = await mkListing(seller, {
      title: "fiber laser cutter",
      specs: { laser_source: brand, power: "12000W" },
    });
    const other = await mkListing(seller, {
      title: "fiber laser cutter",
      specs: { laser_source: "OtherSource" },
    });

    const res = await searchListings({ search_term: brand }, undefined, 50);
    const found = res.items.map((i) => i.id);
    expect(found).toContain(laser);
    expect(found).not.toContain(other);
  });

  it("finds a listing by a DESCRIPTION word not in the title or specs", async () => {
    const seller = await createUser();
    uids.push(seller);
    const word = uniq("descword").replace(/[^A-Za-z0-9]/g, "");

    const withDesc = await mkListing(seller, {
      title: "generic industrial widget",
      description: `heavy-duty ${word} certified unit`,
    });

    const res = await searchListings({ search_term: word }, undefined, 50);
    expect(res.items.map((i) => i.id)).toContain(withDesc);
  });

  it("matches spec VALUES only, never the spec KEYS (no generic-key noise)", async () => {
    const seller = await createUser();
    uids.push(seller);
    const tok = uniq("kn").replace(/[^A-Za-z0-9]/g, "");

    const a = await mkListing(seller, {
      title: `${tok} machine`,
      specs: { laser_source: "Acme", note: tok },
    });

    // Found by a spec VALUE.
    const byValue = await searchListings({ search_term: tok }, undefined, 50);
    expect(byValue.items.map((i) => i.id)).toContain(a);

    // NOT found by a spec KEY name ("laser_source" is a key, never a value here).
    const byKey = await searchListings({ search_term: "laser_source" }, undefined, 50);
    expect(byKey.items.map((i) => i.id)).not.toContain(a);
  });
});
