import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  plans,
  subscriptions,
  paymentIntents,
  transactions,
  listings,
  type Plan,
} from "@workspace/db/schema";
import { and, asc, count, eq, gte } from "drizzle-orm";
import {
  applyTransaction,
  getWalletBalance,
  type LedgerPaymentMethod,
} from "./WalletService";
import { resolveEffectivePlan, type UserRole } from "./PlanService";
import { createProviderCharge, type EgyptianRail } from "../lib/paymentProvider";
import { invalidData, isUniqueViolation, notFound, toMoney } from "../lib/billing";
import {
  schedulePaymentSuccess,
  notifyPaymentIntentFailed,
} from "./BillingNotificationService";

/** A subscription period is a fixed 30-day window. */
const PERIOD_DAYS = 30;

/** Roles that may hold paid (business) subscriptions. */
const BUSINESS_ROLES: readonly UserRole[] = ["dealer", "company", "enterprise"];

type SubscriptionRow = typeof subscriptions.$inferSelect;
type SubscribePaymentMethod = "wallet" | EgyptianRail;

function periodEnd(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + PERIOD_DAYS);
  return end;
}

function monthStartUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/* ── view mappers ──────────────────────────────────────── */

export function mapPlan(p: Plan) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    name_ar: p.nameAr,
    audience: p.audience,
    is_baseline: p.isBaseline,
    monthly_price: p.monthlyPrice,
    listing_quota: p.listingQuota,
    active_listing_cap: p.activeListingCap,
    boost_price: p.boostPrice,
    cpl_whatsapp: p.cplWhatsapp,
    cpl_call: p.cplCall,
    cpl_chat: p.cplChat,
    cpl_finance_request: p.cplFinanceRequest,
    ranking_weight: p.rankingWeight,
    features: (p.features as Record<string, boolean> | null) ?? null,
    sort_order: p.sortOrder ?? 0,
  };
}

function mapSubscription(s: SubscriptionRow, plan: Plan) {
  return {
    id: s.id,
    status: s.status,
    plan: mapPlan(plan),
    price_paid: s.pricePaid,
    starts_at: (s.startsAt ?? new Date()).toISOString(),
    expires_at: s.expiresAt.toISOString(),
    auto_renew: s.autoRenew,
    cancelled_at: s.cancelledAt ? s.cancelledAt.toISOString() : null,
  };
}

/* ── lookups ───────────────────────────────────────────── */

async function getPlanBySlug(slug: string): Promise<Plan> {
  const [plan] = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
  if (!plan) throw notFound("Plan not found");
  return plan;
}

async function getActiveSubscription(userId: string): Promise<SubscriptionRow | null> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);
  return sub ?? null;
}

/**
 * Locate the subscription created by a confirmed subscription intent, keyed by
 * its idempotent charge transaction. Used to make confirmation replay-safe.
 */
async function findSubscriptionByChargeKey(
  chargeKey: string
): Promise<{ sub: SubscriptionRow; plan: Plan } | null> {
  const [txRow] = await db
    .select({ referenceId: transactions.referenceId })
    .from(transactions)
    .where(eq(transactions.idempotencyKey, chargeKey))
    .limit(1);
  if (!txRow?.referenceId) return null;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, txRow.referenceId))
    .limit(1);
  if (!sub) return null;

  const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId)).limit(1);
  if (!plan) return null;
  return { sub, plan };
}

/* ── plans listing ─────────────────────────────────────── */

/**
 * The catalog of plans relevant to a user's account type: business users see
 * business plans, individuals see individual plans. Free baselines are included
 * so the UI can show the current tier.
 */
export async function listPlans(role: UserRole) {
  const all = await db
    .select()
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(asc(plans.sortOrder));

  const businessUser = BUSINESS_ROLES.includes(role);
  return all
    .filter((p) =>
      businessUser
        ? BUSINESS_ROLES.includes(p.audience as UserRole)
        : p.audience === "individual"
    )
    .map(mapPlan);
}

