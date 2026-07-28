import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { eq, inArray, isNotNull } from "drizzle-orm";
import {
  createListing,
  updateListing,
  deleteListing,
  bumpListing,
  getListingDetail,
} from "./ListingService";
import { searchListings } from "./SearchService";
import { getFeed } from "./FeedService";
import { createConversation, sendMessage, getMessages } from "./ConversationService";
import { saveOrUnsaveListing, isSaved } from "./SaveService";
import { CreateListingSchema } from "../validators/schemas";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { listings, listingAttributes, users, locations } from "@workspace/db/schema";

/**
 * FULL marketplace sale cycle, EXECUTED end-to-end against a real Postgres —
 * the practical "the whole loop works" proof (Production Readiness #9):
 * publish → appears in feed + search → buyer opens → buyer messages seller →
 * buyer favorites → seller edits → seller promotes (bump) → archive (hide) →
 * republish (reappear) → delete (gone + cascade). No mocks; every step is a real
 * service call hitting the DB.
 */
const uids: string[] = [];
let locationInput = "Cairo";

async function seedUser(name: string): Promise<{ id: string; clerkId: string }> {
  const id = randomUUID();
  const clerkId = uniq("clerk");
  uids.push(id);
  await db.insert(users).values({ id, clerkId, name, role: "individual" });
  return { id, clerkId };
}

beforeAll(async () => {
  const [loc] = await db
    .select({ area: locations.area, city: locations.city })
    .from(locations)
    .where(isNotNull(locations.area))
    .limit(1);
  locationInput = loc?.area ?? loc?.city ?? "Cairo";
});

afterAll(async () => {
  await db.delete(listings).where(inArray(listings.userId, uids));
  await deleteUsers(...uids);
});

describe("Marketplace lifecycle — full sale cycle (executed E2E)", () => {
  it("publishes → appears → search → open → message → favorite → edit → promote → archive → republish → delete", async () => {
    const seller = await seedUser("E2E Seller");
    const buyer = await seedUser("E2E Buyer");
    const token = uniq("E2ECYCLE").toUpperCase();

    // 1) PUBLISH (validated through the real controller schema).
    const input = CreateListingSchema.parse({
      title: `${token} Toyota Corolla 2020`,
      description: "Clean, one owner, full service history.",
      category: "car",
      base_price_cash: 850000,
      location: locationInput,
      specs: { mileage: 40000, condition: "used", fuel_type: "petrol" },
      media: [{ type: "image", url: `https://cdn.example/${token}.jpg`, is_thumbnail: true }],
      payment_options: [{ mode: "cash" }],
    });
    const { id } = await createListing(input, seller.clerkId);
    expect(typeof id).toBe("string");

    // 2) APPEARS in the home feed AND search (with a real thumbnail).
    const feed = await getFeed({ category: "car", isRequest: false, limit: 150 });
    expect(feed.items.map((i) => i.id)).toContain(id);
    const found = await searchListings({ category: "car", search_term: token }, undefined, 50);
    const hit = found.items.find((i) => i.id === id);
    expect(hit).toBeTruthy();
    expect(hit!.media_preview).toBeTruthy(); // it actually shows a cover (won't be dropped)

    // 3) BUYER OPENS it.
    const detail = await getListingDetail(id, buyer.clerkId);
    expect(detail).toBeTruthy();
    expect(detail!.title).toContain("Corolla");

    // 4) BUYER MESSAGES the seller.
    const conv = await createConversation(buyer.clerkId, id);
    await sendMessage(buyer.clerkId, conv.id, "Is this still available?");
    const thread = await getMessages(seller.clerkId, conv.id);
    expect(thread.some((m) => m.body === "Is this still available?")).toBe(true);

    // 5) BUYER FAVORITES it.
    const fav = await saveOrUnsaveListing(buyer.clerkId, id);
    expect(fav.saved).toBe(true);
    expect(await isSaved(buyer.clerkId, id)).toBe(true);

    // 6) SELLER EDITS title + price (atomic) → reflected on open.
    await updateListing(id, seller.clerkId, { base_price_cash: 820000, title: `${token} Toyota Corolla 2020 — reduced` });
    const edited = await getListingDetail(id, buyer.clerkId);
    expect(edited!.title).toContain("reduced");

    // 7) SELLER PROMOTES (bump/renew) → recency stamp set.
    const bumped = await bumpListing(seller.clerkId, id);
    expect(bumped.bumped_at).toBeTruthy();

    // 8) ARCHIVE → disappears from search.
    await updateListing(id, seller.clerkId, { status: "archived" });
    const afterArchive = await searchListings({ category: "car", search_term: token }, undefined, 50);
    expect(afterArchive.items.map((i) => i.id)).not.toContain(id);

    // 9) REPUBLISH → reappears in search.
    await updateListing(id, seller.clerkId, { status: "active" });
    const afterRepublish = await searchListings({ category: "car", search_term: token }, undefined, 50);
    expect(afterRepublish.items.map((i) => i.id)).toContain(id);

    // 10) DELETE → gone + attributes cascaded (no orphans).
    const del = await deleteListing(id, seller.clerkId);
    expect(del.deleted).toBe(true);
    expect((await db.select({ id: listings.id }).from(listings).where(eq(listings.id, id))).length).toBe(0);
    expect(
      (await db.select({ id: listingAttributes.id }).from(listingAttributes).where(eq(listingAttributes.listingId, id))).length,
    ).toBe(0);
    const afterDelete = await searchListings({ category: "car", search_term: token }, undefined, 50);
    expect(afterDelete.items.map((i) => i.id)).not.toContain(id);
  });
});
