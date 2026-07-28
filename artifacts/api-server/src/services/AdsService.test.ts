import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { boostListing } from "./AdsService";
import { resolveEffectivePlan } from "./PlanService";
import { getWalletBalance } from "./WalletService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import {
  ads,
  listings,
  transactions,
  invoices,
  users,
  promoAdTransactions,
} from "@workspace/db/schema";

const FUTURE = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const uids: string[] = [];

async function dealerWithListing(walletBalance: string): Promise<{ sellerId: string; listingId: string }> {
  const sellerId = await createUser({ role: "dealer", walletBalance });
  uids.push(sellerId);
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId: sellerId,
    title: uniq("boost"),
    category: "car",
    basePriceCash: "500000",
    location: "Cairo",
  });
  return { sellerId, listingId };
}

describe("boostListing (ad spend protection)", () => {
  it("charges the plan boost fee atomically and activates the ad", async () => {
    const { sellerId, listingId } = await dealerWithListing("0");
    const plan = await resolveEffectivePlan(sellerId, "dealer");
    const boostPrice = Number(plan.boostPrice);
    expect(boostPrice).toBeGreaterThan(0); // baseline dealer plan must price boosts

    // Fund exactly the boost fee so a successful charge drains the wallet to 0.
    await db.update(users).set({ walletBalance: plan.boostPrice }).where(eq(users.id, sellerId));

    const res = await boostListing(listingId, sellerId, "dealer", "featured", 7);
    expect(res.ad_id).toBeTruthy();

    // Wallet drained by exactly the server-side fee (never client-supplied).
    expect(Number(await getWalletBalance(sellerId))).toBe(0);

    // Ad is created and active.
    const adRows = await db.select().from(ads).where(eq(ads.id, res.ad_id));
    expect(adRows).toHaveLength(1);
    expect(adRows[0].isActive).toBe(true);

    // The charge produced exactly one invoice for the fee.
    const inv = await db.select().from(invoices).where(eq(invoices.userId, sellerId));
    expect(inv).toHaveLength(1);
    expect(Number(inv[0].amount)).toBe(boostPrice);
  });

  it("never activates the ad when the seller can't afford the boost", async () => {
    const { sellerId, listingId } = await dealerWithListing("0"); // 0 balance, boostPrice > 0
    await expect(boostListing(listingId, sellerId, "dealer", "featured", 7)).rejects.toThrow();

    // The whole transaction rolled back: no ad ever existed.
    const adRows = await db.select().from(ads).where(eq(ads.listingId, listingId));
    expect(adRows).toHaveLength(0);

    // No charge, no invoice.
    expect(Number(await getWalletBalance(sellerId))).toBe(0);
    const inv = await db.select().from(invoices).where(eq(invoices.userId, sellerId));
    expect(inv).toHaveLength(0);
  });

  it("rejects boosting a non-active listing without ever charging", async () => {
    // Seller can fully afford the boost — the only reason to reject is status.
    const { sellerId, listingId } = await dealerWithListing("0");
    const plan = await resolveEffectivePlan(sellerId, "dealer");
    await db.update(users).set({ walletBalance: plan.boostPrice }).where(eq(users.id, sellerId));
    await db.update(listings).set({ status: "archived" }).where(eq(listings.id, listingId));

    await expect(boostListing(listingId, sellerId, "dealer", "featured", 7)).rejects.toThrow();

    // No ad created, wallet untouched, no invoice — the guard fails closed.
    const adRows = await db.select().from(ads).where(eq(ads.listingId, listingId));
    expect(adRows).toHaveLength(0);
    expect(Number(await getWalletBalance(sellerId))).toBe(Number(plan.boostPrice));
    const inv = await db.select().from(invoices).where(eq(invoices.userId, sellerId));
    expect(inv).toHaveLength(0);
  });

  it("spends promo ad credit before the wallet, never touching the wallet when promo fully covers the boost", async () => {
    const { sellerId, listingId } = await dealerWithListing("0"); // empty real wallet
    const plan = await resolveEffectivePlan(sellerId, "dealer");
    const boostPrice = Number(plan.boostPrice);
    expect(boostPrice).toBeGreaterThan(0);

    // Grant more than enough virtual promo credit, valid (unexpired).
    const promoGranted = boostPrice + 100;
    await db
      .update(users)
      .set({
        promoAdBalance: promoGranted.toFixed(2),
        promoAdBalanceExpiresAt: FUTURE(),
      })
      .where(eq(users.id, sellerId));

    const res = await boostListing(listingId, sellerId, "dealer", "featured", 7);
    expect(res.ad_id).toBeTruthy();

    // The boost was paid entirely from promo credit.
    expect(res.promo_used).toBe(boostPrice.toFixed(2));
    expect(res.wallet_charged).toBe("0.00");

    // Real wallet never moved and produced no invoice (only promo was spent).
    expect(Number(await getWalletBalance(sellerId))).toBe(0);
    const inv = await db.select().from(invoices).where(eq(invoices.userId, sellerId));
    expect(inv).toHaveLength(0);

    // Promo balance dropped by exactly the boost fee and was ledgered.
    const [u] = await db
      .select({ bal: users.promoAdBalance })
      .from(users)
      .where(eq(users.id, sellerId));
    expect(Number(u.bal)).toBeCloseTo(promoGranted - boostPrice, 2);
    const promoTx = await db
      .select()
      .from(promoAdTransactions)
      .where(eq(promoAdTransactions.userId, sellerId));
    expect(promoTx).toHaveLength(1);
    expect(Math.abs(Number(promoTx[0].amount))).toBeCloseTo(boostPrice, 2);

    // The ad is active.
    const adRows = await db.select().from(ads).where(eq(ads.id, res.ad_id));
    expect(adRows[0].isActive).toBe(true);
  });

  it("applies promo credit first, then charges the wallet only for the remainder", async () => {
    const { sellerId, listingId } = await dealerWithListing("0");
    const plan = await resolveEffectivePlan(sellerId, "dealer");
    const boostPrice = Number(plan.boostPrice);
    expect(boostPrice).toBeGreaterThan(0);

    // Promo covers half; the wallet must cover the exact remainder.
    const promoPart = Math.round((boostPrice * 100) / 2) / 100;
    const remainder = Math.round((boostPrice - promoPart) * 100) / 100;
    expect(remainder).toBeGreaterThan(0);

    await db
      .update(users)
      .set({
        promoAdBalance: promoPart.toFixed(2),
        promoAdBalanceExpiresAt: FUTURE(),
        walletBalance: remainder.toFixed(2),
      })
      .where(eq(users.id, sellerId));

    const res = await boostListing(listingId, sellerId, "dealer", "featured", 7);
    expect(res.ad_id).toBeTruthy();
    expect(res.promo_used).toBe(promoPart.toFixed(2));
    expect(res.wallet_charged).toBe(remainder.toFixed(2));

    // Promo drained to zero; wallet drained by exactly the remainder.
    const [u] = await db
      .select({ bal: users.promoAdBalance })
      .from(users)
      .where(eq(users.id, sellerId));
    expect(Number(u.bal)).toBeCloseTo(0, 2);
    expect(Number(await getWalletBalance(sellerId))).toBe(0);

    // The wallet remainder produced exactly one invoice for that amount.
    const inv = await db.select().from(invoices).where(eq(invoices.userId, sellerId));
    expect(inv).toHaveLength(1);
    expect(Number(inv[0].amount)).toBeCloseTo(remainder, 2);
  });
});

afterAll(async () => {
  if (uids.length) {
    await db.delete(invoices).where(inArray(invoices.userId, uids));
    await db.delete(transactions).where(inArray(transactions.userId, uids));
    // ads cascade when their listing is deleted (ads.listing_id ON DELETE CASCADE).
    await db.delete(listings).where(inArray(listings.userId, uids));
    await deleteUsers(...uids);
  }
});