/* ── subscribe ─────────────────────────────────────────── */

export interface StartSubscriptionInput {
  userId: string;
  role: UserRole;
  planSlug: string;
  paymentMethod: SubscribePaymentMethod;
}

/**
 * Begin a subscription. Wallet payments settle immediately (subscription
 * active, balance debited) inside one transaction; external rails create a
 * pending payment intent that the caller confirms separately.
 *
 * Pricing is read from the plans table — never from client input.
 */
export async function startSubscription(input: StartSubscriptionInput) {
  const plan = await getPlanBySlug(input.planSlug);

  if (!plan.isActive) throw invalidData("This plan is not available");
  if (plan.isBaseline) {
    throw invalidData("The free baseline plan requires no subscription");
  }
  if (
    !BUSINESS_ROLES.includes(input.role) ||
    !BUSINESS_ROLES.includes(plan.audience as UserRole)
  ) {
    throw invalidData("This plan isn't available for your account type");
  }

  if (await getActiveSubscription(input.userId)) {
    throw invalidData(
      "You already have an active subscription. It must expire before you can switch plans."
    );
  }

  const price = toMoney(plan.monthlyPrice);

  if (input.paymentMethod === "wallet") {
    let sub: SubscriptionRow;
    try {
      const txResult = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(subscriptions)
          .values({
            userId: input.userId,
            planId: plan.id,
            status: "active",
            pricePaid: price,
            startsAt: new Date(),
            expiresAt: periodEnd(),
            autoRenew: false,
          })
          .returning();

        if (Number(price) > 0) {
          const applied = await applyTransaction(tx, {
            userId: input.userId,
            type: "subscription_charge",
            direction: "debit",
            amount: price,
            referenceType: "subscription",
            referenceId: created.id,
            description: `Subscription: ${plan.name} (${PERIOD_DAYS}d)`,
            invoice: {
              lineItems: [
                { label: `${plan.name} subscription (${PERIOD_DAYS}d)`, amount: price },
              ],
            },
          });
          const [updated] = await tx
            .update(subscriptions)
            .set({ transactionId: applied.transactionId })
            .where(eq(subscriptions.id, created.id))
            .returning();
          return {
            sub: updated,
            charge: {
              transactionId: applied.transactionId,
              balanceAfter: applied.balanceAfter,
            },
          };
        }
        return { sub: created, charge: null as { transactionId: string; balanceAfter: string } | null };
      });
      sub = txResult.sub;
      if (txResult.charge) {
        schedulePaymentSuccess({
          userId: input.userId,
          kind: "subscription_charge",
          amount: price,
          balanceAfter: txResult.charge.balanceAfter,
          transactionId: txResult.charge.transactionId,
          description: `Subscription: ${plan.name} (${PERIOD_DAYS}d)`,
          planName: plan.name,
        });
      }
    } catch (err) {
      // Lost race for the one-active-subscription slot.
      if (isUniqueViolation(err)) {
        throw invalidData("You already have an active subscription.");
      }
      throw err;
    }

    return {
      mode: "active" as const,
      subscription: mapSubscription(sub, plan),
      intent: null,
    };
  }

  // External rail → open a real PSP charge and create a pending subscription
  // intent (no money moves until the signed provider webhook settles it). The
  // intent id is generated up front so it can be the unique merchant reference.
  const intentId = randomUUID();
  const charge = await createProviderCharge({
    amount: price,
    method: input.paymentMethod,
    intentId,
    purpose: "subscription",
    userId: input.userId,
    description: `Subscription: ${plan.name}`,
  });
  const [intent] = await db
    .insert(paymentIntents)
    .values({
      id: intentId,
      userId: input.userId,
      amount: price,
      method: input.paymentMethod,
      purpose: "subscription",
      status: "pending",
      providerRef: charge.providerRef,
      planId: plan.id,
      metadata: { provider: "paymob", checkout_url: charge.checkoutUrl },
    })
    .returning();

  return {
    mode: "intent" as const,
    subscription: null,
    intent: {
      intent_id: intent.id,
      plan_slug: plan.slug,
      amount: intent.amount,
      method: intent.method as EgyptianRail,
      status: intent.status,
      provider_ref: intent.providerRef,
      checkout_url: charge.checkoutUrl,
      created_at: (intent.createdAt ?? new Date()).toISOString(),
    },
  };
}

