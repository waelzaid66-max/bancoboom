import { db } from "@workspace/db";
import { listings } from "@workspace/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { logger } from "../lib/logger";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Archives listings that are still `active` but were created more than 90 days
 * ago. Keeps the feed fresh and prevents stale inventory from accumulating.
 * Returns the number of listings archived.
 */
export async function archiveOldListings(): Promise<number> {
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS);

  const archived = await db
    .update(listings)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(listings.status, "active"), lt(listings.createdAt, cutoff)))
    .returning({ id: listings.id });

  logger.info(
    { job: "archive_old_listings", archived: archived.length, cutoff: cutoff.toISOString() },
    "Archived stale active listings",
  );

  return archived.length;
}
