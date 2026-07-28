import { db } from "@workspace/db";
import { leadHistory, listings, users, sellerReviews } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * Dealer quality scoring. Blends three signals into a 0..100 score used as a
 * ranking/visibility modifier in the feed and to drive the "Top Dealer" trust
 * flag:
 *   - response rate    — share of leads the dealer engaged (contacted/closed)
 *   - lead conversion  — share of leads the dealer closed
 *   - listing quality  — average trust score across the dealer's listings
 *
 * The score is persisted on `users.quality_score` so read paths can use it
 * without recomputing. It is recomputed opportunistically (on lead-status
 * changes) so it stays fresh without a dedicated hot path.
 */

const DEALER_ROLES = ["dealer", "company", "enterprise"] as const;

export interface QualityBreakdown {
  responseRate: number; // 0..1
  conversionRate: number; // 0..1
  listingQuality: number; // 0..1 (avg trust / 100)
  reviewScore: number; // 0..1 (avg rating / 5)
  averageRating: number | null; // 0..5, null when no reviews
  reviewCount: number;
  totalLeads: number;
  score: number; // 0..100
}

/**
 * Computes the quality breakdown for a dealer from durable data. New dealers
 * with no leads yet get a neutral score weighted purely on listing quality so
 * they are neither unfairly boosted nor buried.
 */
export async function computeDealerQuality(dealerId: string): Promise<QualityBreakdown> {
  const [leadAgg] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      engaged: sql<number>`COUNT(*) FILTER (WHERE ${leadHistory.status} IN ('contacted', 'closed'))`,
      closed: sql<number>`COUNT(*) FILTER (WHERE ${leadHistory.status} = 'closed')`,
    })
    .from(leadHistory)
    .where(eq(leadHistory.sellerId, dealerId));

  const [trustAgg] = await db
    .select({ avgTrust: sql<number>`COALESCE(AVG(${listings.trustScore}), 0)` })
    .from(listings)
    .where(eq(listings.userId, dealerId));

  const [reviewAgg] = await db
    .select({
      avg: sql<number | null>`AVG(${sellerReviews.rating})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(sellerReviews)
    .where(eq(sellerReviews.sellerId, dealerId));

  const totalLeads = Number(leadAgg?.total ?? 0);
  const engaged = Number(leadAgg?.engaged ?? 0);
  const closed = Number(leadAgg?.closed ?? 0);
  const listingQuality = clamp01(Number(trustAgg?.avgTrust ?? 0) / 100);

  const reviewCount = Number(reviewAgg?.count ?? 0);
  const averageRating =
    reviewCount > 0 && reviewAgg?.avg != null ? Math.round(Number(reviewAgg.avg) * 10) / 10 : null;
  const reviewScore = averageRating != null ? clamp01(averageRating / 5) : 0;

  const responseRate = totalLeads > 0 ? engaged / totalLeads : 0;
  const conversionRate = totalLeads > 0 ? closed / totalLeads : 0;

  const hasLeads = totalLeads > 0;
  const hasReviews = reviewCount > 0;

  let score: number;
  if (!hasLeads && !hasReviews) {
    // No demand history yet — score on listing quality alone, nudged to neutral.
    score = Math.round(40 + listingQuality * 40);
  } else if (!hasLeads && hasReviews) {
    // Real reviews but no lead history: weight reviews + listing quality.
    score = Math.round((reviewScore * 0.5 + listingQuality * 0.5) * 100);
  } else if (hasLeads && !hasReviews) {
    score = Math.round(
      (responseRate * 0.4 + conversionRate * 0.3 + listingQuality * 0.3) * 100,
    );
  } else {
    // Full signal set: reviews take a 15% slice off the lead-driven signals.
    score = Math.round(
      (responseRate * 0.35 + conversionRate * 0.25 + listingQuality * 0.25 + reviewScore * 0.15) *
        100,
    );
  }

  return {
    responseRate,
    conversionRate,
    listingQuality,
    reviewScore,
    averageRating,
    reviewCount,
    totalLeads,
    score: Math.max(0, Math.min(100, score)),
  };
}

/**
 * Recomputes and persists a dealer's quality score. Fire-and-forget safe: it
 * never throws into the caller. No-ops for non-dealer accounts.
 */
export function recomputeDealerQuality(dealerId: string): void {
  setImmediate(async () => {
    try {
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, dealerId))
        .limit(1);
      if (!user || !DEALER_ROLES.includes(user.role as (typeof DEALER_ROLES)[number])) return;

      const breakdown = await computeDealerQuality(dealerId);
      await db.update(users).set({ qualityScore: breakdown.score }).where(eq(users.id, dealerId));
    } catch (err) {
      logger.error({ err, dealer_id: dealerId }, "Failed to recompute dealer quality score");
    }
  });
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export { DEALER_ROLES };