/* ── confirm subscription intent ───────────────────────── */

/**
 * Read-only status of a subscription payment intent. This is what the client
 * polls after the buyer returns from the hosted checkout — it NEVER settles.
 * Activation only happens through the verified provider webhook
 * (`settleSubscriptionIntentByWebhook`).
 *
 * IDOR: a mismatched owner reads as "not found" (no existence leak).
 */
export async function getSubscriptionIntentStatus(
  intentId: string,
  userId: string
) {
  const [intent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.id, intentId))
    .limit(1);

  if (!intent || intent.userId !== userId) throw notFound("Payment intent not found");
  if (intent.purpose !== "subscription") throw invalidData("Not a subscription intent");

  const existing = await findSubscriptionByChargeKey(`${intent.id}:charge`);

  return {
    intent_id: intent.id,
    status: intent.status,
    subscription: existing ? mapSubscription(existing.sub, existing.plan) : null,
    balance: await getWalletBalance(userId),
    already_processed: intent.status === "completed",
  };
}

/**
 * Settle a subscription payment intent — invoked ONLY by the verified provider
 * webhook. The external payment funds the wallet and is immediately spent on
 * the subscription in ONE transaction, so the net wallet delta is zero while
 * the ledger records both the inflow and the purchase (balance == SUM(ledger)
 * always holds).
 *
 * Idempotency: the credit uses key `${id}:topup` and the charge uses
 * `${id}:charge`. A repeated webhook delivery replays exactly once; the
 * fast-path, the active-subscription unique index, and the 23505 catch all
 * resolve to a no-op.
 */
export async function settleSubscriptionIntentByWebhook(
  intentId: string,
  opts: { providerTxnId?: string | null } = {}
): Promise<void> {
  const [intent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.id, intentId))
    .limit(1);

  if (!intent) throw notFound("Payment intent not found");
  if (intent.purpose !== "subscription") throw invalidData("Not a subscription intent");
  if (intent.status === "completed") return; // idempotent replay
  if (intent.status !== "pending") {
    throw invalidData(`Cannot settle a ${intent.status} intent`);
  }
  if (!intent.planId) throw invalidData("Subscription intent is missing its plan");

  const [plan] = await db.select().from(plans).where(eq(plans.id, intent.planId)).limit(1);
  if (!plan) throw notFound("Plan not found");

  const chargeKey = `${intent.id}:charge`;
  const userId = intent.userId;

  // Fast-path replay: this intent was already settled.
  if (await findSubscriptionByChargeKey(chargeKey)) {
    await db
      .update(paymentIntents)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(paymentIntents.id, intent.id), eq(paymentIntents.status, "pending")));
    return;
  }

  try {
    const settled = await db.transaction(async (tx) => {
      await applyTransaction(tx, {
        userId,
        type: "wallet_topup",
        direction: "credit",
        amount: intent.amount,
        paymentMethod: intent.method as LedgerPaymentMethod,
        referenceType: "payment_intent",
        referenceId: intent.id,
        description: `Subscription payment via ${intent.method}`,
        idempotencyKey: `${intent.id}:topup`,
        metadata: opts.providerTxnId ? { provider_txn_id: opts.providerTxnId } : null,
      });

      const [created] = await tx
        .insert(subscriptions)
        .values({
          userId,
          planId: plan.id,
          status: "active",
          pricePaid: intent.amount,
          startsAt: new Date(),
          expiresAt: periodEnd(),
          autoRenew: false,
        })
        .returning();

      const charge = await applyTransaction(tx, {
        userId,
        type: "subscription_charge",
        direction: "debit",
        amount: intent.amount,
        referenceType: "subscription",
        referenceId: created.id,
        description: `Subscription: ${plan.name} (${PERIOD_DAYS}d)`,
        idempotencyKey: chargeKey,
        invoice: {
          lineItems: [
            { label: `${plan.name} subscription (${PERIOD_DAYS}d)`, amount: intent.amount },
          ],
        },
      });

      await tx
        .update(subscriptions)
        .set({ transactionId: charge.transactionId })
        .where(eq(subscriptions.id, created.id));

      await tx
        .update(paymentIntents)
        .set({ status: "completed", completedAt: new Date() })
        .where(and(eq(paymentIntents.id, intent.id), eq(paymentIntents.status, "pending")));

      return {
        transactionId: charge.transactionId,
        balanceAfter: charge.balanceAfter,
      };
    });

    schedulePaymentSuccess({
      userId,
      kind: "subscription_charge",
      amount: intent.amount,
      balanceAfter: settled.balanceAfter,
      transactionId: settled.transactionId,
      description: `Subscription: ${plan.name} (${PERIOD_DAYS}d)`,
      planName: plan.name,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Concurrent delivery already activated, or the active-subscription slot
      // is taken — either way this webhook is a no-op.
      return;
    }
    throw err;
  }
}

