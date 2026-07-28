import { db } from "@workspace/db";
import { listings, interactions, leadHistory, users } from "@workspace/db/schema";
import { eq, gte, sql, count, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const DEALER_ROLES = ["dealer", "company", "enterprise"] as const;

/**
 * Generates a weekly performance summary for every dealer-type account:
 * active listings, lifetime views, and leads received in the last 7 days.
 * Each dealer summary is logged so it can be shipped, alerted on, or later
 * persisted. Returns the number of dealers summarized.
 */
export async function generateDealerPerformance(): Promise<number> {
  const weekAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  // Active listings + lifetime views per dealer (interactions is 1:1 with a
  // listing, so this join does not inflate the view sum).
  const listingAgg = await db
    .select({
      sellerId: listings.userId,
      activeListings: sql<number>`count(*) FILTER (WHERE ${listings.status} = 'active')`,
      totalViews: sql<number>`COALESCE(SUM(${interactions.views}), 0)`,
    })
    .from(listings)
    .leftJoin(interactions, eq(interactions.listingId, listings.id))
    .where(inArray(listings.userId, db.select({ id: users.id }).from(users).where(inArray(users.role, [...DEALER_ROLES]))))
    .groupBy(listings.userId);

  const leadAgg = await db
    .select({ sellerId: leadHistory.sellerId, leads: count() })
    .from(leadHistory)
    .where(gte(leadHistory.createdAt, weekAgo))
    .groupBy(leadHistory.sellerId);

  const leadsBySeller = new Map(leadAgg.map((r) => [r.sellerId, Number(r.leads)]));

  let summarized = 0;
  for (const row of listingAgg) {
    if (!row.sellerId) continue;
    summarized += 1;
    logger.info(
      {
        job: "dealer_performance_summary",
        dealer_id: row.sellerId,
        active_listings: Number(row.activeListings),
        total_views: Number(row.totalViews),
        leads_last_7d: leadsBySeller.get(row.sellerId) ?? 0,
        period_start: weekAgo.toISOString(),
      },
      "Weekly dealer performance summary",
    );
  }

  logger.info(
    { job: "dealer_performance_summary", dealers: summarized },
    "Generated weekly dealer performance summaries",
  );

  return summarized;
}
