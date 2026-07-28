import { db } from "@workspace/db";
import { ads, listings } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { validateImpression, type ImpressionContext } from "./AbuseService";
import { applyTransaction } from "./WalletService";
import { consumePromoCredit } from "./PromoAdCreditService";
import { resolveEffectivePlan, type UserRole } from "./PlanService";
import { isUniqueViolation, notFound, toMoney } from "../lib/billing";

/**
 * Boost (promote) a listing. The boost fee is read SERVER-SIDE from the
 * seller's effective plan — never from the client. The wallet debit, ad
 * creation, and invoice all commit in ONE transaction: if the seller can't
 * afford the boost the guarded debit aborts the whole transaction, so no ad is
 * ever created without a successful charge ("never activate on failure").
 *
 * The plan's ranking multiplier is snapshotted onto the ad so the feed can
 * surface it preferentially, but only for the active (time-bound) window.
 */
export interface BoostResult {
  ad_id: string;
  listing_id: string;
  ad_type: string;
  expires_at: string;
  duration_days: number;
  /** Promo ad credit applied (consumed before the wallet), 2-dp string. */
  promo_used: string;
  /** Real wallet money charged (the remainder), 2-dp string. */
  wallet_charged: string;
}

/** Shape a stored ad row into the boost API result. */
function toBoostResult(
  ad: { id: string; listingId: string; adType: string; expiresAt: Date },
  durationDays: number,
  promoUsed: string,
  walletCharged: string,
): BoostResult {
  return {
    ad_id: ad.id,
    listing_id: ad.listingId,
    ad_type: ad.adType,
    expires_at: ad.expiresAt.toISOString(),
    duration_days: durationDays,
    promo_used: promoUsed,
    wallet_charged: walletCharged,
  };
}

export async function boostListing(
  listingId: string,
  sellerId: string,
  sellerRole: UserRole,
  adType: "featured" | "native_feed" | "top_search",
  durationDays: number,
  idempotencyKey?: string | null,
): Promise<BoostResult> {
  // Replay guard: a boost retried with the same key returns the original ad and
  // never re-consumes promo or re-charges the wallet.
  if (idempotencyKey) {
    const [existing] = await db
      .select({
        id: ads.id,
        listingId: ads.listingId,
        adType: ads.adType,
        expiresAt: ads.expiresAt,
      })
      .from(ads)
      .where(eq(ads.boostIdempotencyKey, idempotencyKey))
      .limit(1);
    if (existing) {
      return toBoostResult(existing, durationDays, "0.00", "0.00");
    }
  }

  // Verify listing belongs to seller
  const [listing] = await db
    .select({ id: listings.id, status: listings.status })
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.userId, sellerId)))
    .limit(1);

  if (!listing) {
    throw notFound("Listing not found or access denied");
  }

  // Only active (publicly visible) listings can be promoted. Boosting a
  // draft/pending/archived listing would charge the wallet for inventory that
  // will never show — clients gate on this too, but this is the server-side
  // safety net that fails closed regardless of caller.
  if (listing.status !== "active") {
    throw Object.assign(new Error("Only active listings can be promoted"), {
      code: "INVALID_DATA",
    });
  }

  const plan = await resolveEffectivePlan(sellerId, sellerRole);
  const boostPrice = toMoney(plan.boostPrice);
  const rankingWeight = plan.rankingWeight ?? "1";
  const priceNum = Number(boostPrice);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const description = `Listing boost (${adType}, ${durationDays}d)`;

  let result: BoostResult;
  try {
    result = await db.transaction(async (tx) => {
      // Insert the ad first so the charge can reference it (FK-free polymorphic
      // link). A failed debit rolls this insert back.
      const [created] = await tx
        .insert(ads)
        .values({
          listingId,
          sellerId,
          adType,
          isActive: true,
          expiresAt,
          rankingWeight,
          boostIdempotencyKey: idempotencyKey ?? null,
        })
        .returning();

      let promoUsed = "0.00";
      let walletCharged = "0.00";

      if (priceNum > 0) {
        // Spend the SEPARATE virtual promo credit first (use-it-or-lose-it).
        const promo = await consumePromoCredit(
          tx,
          sellerId,
          priceNum,
          { referenceType: "ad", referenceId: created.id, description },
          idempotencyKey ? `${idempotencyKey}:promo` : null,
        );
        promoUsed = promo.promo_used;

        // Only the remainder hits the real wallet. insufficientFunds throws
        // INVALID_DATA and aborts the whole transaction → no ad created.
        const remainder = Math.round((priceNum - Number(promoUsed)) * 100) / 100;
        if (remainder > 0) {
          const remainderStr = remainder.toFixed(2);
          await applyTransaction(tx, {
            userId: sellerId,
            type: "boost_charge",
            direction: "debit",
            amount: remainderStr,
            referenceType: "ad",
            referenceId: created.id,
            description,
            idempotencyKey: idempotencyKey ? `${idempotencyKey}:wallet` : null,
            invoice: {
              lineItems: [{ label: description, amount: remainderStr }],
            },
          });
          walletCharged = remainderStr;
        }
      }

      return toBoostResult(created, durationDays, promoUsed, walletCharged);
    });
  } catch (err) {
    // Concurrent boost with the same key: the unique constraint aborted the
    // second insert before any charge. Return the ad the winner created.
    if (idempotencyKey && isUniqueViolation(err)) {
      const [existing] = await db
        .select({
          id: ads.id,
          listingId: ads.listingId,
          adType: ads.adType,
          expiresAt: ads.expiresAt,
        })
        .from(ads)
        .where(eq(ads.boostIdempotencyKey, idempotencyKey))
        .limit(1);
      if (existing) {
        return toBoostResult(existing, durationDays, "0.00", "0.00");
      }
    }
    throw err;
  }

  return result;
}

