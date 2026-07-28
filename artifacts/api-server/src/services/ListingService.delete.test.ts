import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { createListing, deleteListing } from "./ListingService";
import { CreateListingSchema } from "../validators/schemas";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { listings, listingAttributes, listingMedia, users, locations } from "@workspace/db/schema";

/**
 * Delete-listing journey. Proves owner-only authorization and that deleting a
 * listing CASCADES to its 1:1 attributes sidecar + media (every FK referencing
 * listings.id is cascade/set-null, so the single delete can't FK-violate or
 * orphan rows), and that a rejected delete leaves the listing intact.
 */
const uids: string[] = [];
let locationInput = "Cairo";

async function seedOwner(): Promise<string> {
  const userId = randomUUID();
  const clerkId = uniq("clerk");
  uids.push(userId);
  await db.insert(users).values({ id: userId, clerkId, name: "Delete Seller", role: "individual" });
  return clerkId;
}

async function mkListing(ownerClerk: string, token: string): Promise<string> {
  const input = CreateListingSchema.parse({
    title: `${token} sedan`,
    description: "Clean car, ready to drive.",
    category: "car",
    base_price_cash: 300000,
    location: locationInput,
    specs: { mileage: 50000, condition: "used" },
    media: [{ type: "image", url: `https://cdn.example/${token}.jpg`, is_thumbnail: true }],
    payment_options: [{ mode: "cash" }],
  });
  const { id } = await createListing(input, ownerClerk);
  return id;
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

describe("ListingService.deleteListing — delete journey", () => {
  it("owner delete removes the listing AND cascades to attributes + media", async () => {
    const ownerClerk = await seedOwner();
    const id = await mkListing(ownerClerk, uniq("DEL").toUpperCase());

    // Precondition: the 1:1 attributes row + ≥1 media row exist.
    const attrBefore = await db
      .select({ id: listingAttributes.id })
      .from(listingAttributes)
      .where(eq(listingAttributes.listingId, id));
    const mediaBefore = await db
      .select({ id: listingMedia.id })
      .from(listingMedia)
      .where(eq(listingMedia.listingId, id));
    expect(attrBefore.length).toBe(1);
    expect(mediaBefore.length).toBeGreaterThanOrEqual(1);

    const res = await deleteListing(id, ownerClerk);
    expect(res.deleted).toBe(true);

    // Listing gone + children cascaded (no orphans).
    const after = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, id));
    expect(after.length).toBe(0);
    const attrAfter = await db
      .select({ id: listingAttributes.id })
      .from(listingAttributes)
      .where(eq(listingAttributes.listingId, id));
    const mediaAfter = await db
      .select({ id: listingMedia.id })
      .from(listingMedia)
      .where(eq(listingMedia.listingId, id));
    expect(attrAfter.length).toBe(0);
    expect(mediaAfter.length).toBe(0);
  });

  it("rejects delete from a non-owner, leaving the listing intact (authorization)", async () => {
    const ownerClerk = await seedOwner();
    const strangerClerk = await seedOwner();
    const id = await mkListing(ownerClerk, uniq("DELOWN").toUpperCase());

    await expect(deleteListing(id, strangerClerk)).rejects.toThrow(/not found or access denied/i);

    const still = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, id));
    expect(still.length).toBe(1);
  });
});
