import { db } from "@workspace/db";
import { users, listings, leadHistory } from "@workspace/db/schema";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { publicVisibilityConditions } from "../lib/feedVisibility";
import {
  isEmailChannelEnabled,
  sendWeeklyReportEmail,
} from "../services/EmailService";

const DEALER_ROLES = ["dealer", "company", "enterprise"] as const;

/**
 * Weekly per-dealer activity digest. For every business-role user with an email
 * and the "system" email category enabled, compute REAL numbers (active public
 * listings + leads captured in the last 7 days) and send a summary. Dealers
 * with nothing to report are skipped. Each send is best-effort: one failure
 * never aborts the run. Returns the count of reports sent.
 */
export async function sendWeeklyReports(): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const dealers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(inArray(users.role, [...DEALER_ROLES]), isNull(users.deletedAt)))
    .limit(5000);

  let sent = 0;
  for (const dealer of dealers) {
    if (!dealer.email) continue;
    try {
      if (!(await isEmailChannelEnabled(dealer.id, "system"))) continue;

      const [activeAgg] = await db
        .select({ n: sql<number>`COUNT(*)` })
        .from(listings)
        .leftJoin(users, eq(listings.userId, users.id))
        .where(
          and(
            eq(listings.userId, dealer.id),
            eq(listings.status, "active"),
            ...publicVisibilityConditions(),
          ),
        );

      const [leadAgg] = await db
        .select({ n: sql<number>`COUNT(*)` })
        .from(leadHistory)
        .where(
          and(
            eq(leadHistory.sellerId, dealer.id),
            gte(leadHistory.createdAt, weekAgo),
          ),
        );

      const activeListings = Number(activeAgg?.n ?? 0);
      const weeklyLeads = Number(leadAgg?.n ?? 0);

      // Nothing meaningful to report — don't send an empty digest.
      if (activeListings === 0 && weeklyLeads === 0) continue;

      await sendWeeklyReportEmail({
        to: dealer.email,
        name: dealer.name,
        activeListings,
        weeklyLeads,
      });
      sent += 1;
    } catch (err) {
      logger.error({ err, dealer_id: dealer.id }, "Weekly report failed for dealer");
    }
  }

  logger.info({ sent, candidates: dealers.length }, "Weekly reports processed");
  return sent;
}
