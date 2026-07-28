import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { trackLead, processLead } from "./LeadService";
import { resolveEffectivePlan } from "./PlanService";
import { getWalletBalance } from "./WalletService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import {
  leadBilling,
  leadHistory,
  listings,
  transactions,
  invoices,
  users,
  rateEvents,
  dedupKeys,
} from "@workspace/db/schema";

const uids: string[] = [];
// Run token embedded in every device id so the durable abuse-counter rows
// trackLead writes (rate_events.bucket_key / dedup_keys.dedup_key) can be
// purged from the shared prod DB in afterAll.
const run = randomUUID();

/** Unique per-call device id so each lead starts its abuse window at zero. */
function device(): string {
  return `dev_${run}_${randomUUID()}`;
}

/** Poll until `fn` returns a truthy value (trackLead bills fire-and-forget). */
async function waitFor<T>(fn: () => Promise<T | undefined | null>, timeoutMs = 8000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for billing row");
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function sellerWithListing(
  role: "dealer" | "individual",
  walletBalance: string,
): Promise<{ sellerId: string; listingId: string }> {
  const sellerId = await createUser({ role, walletBalance });
  uids.push(sellerId);
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId: sellerId,
    title: uniq("lead"),
    category: "car",
    basePriceCash: "500000",
    location: "Cairo",
  });
  return { sellerId, listingId };
}

/** Insert a listing for an existing seller with explicit visibility state. */
async function insertListing(
  sellerId: string,
  opts: { status?: "active" | "sold" | "archived"; isFlagged?: boolean } = {},
): Promise<string> {
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId: sellerId,
    title: uniq("lead"),
    category: "car",
    basePriceCash: "500000",
    location: "Cairo",
    status: opts.status ?? "active",
    isFlagged: opts.isFlagged ?? false,
  });
  return listingId;
}

const billingFor = (sellerId: string) =>
  waitFor(async () => {
    const [row] = await db.select().from(leadBilling).where(eq(leadBilling.sellerId, sellerId)).limit(1);
    return row;
  });

describe("trackLead (CPL billing)", () => {
  it("charges the seller's CPL, records a charged billing row and an invoice", async () => {
    const { sellerId, listingId } = await sellerWithListing("dealer", "0");
    const plan = await resolveEffectivePlan(sellerId, "dealer");
    const cpl = Number(plan.cplWhatsapp);
    expect(cpl).toBeGreaterThan(0); // baseline dealer plan must price WhatsApp leads

    // Fund exactly the CPL so a successful charge drains the wallet to 0.
    await db.update(users).set({ walletBalance: plan.cplWhatsapp }).where(eq(users.id, sellerId));

    trackLead({ listingId, actionType: "whatsapp", deviceId: device() });

    const billing = await billingFor(sellerId);
    expect(billing.status).toBe("charged");
    expect(Number(billing.amountCharged)).toBe(cpl);
    expect(billing.transactionId).toBeTruthy();
    expect(Number(await getWalletBalance(sellerId))).toBe(0);

    const inv = await db.select().from(invoices).where(eq(invoices.userId, sellerId));
    expect(inv).toHaveLength(1);
    expect(Number(inv[0].amount)).toBe(cpl);
  }, 15000);

  it("keeps the lead but records a failed charge when the seller can't afford the CPL", async () => {
    const { sellerId, listingId } = await sellerWithListing("dealer", "0"); // 0 balance, cpl > 0
    trackLead({ listingId, actionType: "whatsapp", deviceId: device() });

    const billing = await billingFor(sellerId);
    expect(billing.status).toBe("failed");
    expect(billing.transactionId).toBeNull();

    // The lead itself always persists even when billing fails.
    const leads = await db.select().from(leadHistory).where(eq(leadHistory.sellerId, sellerId));
    expect(leads).toHaveLength(1);

    // No money moved, no invoice.
    expect(Number(await getWalletBalance(sellerId))).toBe(0);
    const inv = await db.select().from(invoices).where(eq(invoices.userId, sellerId));
    expect(inv).toHaveLength(0);
  }, 15000);

  it("never bills individual sellers (not_billable)", async () => {
    const { sellerId, listingId } = await sellerWithListing("individual", "0");
    trackLead({ listingId, actionType: "whatsapp", deviceId: device() });

    const billing = await billingFor(sellerId);
    expect(billing.status).toBe("not_billable");
    expect(Number(billing.amountCharged)).toBe(0);
    expect(billing.transactionId).toBeNull();
    expect(Number(await getWalletBalance(sellerId))).toBe(0);
  }, 15000);
});

describe("trackLead (visibility gate — non-public listings never bill)", () => {
  it("drops leads for non-active / flagged / shadow-banned-seller listings while an active control still bills", async () => {
    // Funded dealer A owns the non-public listings AND a public active control.
    const sellerA = await createUser({ role: "dealer", walletBalance: "100000" });
    uids.push(sellerA);
    const archived = await insertListing(sellerA, { status: "archived" });
    const flagged = await insertListing(sellerA, { isFlagged: true });
    const control = await insertListing(sellerA, {}); // active, public

    // Funded dealer B is shadow-banned → their active listing is non-contactable.
    const sellerB = await createUser({ role: "dealer", walletBalance: "100000", isShadowBanned: true });
    uids.push(sellerB);
    const banned = await insertListing(sellerB, {});

    // Await the awaitable core directly so the gate is asserted deterministically
    // (no setImmediate race): a non-public listing must record NO lead and NO
    // billing row — no record, no notification, no CPL charge.
    for (const id of [archived, flagged, banned]) {
      await processLead({ listingId: id, actionType: "whatsapp", deviceId: device() });
      const leads = await db.select().from(leadHistory).where(eq(leadHistory.listingId, id));
      expect(leads).toHaveLength(0);
      const billing = await db.select().from(leadBilling).where(eq(leadBilling.listingId, id));
      expect(billing).toHaveLength(0);
    }

    // Control: an active, public listing owned by a clean seller still bills.
    await processLead({ listingId: control, actionType: "whatsapp", deviceId: device() });
    const controlLeads = await db.select().from(leadHistory).where(eq(leadHistory.listingId, control));
    expect(controlLeads).toHaveLength(1);
    const [controlBilling] = await db
      .select()
      .from(leadBilling)
      .where(eq(leadBilling.listingId, control))
      .limit(1);
    expect(controlBilling).toBeTruthy();
  }, 20000);
});

afterAll(async () => {
  const like = `%${run}%`;
  await db.delete(rateEvents).where(sql`${rateEvents.bucketKey} LIKE ${like}`);
  await db.delete(dedupKeys).where(sql`${dedupKeys.dedupKey} LIKE ${like}`);
  if (uids.length) {
    await db.delete(invoices).where(inArray(invoices.userId, uids));
    await db.delete(transactions).where(inArray(transactions.userId, uids));
    // listings cascade → lead_history → lead_billing, plus interactions; users
    // cascade → notifications.
    await db.delete(listings).where(inArray(listings.userId, uids));
    await deleteUsers(...uids);
  }
});
