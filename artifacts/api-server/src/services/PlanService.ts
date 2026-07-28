import { db } from "@workspace/db";
import { plans, subscriptions, listings, type Plan } from "@workspace/db/schema";
import { and, count, eq, gte } from "drizzle-orm";
import { invalidData } from "../lib/billing";

export type UserRole =
  | "individual"
  | "dealer"
  | "company"
  | "enterprise"
  | "financial_institution";

/** A db transaction handle as passed to db.transaction callbacks. */
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function findBaseline(role: UserRole): Promise<Plan | null> {
  const [plan] = await db
    .select()
    .from(plans)
    .where(
      and(
        eq(plans.audience, role),
        eq(plans.isBaseline, true),
        eq(plans.isActive, true)
      )
    )
    .limit(1);
  return plan ?? null;
}

/**
 * Resolve the plan that governs a user's pricing/quotas RIGHT NOW.
 *
 * Precedence:
 *  1. The plan of the user's currently-active subscription, if any.
 *  2. The free baseline plan for the user's role.
 *  3. Conservative fallbacks (dealer baseline for business roles, else
 *     individual baseline) so a role without its own baseline never crashes.
 *
 * ALL server-side pricing (boost price, CPL rates) and quota checks read from
 * the returned plan — never from client input.
 */
export async function resolveEffectivePlan(
  userId: string,
  role: UserRole
): Promise<Plan> {
  const [sub] = await db
    .select({ planId: subscriptions.planId })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);

  if (sub) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);
    if (plan) return plan;
  }

  const baseline =
    (await findBaseline(role)) ??
    (role !== "individual" ? await findBaseline("dealer") : null) ??
    (await findBaseline("individual"));

  if (!baseline) {
    throw Object.assign(new Error("No baseline plan configured"), {
      code: "INTERNAL_ERROR",
    });
  }
  return baseline;
}

/**
 * Enforce the user's effective-plan listing limits at creation time. Runs inside
 * the createListing transaction so the counts are consistent with the insert
 * that follows.
 *
 *  - listingQuota: max NEW listings per calendar month (UTC).
 *  - activeListingCap: max concurrently-active listings.
 *
 * A null limit means unlimited. Exceeding either throws INVALID_DATA (→ 400).
 */
export async function checkListingQuota(
  tx: DbTx,
  opts: { userId: string; role: UserRole }
): Promise<void> {
  const plan = await resolveEffectivePlan(opts.userId, opts.role);

  if (plan.listingQuota != null) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [{ used }] = await tx
      .select({ used: count() })
      .from(listings)
      .where(and(eq(listings.userId, opts.userId), gte(listings.createdAt, monthStart)));
    if (Number(used) >= plan.listingQuota) {
      throw invalidData(
        `Monthly listing limit reached (${plan.listingQuota}/month on ${plan.name}). Upgrade your plan to post more.`
      );
    }
  }

  if (plan.activeListingCap != null) {
    const [{ activeNow }] = await tx
      .select({ activeNow: count() })
      .from(listings)
      .where(and(eq(listings.userId, opts.userId), eq(listings.status, "active")));
    if (Number(activeNow) >= plan.activeListingCap) {
      throw invalidData(
        `Active listing limit reached (${plan.activeListingCap} on ${plan.name}). Archive an existing listing or upgrade to post more.`
      );
    }
  }
}