/**
 * Records an ad impression with budget protection. Every impression bumps the
 * raw `impressions` counter, but ONLY impressions from a real client with a
 * valid session (per AbuseService.validateImpression) are billable: they
 * increment `billable_impressions` and deduct `cost_per_impression` from the
 * budget. When the spend reaches the total budget the ad auto-deactivates so it
 * stops showing. Bot/invalid impressions never drain a dealer's budget.
 */
export async function recordImpression(
  adId: string,
  ctx: Omit<ImpressionContext, "adId" | "sellerId">,
): Promise<{ counted: boolean; billable: boolean; reason?: string; deactivated: boolean }> {
  const [ad] = await db
    .select({
      id: ads.id,
      sellerId: ads.sellerId,
      isActive: ads.isActive,
      budgetTotal: ads.budgetTotal,
      budgetSpent: ads.budgetSpent,
      costPerImpression: ads.costPerImpression,
    })
    .from(ads)
    .where(eq(ads.id, adId))
    .limit(1);

  if (!ad) {
    throw Object.assign(new Error("Ad not found"), { code: "NOT_FOUND" });
  }

  // Raw impression count always advances (analytics), even for inactive ads.
  await db
    .update(ads)
    .set({ impressions: sql`${ads.impressions} + 1` })
    .where(eq(ads.id, adId));

  if (!ad.isActive) {
    return { counted: true, billable: false, reason: "inactive", deactivated: true };
  }

  const decision = await validateImpression({ ...ctx, adId, sellerId: ad.sellerId });
  if (!decision.ok) {
    return { counted: true, billable: false, reason: decision.reason, deactivated: false };
  }

  const cost = Number(ad.costPerImpression ?? 0);
  const spent = Number(ad.budgetSpent ?? 0);
  const total = ad.budgetTotal != null ? Number(ad.budgetTotal) : null;

  // No budget cap configured → count as billable but nothing to deduct/deactivate.
  if (total == null || total <= 0 || cost <= 0) {
    await db
      .update(ads)
      .set({ billableImpressions: sql`${ads.billableImpressions} + 1` })
      .where(eq(ads.id, adId));
    return { counted: true, billable: true, deactivated: false };
  }

  const newSpent = spent + cost;
  const exhausted = newSpent >= total;

  await db
    .update(ads)
    .set({
      billableImpressions: sql`${ads.billableImpressions} + 1`,
      budgetSpent: String(newSpent),
      isActive: exhausted ? false : ad.isActive,
    })
    .where(eq(ads.id, adId));

  return { counted: true, billable: true, deactivated: exhausted };
}
