import { db } from "@workspace/db";
import { savedListings, users, listings } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

import { createNotification } from "./NotificationService";

/**
 * B-reaction → owner ping: a genuine NEW save notifies the listing owner
 * (bilingual, deep-links to the listing). Fired AFTER the toggle transaction
 * commits, fully best-effort — the save itself never waits on or fails with it.
 * Unsaves and self-saves stay silent.
 */
async function notifyOwnerOfSave(saverId: string, listingId: string): Promise<void> {
  try {
    const [listing] = await db
      .select({ ownerId: listings.userId, title: listings.title })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!listing?.ownerId || listing.ownerId === saverId) return;
    await createNotification({
      userId: listing.ownerId,
      type: "system",
      title: "إعجاب جديد بإعلانك · New like on your listing",
      body: `شخص حفظ «${listing.title}» · Someone saved "${listing.title}"`,
      data: { listing_id: listingId },
    });
  } catch (err) {
    console.error("[Save notify]", err);
  }
}

export async function saveOrUnsaveListing(clerkId: string, listingId: string): Promise<{ saved: boolean }> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });

  // Toggle the save and keep listings.saves_count in lockstep inside ONE
  // transaction so the denormalized counter never drifts from saved_listings.
  // The counter feeds a modest, log-scaled ranking signal only — it does NOT
  // bump recency, so popularity can lift a listing but never fake "just posted".
  // Set only when THIS call genuinely inserted the save row (not on a lost
  // race) — gates the owner ping so it fires once per real save, post-commit.
  let genuinelyInserted = false;
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ userId: savedListings.userId })
      .from(savedListings)
      .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, listingId)))
      .limit(1);

    if (existing) {
      // Gate the decrement on the row this call ACTUALLY removed. Under two
      // concurrent unsaves only one delete matches a row, so only one decrement
      // runs — the counter tracks real membership transitions, never drifts.
      const deleted = await tx
        .delete(savedListings)
        .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, listingId)))
        .returning({ userId: savedListings.userId });
      if (deleted.length > 0) {
        await tx
          .update(listings)
          // Floor at 0 belt-and-braces; the gate already prevents over-decrement.
          .set({ savesCount: sql`GREATEST(${listings.savesCount} - 1, 0)` })
          .where(eq(listings.id, listingId));
      }
      return { saved: false };
    }

    // ON CONFLICT DO NOTHING makes a concurrent double-save safe: only the row
    // that is genuinely inserted increments the counter. A lost race returns
    // saved:true (the save IS present) without double-counting.
    const inserted = await tx
      .insert(savedListings)
      .values({ userId: user.id, listingId })
      .onConflictDoNothing({
        target: [savedListings.userId, savedListings.listingId],
      })
      .returning({ userId: savedListings.userId });
    if (inserted.length > 0) {
      genuinelyInserted = true;
      await tx
        .update(listings)
        .set({ savesCount: sql`${listings.savesCount} + 1` })
        .where(eq(listings.id, listingId));
    }
    return { saved: true };
  });

  if (genuinelyInserted) {
    setImmediate(() => {
      void notifyOwnerOfSave(user.id, listingId);
    });
  }

  return result;
}

export async function getUserSaves(clerkId: string): Promise<string[]> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) return [];

  const rows = await db
    .select({ listingId: savedListings.listingId })
    .from(savedListings)
    .where(eq(savedListings.userId, user.id));

  return rows.map((r) => r.listingId);
}

export async function isSaved(clerkId: string, listingId: string): Promise<boolean> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) return false;

  const [row] = await db
    .select()
    .from(savedListings)
    .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, listingId)))
    .limit(1);

  return !!row;
}

/**
 * Returns the db user ids of everyone who has saved a given listing. Used by
 * the price-drop alert dispatch.
 */
export async function getSaverUserIds(listingId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: savedListings.userId })
    .from(savedListings)
    .where(eq(savedListings.listingId, listingId));

  return rows.map((r) => r.userId);
}
