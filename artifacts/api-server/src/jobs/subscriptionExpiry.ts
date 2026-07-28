import { db } from "@workspace/db";
import { subscriptions, listings, users } from "@workspace/db/schema";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { logger } from "../lib/logger";
import { resolveEffectivePlan, type UserRole } from "../services/PlanService";

/**
 * Daily maintenance: expire subscriptions whose period has ended, then enforce
 * the now-baseline active-listing cap for each affected user.
 *
 * When a paid plan lapses the user reverts to their free baseline plan, which
 * may have a lower activeListingCap. We archive the oldest active listings that
 * exceed the baseline cap (keeping the newest), so a lapsed dealer can't retain
 * unlimited exposure for free. Returns the number of subscriptions expired.
 */
export async function expireSubscriptions(): Promise<number> {
  const now = new Date();

  const expired = await db
    .update(subscriptions)
    .set({ status: "expired" })
    .where(and(eq(subscriptions.status, "active"), lt(subscriptions.expiresAt, now)))
    .returning({ userId: subscriptions.userId });

  if (expired.length === 0) return 0;

  const userIds = [...new Set(expired.map((r) => r.userId))];
  let archived = 0;

  for (const userId of userIds) {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) continue;

    // Resolve the plan now governing the user (baseline, since the paid sub is
    // gone). Null cap = unlimited → nothing to enforce.
    const plan = await resolveEffectivePlan(userId, user.role as UserRole);
    if (plan.activeListingCap == null) continue;

    const activeListings = await db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.userId, userId), eq(listings.status, "active")))
      .orderBy(desc(listings.createdAt));

    const overflow = activeListings.slice(plan.activeListingCap);
    if (overflow.length === 0) continue;

    await db
      .update(listings)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        inArray(
          listings.id,
          overflow.map((l) => l.id)
        )
      );
    archived += overflow.length;
  }

  logger.info(
    { job: "expire-subscriptions", expired: expired.length, archived },
    "Expired subscriptions and enforced baseline active-listing caps"
  );
  return expired.length;
}