/** Mark a pending subscription intent failed (cancelled/declined webhook). No money moves. */
export async function markSubscriptionIntentFailed(intentId: string): Promise<void> {
  const updated = await db
    .update(paymentIntents)
    .set({ status: "failed" })
    .where(and(eq(paymentIntents.id, intentId), eq(paymentIntents.status, "pending")))
    .returning({ id: paymentIntents.id });

  if (updated.length > 0) {
    await notifyPaymentIntentFailed(intentId);
  }
}

/* ── cancel ────────────────────────────────────────────── */

/**
 * Cancel auto-renewal. The subscription stays ACTIVE (and keeps its plan's
 * quotas) until it expires — no refund, no immediate downgrade.
 */
export async function cancelSubscription(userId: string) {
  const active = await getActiveSubscription(userId);
  if (!active) throw notFound("No active subscription to cancel");

  const [updated] = await db
    .update(subscriptions)
    .set({ cancelledAt: new Date(), autoRenew: false })
    .where(eq(subscriptions.id, active.id))
    .returning();

  const [plan] = await db.select().from(plans).where(eq(plans.id, updated.planId)).limit(1);
  if (!plan) throw notFound("Plan not found");
  return mapSubscription(updated, plan);
}

/* ── my subscription + usage ───────────────────────────── */

/**
 * The user's effective plan (active subscription or free baseline), the active
 * subscription record if any, and current usage against the plan's quotas.
 */
export async function getMySubscription(userId: string, role: UserRole) {
  const effective = await resolveEffectivePlan(userId, role);

  const active = await getActiveSubscription(userId);
  let subscriptionView: ReturnType<typeof mapSubscription> | null = null;
  if (active) {
    const [plan] = await db.select().from(plans).where(eq(plans.id, active.planId)).limit(1);
    if (plan) subscriptionView = mapSubscription(active, plan);
  }

  const [{ createdThisMonth }] = await db
    .select({ createdThisMonth: count() })
    .from(listings)
    .where(and(eq(listings.userId, userId), gte(listings.createdAt, monthStartUtc())));

  const [{ activeNow }] = await db
    .select({ activeNow: count() })
    .from(listings)
    .where(and(eq(listings.userId, userId), eq(listings.status, "active")));

  return {
    plan: mapPlan(effective),
    subscription: subscriptionView,
    usage: {
      listings_this_month: Number(createdThisMonth),
      active_listings: Number(activeNow),
      listing_quota: effective.listingQuota,
      active_listing_cap: effective.activeListingCap,
    },
  };
}
